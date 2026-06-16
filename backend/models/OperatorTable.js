const mongoose = require('mongoose');

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
  designation: {
    type: String,
    required: true,
  },
  values: {
    type: Map,
    of: String,
    default: {},
  },
});

const operatorTableSchema = mongoose.Schema(
  {
    columns: [columnSchema],
    rows: [rowSchema],
  },
  {
    timestamps: true,
  }
);

const OperatorTable = mongoose.model('OperatorTable', operatorTableSchema);

module.exports = OperatorTable;
