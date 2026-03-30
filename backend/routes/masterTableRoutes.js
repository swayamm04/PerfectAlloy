const express = require('express');
const router = express.Router();
const {
  createMasterTable,
  getMasterTables,
  getMasterTableById,
  deleteMasterTable,
  updateMasterTable,
  createMasterTableRow,
  updateMasterTableRow,
  deleteMasterTableRow,
} = require('../controllers/masterTableController');
const { protect, admin, superAdmin } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, superAdmin, createMasterTable)
  .get(protect, admin, getMasterTables);

router.route('/:id')
  .get(protect, admin, getMasterTableById)
  .put(protect, superAdmin, updateMasterTable)
  .delete(protect, superAdmin, deleteMasterTable);

router.route('/:id/rows')
  .post(protect, admin, createMasterTableRow);

router.route('/rows/:rowId')
  .put(protect, admin, updateMasterTableRow)
  .delete(protect, admin, deleteMasterTableRow);

module.exports = router;
