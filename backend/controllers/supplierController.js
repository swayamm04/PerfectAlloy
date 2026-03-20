const Supplier = require('../models/Supplier');

// @desc    Get all suppliers
// @route   GET /api/suppliers
// @access  Private/Admin
const getSuppliers = async (req, res) => {
  try {
    const suppliers = await Supplier.find({});
    res.json(suppliers);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a supplier
// @route   POST /api/suppliers
// @access  Private/Admin
const createSupplier = async (req, res) => {
  try {
    const { name, contactPerson, email, phone, address, category } = req.body;
    
    const supplierExists = await Supplier.findOne({ email });
    if (supplierExists) {
      return res.status(400).json({ message: 'Supplier with this email already exists' });
    }

    const supplier = await Supplier.create({
      name, contactPerson, email, phone, address, category
    });

    res.status(201).json(supplier);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a supplier
// @route   PUT /api/suppliers/:id
// @access  Private/Admin
const updateSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (supplier) {
      supplier.name = req.body.name || supplier.name;
      supplier.contactPerson = req.body.contactPerson || supplier.contactPerson;
      supplier.email = req.body.email || supplier.email;
      supplier.phone = req.body.phone || supplier.phone;
      supplier.address = req.body.address || supplier.address;
      supplier.category = req.body.category || supplier.category;
      supplier.status = req.body.status || supplier.status;
      
      const updatedSupplier = await supplier.save();
      res.json(updatedSupplier);
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a supplier
// @route   DELETE /api/suppliers/:id
// @access  Private/Admin
const deleteSupplier = async (req, res) => {
  try {
    const supplier = await Supplier.findById(req.params.id);

    if (supplier) {
      req.deletedResourceName = supplier.name; // For audit log
      await supplier.deleteOne();
      res.json({ message: 'Supplier removed' });
    } else {
      res.status(404).json({ message: 'Supplier not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier,
};
