const express = require('express');
const router = express.Router();
const {
  getEquipmentTable,
  updateEquipmentTable,
  resetEquipmentTable,
} = require('../controllers/equipmentTableController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getEquipmentTable)
  .put(protect, updateEquipmentTable);

router.post('/reset', protect, superAdmin, resetEquipmentTable);

module.exports = router;
