const express = require('express');
const router = express.Router();
const {
  getMachineHourRates,
  updateMachineHourRate,
  resetMachineHourRates,
} = require('../controllers/machineHourRateController');
const { protect, superAdmin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getMachineHourRates)
  .put(protect, superAdmin, updateMachineHourRate);

router.post('/reset', protect, superAdmin, resetMachineHourRates);

module.exports = router;
