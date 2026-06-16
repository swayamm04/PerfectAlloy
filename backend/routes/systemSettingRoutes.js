const express = require('express');
const router = express.Router();
const {
  getSystemSettings,
  updateSystemSettings,
} = require('../controllers/systemSettingController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getSystemSettings)
  .put(protect, superAdmin, updateSystemSettings);

module.exports = router;
