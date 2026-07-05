const express = require('express');
const router = express.Router();
const {
  getMaterialRates,
  updateMaterialRate,
  createMonth,
  deleteMaterialRate
} = require('../controllers/materialRateController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getMaterialRates);

router.route('/new-month')
  .post(protect, superAdmin, createMonth);

router.route('/:month')
  .put(protect, superAdmin, updateMaterialRate)
  .delete(protect, superAdmin, deleteMaterialRate);

module.exports = router;
