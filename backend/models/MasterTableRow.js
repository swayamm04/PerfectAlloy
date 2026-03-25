const mongoose = require('mongoose');

const masterTableRowSchema = mongoose.Schema(
  {
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterTable',
      required: true,
    },
    partNumber: {
      type: String,
      required: true,
      trim: true,
    },
    currentDepartmentIndex: {
      type: Number,
      default: 0, // Points to the index in MasterTable.departments
    },
    // Map where keys are Department IDs and values are objects containing stage data
    stages: {
      type: Map,
      of: {
        inward: {
          qty: { type: Number, default: 0 },
          receivedAt: { type: Date },
          source: { type: String }, // e.g. "Open Stock" or another Dept ID
        },
        process: {
          status: { type: String, default: 'Pending' }, // Pending, Processing, Completed
          updatedAt: { type: Date },
          notes: { type: String },
        },
        outward: {
          qty: { type: Number, default: 0 },
          sentAt: { type: Date },
          isCompleted: { type: Boolean, default: false },
        },
      },
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

const MasterTableRow = mongoose.model('MasterTableRow', masterTableRowSchema);

module.exports = MasterTableRow;
