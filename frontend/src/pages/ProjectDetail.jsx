import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios.js';
import Loader from '../components/Loader.jsx';
import TaskCard from '../components/TaskCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const emptyTaskForm = {
  title: '',
  description: '',
  dueDate: '',
  assignedTo: '',
  status: 'Todo',
};

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [taskForm, setTaskForm] = useState(emptyTaskForm);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [savingTask, setSavingTask] = useState(false);

  const [memberEmail, setMemberEmail] = useState('');
  const [memberResults, setMemberResults] = useState([]);
  const [memberSearchLoading, setMemberSearchLoading] = useState(false);
  const [memberError, setMemberError] = useState('');

  const isProjectAdmin = useMemo(
    () => !!project && !!user && project.admin?._id === user._id,
    [project, user]
  );

  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [{ data: proj }, { data: tasksData }] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?project=${id}`),
      ]);
      setProject(proj);
      setTasks(tasksData);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleTaskSubmit = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setSavingTask(true);
    setError('');
    try {
      const payload = {
        title: taskForm.title.trim(),
        description: taskForm.description,
        dueDate: taskForm.dueDate || null,
        status: taskForm.status,
        assignedTo: taskForm.assignedTo || null,
      };
      if (editingTaskId) {
        await api.put(`/tasks/${editingTaskId}`, payload);
      } else {
        await api.post('/tasks', { ...payload, project: id });
      }
      setTaskForm(emptyTaskForm);
      setEditingTaskId(null);
      setShowTaskForm(false);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save task');
    } finally {
      setSavingTask(false);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete task');
    }
  };

  const handleEditTask = (task) => {
    setEditingTaskId(task._id);
    setShowTaskForm(true);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
      assignedTo: task.assignedTo?._id || '',
      status: task.status,
    });
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this project and all its tasks? This cannot be undone.')) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete project');
    }
  };

  const searchUsers = async () => {
    setMemberError('');
    setMemberSearchLoading(true);
    try {
      const { data } = await api.get(`/projects/users/list?search=${encodeURIComponent(memberEmail)}`);
      setMemberResults(data);
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Search failed');
    } finally {
      setMemberSearchLoading(false);
    }
  };

  const addMember = async (userId) => {
    setMemberError('');
    try {
      const { data } = await api.put(`/projects/${id}/members`, { add: [userId] });
      setProject(data);
      setMemberResults([]);
      setMemberEmail('');
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to add member');
    }
  };

  const removeMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      const { data } = await api.put(`/projects/${id}/members`, { remove: [userId] });
      setProject(data);
      await loadAll();
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  if (loading) return <Loader />;
  if (!project)
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded">
        {error || 'Project not found'}
      </div>
    );

  const memberOptions = [project.admin, ...project.members];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold truncate">{project.title}</h1>
          {project.description && (
            <p className="text-slate-600 mt-1 whitespace-pre-line">{project.description}</p>
          )}
          <div className="text-xs text-slate-500 mt-2">
            Admin: <span className="font-medium text-slate-700">{project.admin?.name}</span>
          </div>
        </div>
        {isProjectAdmin && (
          <button onClick={handleDeleteProject} className="btn-danger">
            Delete Project
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Tasks ({tasks.length})</h2>
            {isProjectAdmin && (
              <button
                onClick={() => {
                  setShowTaskForm((s) => !s);
                  setEditingTaskId(null);
                  setTaskForm(emptyTaskForm);
                }}
                className="btn-primary"
              >
                {showTaskForm ? 'Cancel' : 'New Task'}
              </button>
            )}
          </div>

          {showTaskForm && isProjectAdmin && (
            <form onSubmit={handleTaskSubmit} className="card space-y-3">
              <div>
                <label className="label">Title</label>
                <input
                  className="input"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  className="input"
                  rows={3}
                  value={taskForm.description}
                  onChange={(e) =>
                    setTaskForm({ ...taskForm, description: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label">Due Date</label>
                  <input
                    type="date"
                    className="input"
                    value={taskForm.dueDate}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, dueDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select
                    className="input"
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value })}
                  >
                    <option value="Todo">Todo</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div>
                  <label className="label">Assign To</label>
                  <select
                    className="input"
                    value={taskForm.assignedTo}
                    onChange={(e) =>
                      setTaskForm({ ...taskForm, assignedTo: e.target.value })
                    }
                  >
                    <option value="">Unassigned</option>
                    {memberOptions.map((m) => (
                      <option key={m._id} value={m._id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <button type="submit" disabled={savingTask} className="btn-primary">
                {savingTask ? 'Saving…' : editingTaskId ? 'Update Task' : 'Create Task'}
              </button>
            </form>
          )}

          {tasks.length === 0 ? (
            <div className="card text-sm text-slate-500">No tasks yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tasks.map((task) => {
                const isAssignee = task.assignedTo?._id === user._id;
                return (
                  <TaskCard
                    key={task._id}
                    task={task}
                    canEdit={isProjectAdmin}
                    canChangeStatus={isProjectAdmin || isAssignee}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteTask}
                    onEdit={handleEditTask}
                  />
                );
              })}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="card">
            <h2 className="font-semibold mb-3">Team</h2>
            <ul className="divide-y divide-slate-100 mb-3">
              <li className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">{project.admin?.name}</div>
                  <div className="text-xs text-slate-500">{project.admin?.email}</div>
                </div>
                <span className="badge bg-brand-100 text-brand-700">Admin</span>
              </li>
              {project.members.map((m) => (
                <li key={m._id} className="py-2 flex items-center justify-between">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{m.name}</div>
                    <div className="text-xs text-slate-500 truncate">{m.email}</div>
                  </div>
                  {isProjectAdmin && (
                    <button
                      onClick={() => removeMember(m._id)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
              {project.members.length === 0 && (
                <li className="py-2 text-xs text-slate-500">No additional members yet.</li>
              )}
            </ul>

            {isProjectAdmin && (
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <label className="label">Add member by name or email</label>
                <div className="flex gap-2">
                  <input
                    className="input"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    placeholder="Search…"
                  />
                  <button
                    type="button"
                    onClick={searchUsers}
                    disabled={memberSearchLoading}
                    className="btn-secondary"
                  >
                    {memberSearchLoading ? '…' : 'Search'}
                  </button>
                </div>
                {memberError && (
                  <div className="text-xs text-red-600">{memberError}</div>
                )}
                {memberResults.length > 0 && (
                  <ul className="border border-slate-200 rounded divide-y divide-slate-100">
                    {memberResults
                      .filter(
                        (u) =>
                          u._id !== project.admin._id &&
                          !project.members.some((m) => m._id === u._id)
                      )
                      .map((u) => (
                        <li
                          key={u._id}
                          className="px-2 py-2 flex items-center justify-between"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{u.name}</div>
                            <div className="text-xs text-slate-500 truncate">{u.email}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => addMember(u._id)}
                            className="btn-primary text-xs px-2 py-1"
                          >
                            Add
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
