const express = require('express');
const router = express.Router();
const {
  getOperatorTable,
  updateOperatorTable,
  resetOperatorTable,
} = require('../controllers/operatorTableController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getOperatorTable)
  .put(protect, superAdmin, updateOperatorTable);

router.post('/reset', protect, superAdmin, resetOperatorTable);

module.exports = router;
