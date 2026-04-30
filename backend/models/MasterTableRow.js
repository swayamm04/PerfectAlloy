const mongoose = require('mongoose');

const masterTableRowSchema = mongoose.Schema(
  {
    tableId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MasterTable',
      required: true,
    },
    partName: {
      type: String,
      trim: true,
    },
    partNumber: {
      type: String,
      required: true,
      trim: true,
    },
    material: {
      type: String,
      trim: true,
    },
    heatNo: {
      type: String,
      trim: true,
    },
    customerName: {
      type: String,
      trim: true,
    },
    isBlueprint: {
      type: Boolean,
      default: false,
    },
    selectedLoop: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Department',
      },
    ],
    currentDepartmentIndex: {
      type: Number,
      default: 0, // Points to the index in selectedLoop
    },
    // Array of objects containing stage data, where stages[i] corresponds to selectedLoop[i]
    stages: [
      {
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
          qty: Number,
          rejectionQty: { type: Number, default: 0 },
          operatorName: String,
          sentAt: Date,
          isCompleted: { type: Boolean, default: false },
          reason: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

const MasterTableRow = mongoose.model('MasterTableRow', masterTableRowSchema);

module.exports = MasterTableRow;
