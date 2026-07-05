const mongoose = require('mongoose');

const createDynamicModel = require('../config/modelHelper');

const columnSchema = mongoose.Schema({
  key: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['manual', 'formula'],
    required: true,
  },
  formula: {
    type: String,
    default: '',
  },
  meta: {
    type: String,
    default: '',
  },
});

const rowSchema = mongoose.Schema({
  designation: { // Maps to Material Name in the front-end
    type: String,
    required: true,
  },
  values: {
    type: Map,
    of: String,
    default: {},
  },
});

const materialRateSchema = mongoose.Schema(
  {
    month: {
      type: String,
      required: true,
      unique: true, // E.g., '2026-03'
    },
    columns: [columnSchema],
    rows: [rowSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = createDynamicModel('MaterialRate', materialRateSchema, 'expenses');
