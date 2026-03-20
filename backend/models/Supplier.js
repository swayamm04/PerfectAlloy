const mongoose = require('mongoose');

const supplierSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Supplier name is required'],
    trim: true,
  },
  contactPerson: {
    type: String,
    required: [true, 'Contact person is required'],
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
  },
  address: {
    type: String,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Supplier', supplierSchema);
