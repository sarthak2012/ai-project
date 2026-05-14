const asyncHandler = require('express-async-handler');
const Task = require('../models/Task');
const Project = require('../models/Project');

// GET /api/dashboard

const getDashboard = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const projects = await Project.find({
    $or: [{ admin: userId }, { members: userId }],
  }).select('_id');
  const projectIds = projects.map((p) => p._id);

  const now = new Date();

  const [
    totalTasks,
    completedTasks,
    pendingTasks,
    overdueTasks,
    assignedToMe,
    recentTasks,
  ] = await Promise.all([
    Task.countDocuments({ project: { $in: projectIds } }),
    Task.countDocuments({ project: { $in: projectIds }, status: 'Done' }),
    Task.countDocuments({ project: { $in: projectIds }, status: { $ne: 'Done' } }),
    Task.countDocuments({
      project: { $in: projectIds },
      status: { $ne: 'Done' },
      dueDate: { $ne: null, $lt: now },
    }),
    Task.find({ assignedTo: userId, project: { $in: projectIds } })
      .populate('project', 'title')
      .populate('assignedTo', 'name email')
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(20),
    Task.find({ project: { $in: projectIds } })
      .populate('project', 'title')
      .populate('assignedTo', 'name email')
      .sort({ createdAt: -1 })
      .limit(10),
  ]);

  res.json({
    counts: {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      projects: projectIds.length,
    },
    assignedToMe,
    recentTasks,
  });
});

module.exports = { getDashboard };
