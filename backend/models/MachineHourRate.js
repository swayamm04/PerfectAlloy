const mongoose = require('mongoose');

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

const MachineHourRate = mongoose.model('MachineHourRate', machineHourRateSchema);

module.exports = MachineHourRate;
