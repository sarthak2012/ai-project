const express = require('express');
const router = express.Router();
const {
  createProject,
  getProjects,
  getProjectById,
  updateProject,
  deleteProject,
  updateProjectMembers,
} = require('../controllers/projectController');
const { protect, requireRole } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

router.use(protect);

// Convenience endpoint for admins to look up users to add as members.
// GET /api/projects/users/list?search=<term>
router.get(
  '/users/list',
  requireRole('admin'),
  asyncHandler(async (req, res) => {
    const { search = '' } = req.query;
    const filter = search
      ? {
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } },
          ],
        }
      : {};
    const users = await User.find(filter).select('name email role').limit(25);
    res.json(users);
  })
);

router
  .route('/')
  .get(getProjects)
  .post(requireRole('admin'), createProject);

router
  .route('/:id')
  .get(validateObjectId('id'), getProjectById)
  .put(validateObjectId('id'), updateProject)
  .delete(validateObjectId('id'), deleteProject);

router.put('/:id/members', validateObjectId('id'), updateProjectMembers);

module.exports = router;
