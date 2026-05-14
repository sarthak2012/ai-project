const asyncHandler = require('express-async-handler');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const User = require('../models/User');
const Task = require('../models/Task');

// Works for both raw ObjectIds and populated subdocuments.
const idOf = (v) => (v && v._id ? v._id.toString() : v.toString());

const isAdminOfProject = (project, userId) =>
  idOf(project.admin) === userId.toString();

const isMemberOfProject = (project, userId) =>
  isAdminOfProject(project, userId) ||
  project.members.some((m) => idOf(m) === userId.toString());

// POST /api/projects  (admin only)
const createProject = asyncHandler(async (req, res) => {
  const { title, description, members } = req.body;

  if (!title || !title.trim()) {
    res.status(400);
    throw new Error('Project title is required');
  }

  let memberIds = [];
  if (Array.isArray(members)) {
    memberIds = members.filter((id) => mongoose.Types.ObjectId.isValid(id));
    // Ensure all referenced users exist
    const found = await User.find({ _id: { $in: memberIds } }).select('_id');
    if (found.length !== memberIds.length) {
      res.status(400);
      throw new Error('One or more member IDs are invalid');
    }
  }

  const project = await Project.create({
    title: title.trim(),
    description: description || '',
    admin: req.user._id,
    members: memberIds,
  });

  const populated = await project.populate([
    { path: 'admin', select: 'name email role' },
    { path: 'members', select: 'name email role' },
  ]);

  res.status(201).json(populated);
});

// GET /api/projects  — projects the user can see (admin OR member)
const getProjects = asyncHandler(async (req, res) => {
  const projects = await Project.find({
    $or: [{ admin: req.user._id }, { members: req.user._id }],
  })
    .populate('admin', 'name email role')
    .populate('members', 'name email role')
    .sort({ createdAt: -1 });

  res.json(projects);
});

// GET /api/projects/:id
const getProjectById = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id)
    .populate('admin', 'name email role')
    .populate('members', 'name email role');

  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }

  if (!isMemberOfProject(project, req.user._id)) {
    res.status(403);
    throw new Error('You do not have access to this project');
  }

  res.json(project);
});

// PUT /api/projects/:id  — only admin of project (and global admin role)
const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }
  if (!isAdminOfProject(project, req.user._id)) {
    res.status(403);
    throw new Error('Only the project admin can update this project');
  }

  const { title, description } = req.body;
  if (title !== undefined) project.title = String(title).trim();
  if (description !== undefined) project.description = description;

  const saved = await project.save();
  const populated = await saved.populate([
    { path: 'admin', select: 'name email role' },
    { path: 'members', select: 'name email role' },
  ]);
  res.json(populated);
});

// DELETE /api/projects/:id  — only project admin. Cascades tasks.
const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }
  if (!isAdminOfProject(project, req.user._id)) {
    res.status(403);
    throw new Error('Only the project admin can delete this project');
  }

  await Task.deleteMany({ project: project._id });
  await project.deleteOne();
  res.json({ message: 'Project deleted' });
});

// PUT /api/projects/:id/members  — add or remove members

const updateProjectMembers = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) {
    res.status(404);
    throw new Error('Project not found');
  }
  if (!isAdminOfProject(project, req.user._id)) {
    res.status(403);
    throw new Error('Only the project admin can manage members');
  }

  const { add = [], remove = [] } = req.body || {};
  const validateIds = (ids) =>
    Array.isArray(ids) && ids.every((id) => mongoose.Types.ObjectId.isValid(id));

  if (!validateIds(add) || !validateIds(remove)) {
    res.status(400);
    throw new Error('add/remove must be arrays of valid user IDs');
  }

  if (add.length) {
    const found = await User.find({ _id: { $in: add } }).select('_id');
    if (found.length !== add.length) {
      res.status(400);
      throw new Error('One or more user IDs to add are invalid');
    }
    const adminId = project.admin.toString();
    const current = new Set(project.members.map((m) => m.toString()));
    add.forEach((id) => {
      if (id !== adminId) current.add(id);
    });
    project.members = Array.from(current);
  }

  if (remove.length) {
    const removeSet = new Set(remove.map(String));
    project.members = project.members.filter((m) => !removeSet.has(m.toString()));
    // Unassign tasks for removed users in this project
    await Task.updateMany(
      { project: project._id, assignedTo: { $in: remove } },
      { $set: { assignedTo: null } }
    );
  }

  const saved = await project.save();
  const populated = await saved.populate([
    { path: 'admin', select: 'name email role' },
    { path: 'members', select: 'name email role' },
  ]);
  res.json(populated);
});

module.exports = {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  updateProjectMembers,
};
