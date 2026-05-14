const express = require('express');
const router = express.Router();
const {
  createTask,
  getTasks,
  getTaskById,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');
const validateObjectId = require('../middleware/validateObjectId');

router.use(protect);

router.route('/').get(getTasks).post(createTask);

router
  .route('/:id')
  .get(validateObjectId('id'), getTaskById)
  .put(validateObjectId('id'), updateTask)
  .delete(validateObjectId('id'), deleteTask);

module.exports = router;
