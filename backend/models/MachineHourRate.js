const mongoose = require('mongoose');

const createDynamicModel = require('../config/modelHelper');

const machineHourRateSchema = mongoose.Schema(
  {
    machine: {
      type: String,
      required: true,
      unique: true,
    },
    values: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createDynamicModel('MachineHourRate', machineHourRateSchema, 'expenses');
