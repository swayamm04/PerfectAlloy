const express = require('express');
const router = express.Router();
const {
  getTaskQueue,
  acceptInward,
  updateProcess,
  completeOutward,
} = require('../controllers/workflowController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/queue', protect, admin, getTaskQueue);
router.post('/accept/:rowId', protect, admin, acceptInward);
router.put('/process/:rowId', protect, admin, updateProcess);
router.post('/outward/:rowId', protect, admin, completeOutward);

module.exports = router;
