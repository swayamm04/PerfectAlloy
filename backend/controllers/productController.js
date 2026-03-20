const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Private/Admin
const getProducts = async (req, res) => {
  try {
    const products = await Product.find({}).populate('supplier', 'name');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const { name, sku, category, stock, price, unit, supplier } = req.body;
    
    const productExists = await Product.findOne({ sku });
    if (productExists) {
      return res.status(400).json({ message: 'Product with this SKU already exists' });
    }

    const product = await Product.create({
      name, sku, category, stock, price, unit, supplier
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      product.name = req.body.name || product.name;
      product.sku = req.body.sku || product.sku;
      product.category = req.body.category || product.category;
      product.stock = req.body.stock !== undefined ? req.body.stock : product.stock;
      product.price = req.body.price !== undefined ? req.body.price : product.price;
      product.unit = req.body.unit || product.unit;
      product.supplier = req.body.supplier || product.supplier;
      
      const updatedProduct = await product.save();
      res.json(updatedProduct);
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (product) {
      req.deletedResourceName = product.name; // For audit log
      await product.deleteOne();
      res.json({ message: 'Product removed' });
    } else {
      res.status(404).json({ message: 'Product not found' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
