const express = require('express');
const router = express.Router();
const { getActivities } = require('../controllers/activityController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

router.get('/', protect, superAdmin, getActivities);

module.exports = router;
