const mongoose = require('mongoose');

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

const Machine = mongoose.model('Machine', machineSchema);

module.exports = Machine;
