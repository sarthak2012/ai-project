const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');

// Works for both raw ObjectIds and populated subdocuments.
const idOf = (v) => (v && v._id ? v._id.toString() : v.toString());

const isAdminOfProject = (project, userId) =>
  idOf(project.admin) === userId.toString();

const isMemberOfProject = (project, userId) =>
  isAdminOfProject(project, userId) ||
  project.members.some((m) => idOf(m) === userId.toString());

// POST /api/tasks  — admin of the project only
const createTask = asyncHandler(async (req, res) => {
  const { title, description, dueDate, status, assignedTo, project: projectId } = req.body;

  if (!title || !title.trim()) {
    res.status(400);
    throw new Error('Task title is required');
  }
  if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
    res.status(400);
    throw new Error('A valid project ID is required');
  }
  if (status && !Task.STATUSES.includes(status)) {
    res.status(400);
    throw new Error(`Invalid status. Allowed: ${Task.STATUSES.join(', ')}`);
  }
  if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
    res.status(400);
    throw new Error('Invalid assignedTo user ID');
  }

  const project = await Project.findById(projectId);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }
  if (!isAdminOfProject(project, req.user._id)) {
    res.status(403);
    throw new Error('Only the project admin can create tasks');
  }

  if (assignedTo && !isMemberOfProject(project, assignedTo)) {
    res.status(400);
    throw new Error('Cannot assign task to a user who is not a project member');
  }

  const task = await Task.create({
    title: title.trim(),
    description: description || '',
    dueDate: dueDate || null,
    status: status || 'Todo',
    assignedTo: assignedTo || null,
    project: project._id,
    createdBy: req.user._id,
  });

  const populated = await task.populate([
    { path: 'assignedTo', select: 'name email role' },
    { path: 'createdBy', select: 'name email role' },
    { path: 'project', select: 'title' },
  ]);
  res.status(201).json(populated);
});

// GET /api/tasks  — supports ?project=<id> and ?assignedToMe=true
const getTasks = asyncHandler(async (req, res) => {
  const { project: projectId, assignedToMe, status } = req.query;
  const filter = {};

  if (projectId) {
    if (!mongoose.Types.ObjectId.isValid(projectId)) {
      res.status(400);
      throw new Error('Invalid project ID');
    }
    const project = await Project.findById(projectId);
    if (!project) {
      res.status(404);
      throw new Error('Project not found');
    }
    if (!isMemberOfProject(project, req.user._id)) {
      res.status(403);
      throw new Error('You do not have access to this project');
    }
    filter.project = project._id;
  } else {
    // Limit to projects the user belongs to
    const projects = await Project.find({
      $or: [{ admin: req.user._id }, { members: req.user._id }],
    }).select('_id');
    filter.project = { $in: projects.map((p) => p._id) };
  }

  if (assignedToMe === 'true') filter.assignedTo = req.user._id;
  if (status && Task.STATUSES.includes(status)) filter.status = status;

  const tasks = await Task.find(filter)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role')
    .populate('project', 'title')
    .sort({ createdAt: -1 });

  res.json(tasks);
});

// GET /api/tasks/:id
const getTaskById = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignedTo', 'name email role')
    .populate('createdBy', 'name email role')
    .populate('project', 'title admin members');

  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const project = task.project;
  if (!isMemberOfProject(project, req.user._id)) {
    res.status(403);
    throw new Error('You do not have access to this task');
  }
  res.json(task);
});

// PUT /api/tasks/:id  — admin can update anything; members can only update status of own tasks
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('project');
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }

  const project = task.project;
  const isProjectAdmin = isAdminOfProject(project, req.user._id);
  const isAssignee =
    task.assignedTo && task.assignedTo.toString() === req.user._id.toString();

  if (!isProjectAdmin && !isAssignee) {
    res.status(403);
    throw new Error('You do not have permission to update this task');
  }

  const { title, description, dueDate, status, assignedTo } = req.body;

  if (status !== undefined) {
    if (!Task.STATUSES.includes(status)) {
      res.status(400);
      throw new Error(`Invalid status. Allowed: ${Task.STATUSES.join(', ')}`);
    }
    task.status = status;
  }

  // Members can ONLY change status of their own task
  if (!isProjectAdmin) {
    if (
      title !== undefined ||
      description !== undefined ||
      dueDate !== undefined ||
      assignedTo !== undefined
    ) {
      res.status(403);
      throw new Error('Members can only update the status of their assigned task');
    }
  } else {
    if (title !== undefined) task.title = String(title).trim();
    if (description !== undefined) task.description = description;
    if (dueDate !== undefined) task.dueDate = dueDate || null;
    if (assignedTo !== undefined) {
      if (assignedTo === null || assignedTo === '') {
        task.assignedTo = null;
      } else {
        if (!mongoose.Types.ObjectId.isValid(assignedTo)) {
          res.status(400);
          throw new Error('Invalid assignedTo user ID');
        }
        if (!isMemberOfProject(project, assignedTo)) {
          res.status(400);
          throw new Error('Cannot assign task to a user who is not a project member');
        }
        task.assignedTo = assignedTo;
      }
    }
  }

  const saved = await task.save();
  const populated = await saved.populate([
    { path: 'assignedTo', select: 'name email role' },
    { path: 'createdBy', select: 'name email role' },
    { path: 'project', select: 'title' },
  ]);
  res.json(populated);
});

// DELETE /api/tasks/:id  — only project admin
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id).populate('project');
  if (!task) {
    res.status(404);
    throw new Error('Task not found');
  }
  if (!isAdminOfProject(task.project, req.user._id)) {
    res.status(403);
    throw new Error('Only the project admin can delete tasks');
  }
  await task.deleteOne();
  res.json({ message: 'Task deleted' });
});

module.exports = {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
};
