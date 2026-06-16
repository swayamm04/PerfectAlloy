const express = require('express');
const router = express.Router();
const {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
  getUniqueLabels,
} = require('../controllers/machineController');
const { protect, admin, superAdmin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, admin, getMachines)
  .post(protect, superAdmin, createMachine);

router.route('/unique-labels')
  .get(protect, admin, getUniqueLabels);

router.route('/:id')
  .get(protect, admin, getMachineById)
  .put(protect, superAdmin, updateMachine)
  .delete(protect, superAdmin, deleteMachine);

module.exports = router;
