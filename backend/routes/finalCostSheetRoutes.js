const express = require('express');
const router = express.Router();
const {
  getFinalCostSheets,
  updateFinalCostSheet,
  createMonth,
  deleteFinalCostSheet
} = require('../controllers/finalCostSheetController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getFinalCostSheets);

router.route('/new-month')
  .post(protect, superAdmin, createMonth);

router.route('/:month')
  .put(protect, superAdmin, updateFinalCostSheet)
  .delete(protect, superAdmin, deleteFinalCostSheet);

module.exports = router;
