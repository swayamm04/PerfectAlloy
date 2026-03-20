const express = require('express');
const router = express.Router();
const { 
  getSuppliers, 
  createSupplier, 
  updateSupplier, 
  deleteSupplier 
} = require('../controllers/supplierController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, admin, getSuppliers)
  .post(protect, admin, createSupplier);

router.route('/:id')
  .put(protect, admin, updateSupplier)
  .delete(protect, admin, deleteSupplier);

module.exports = router;
