const mongoose = require('mongoose');

const createDynamicModel = require('../config/modelHelper');

const fieldSchema = mongoose.Schema({
  label: {
    type: String,
    required: true,
  },
  value: {
    type: String,
    required: true,
  },
});

const machineSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
    fields: [fieldSchema],
  },
  {
    timestamps: true,
  }
);

module.exports = createDynamicModel('Machine', machineSchema, 'expenses');
