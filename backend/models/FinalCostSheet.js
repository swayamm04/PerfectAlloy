const mongoose = require('mongoose');
const createDynamicModel = require('../config/modelHelper');

const rowSchema = mongoose.Schema({
  partName: {
    type: String,
    required: true,
  },
  partNumber: {
    type: String,
    required: true,
  },
  materialName: {
    type: String,
    default: '',
  },
  selectedLoop: {
    type: [String],
    default: [],
  },
  values: {
    type: Map,
    of: String,
    default: {},
  },
});

const finalCostSheetSchema = mongoose.Schema(
  {
    month: {
      type: String,
      required: true,
      unique: true, // E.g. '2026-06'
    },
    rows: [rowSchema],
    customColumns: {
      type: Array,
      default: []
    }
  },
  {
    timestamps: true,
  }
);

module.exports = createDynamicModel('FinalCostSheet', finalCostSheetSchema, 'expenses');
