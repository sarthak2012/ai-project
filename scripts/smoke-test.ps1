$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5050/api'
$ts = [int][double]::Parse((Get-Date -UFormat %s))

function Step($n, $msg) { Write-Host "`n[$n] $msg" -ForegroundColor Cyan }
function Ok($msg)       { Write-Host "    OK: $msg" -ForegroundColor Green }
function Fail($msg)     { Write-Host "    FAIL: $msg" -ForegroundColor Red; exit 1 }

# 1. Admin signup
Step 1 "Admin signup"
$adminBody = @{ name = 'Smoke Admin'; email = "admin+$ts@example.com"; password = 'pass1234'; role = 'admin' } | ConvertTo-Json
$admin = Invoke-RestMethod -Uri "$base/auth/signup" -Method Post -ContentType 'application/json' -Body $adminBody
if (-not $admin.token) { Fail 'no token returned' }
$adminToken = $admin.token
$adminHeaders = @{ Authorization = "Bearer $adminToken" }
Ok "admin id=$($admin._id) role=$($admin.role)"

# 2. Create project
Step 2 "Admin creates project"
$projBody = @{ title = 'Smoke Project'; description = 'created by smoke test' } | ConvertTo-Json
$project = Invoke-RestMethod -Uri "$base/projects" -Method Post -ContentType 'application/json' -Headers $adminHeaders -Body $projBody
if (-not $project._id) { Fail 'no project id' }
$projectId = $project._id
Ok "project id=$projectId admin=$($project.admin.name)"

# 2b. Admin re-fetches project by id (catches populated-doc RBAC bug)
Step '2b' "Admin GET /projects/:id (regression: populated admin must still match)"
$proj2 = Invoke-RestMethod -Uri "$base/projects/$projectId" -Method Get -Headers $adminHeaders
if ($proj2.admin._id -ne $admin._id) { Fail "admin._id mismatch in GET /projects/:id" }
Ok "GET /projects/:id ok, admin._id matches"

# 3. Member signup
Step 3 "Member signup"
$memberBody = @{ name = 'Smoke Member'; email = "member+$ts@example.com"; password = 'pass1234'; role = 'member' } | ConvertTo-Json
$member = Invoke-RestMethod -Uri "$base/auth/signup" -Method Post -ContentType 'application/json' -Body $memberBody
$memberToken = $member.token
$memberId = $member._id
$memberHeaders = @{ Authorization = "Bearer $memberToken" }
Ok "member id=$memberId role=$($member.role)"

# 4. Admin adds member to project
Step 4 "Admin adds member to project"
$addBody = @{ add = @($memberId) } | ConvertTo-Json
$updated = Invoke-RestMethod -Uri "$base/projects/$projectId/members" -Method Put -ContentType 'application/json' -Headers $adminHeaders -Body $addBody
if ($updated.members.Count -ne 1) { Fail "expected 1 member, got $($updated.members.Count)" }
Ok "members=$($updated.members.Count) -> $($updated.members[0].name)"

# 5. Admin creates task assigned to member
Step 5 "Admin creates task assigned to member"
$taskBody = @{
  title = 'Write docs'
  description = 'Initial draft'
  project = $projectId
  assignedTo = $memberId
  status = 'Todo'
} | ConvertTo-Json
$task = Invoke-RestMethod -Uri "$base/tasks" -Method Post -ContentType 'application/json' -Headers $adminHeaders -Body $taskBody
$taskId = $task._id
Ok "task id=$taskId status=$($task.status) assignee=$($task.assignedTo.name)"

# 6. Member updates own task status -> allowed
Step 6 "Member changes own task status to 'In Progress' (should succeed)"
$statusBody = @{ status = 'In Progress' } | ConvertTo-Json
$updatedTask = Invoke-RestMethod -Uri "$base/tasks/$taskId" -Method Put -ContentType 'application/json' -Headers $memberHeaders -Body $statusBody
if ($updatedTask.status -ne 'In Progress') { Fail "expected 'In Progress', got $($updatedTask.status)" }
Ok "status now '$($updatedTask.status)'"

# 7. Member tries to change task title -> RBAC must reject (403)
Step 7 "Member tries to change task title (should be 403)"
$titleBody = @{ title = 'pwned' } | ConvertTo-Json
try {
  Invoke-RestMethod -Uri "$base/tasks/$taskId" -Method Put -ContentType 'application/json' -Headers $memberHeaders -Body $titleBody | Out-Null
  Fail 'RBAC bypass: member was allowed to change title!'
} catch {
  $code = $_.Exception.Response.StatusCode.value__
  if ($code -ne 403) { Fail "expected HTTP 403, got $code" }
  Ok "got HTTP 403 as expected"
}

# 8. Admin fetches dashboard
Step 8 "Admin fetches dashboard"
$dash = Invoke-RestMethod -Uri "$base/dashboard" -Method Get -Headers $adminHeaders
$counts = $dash.counts
if ($null -eq $counts.totalTasks) { Fail 'no counts in response' }
Ok "totals: total=$($counts.totalTasks) done=$($counts.completedTasks) pending=$($counts.pendingTasks) overdue=$($counts.overdueTasks) projects=$($counts.projects)"
Ok "assignedToMe=$($dash.assignedToMe.Count) recentTasks=$($dash.recentTasks.Count)"

Write-Host "`nAll 8 checks passed." -ForegroundColor Green
