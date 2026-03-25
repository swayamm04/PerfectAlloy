const express = require('express');
const router = express.Router();
const {
  getDepartments,
  createDepartment,
  deleteDepartment,
  updateDepartment,
} = require('../controllers/departmentController');
const { protect, admin, superAdmin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, admin, getDepartments)
  .post(protect, superAdmin, createDepartment);

router.route('/:id')
  .put(protect, superAdmin, updateDepartment)
  .delete(protect, superAdmin, deleteDepartment);

module.exports = router;
