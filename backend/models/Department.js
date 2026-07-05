const mongoose = require('mongoose');

const createDynamicModel = require('../config/modelHelper');

const departmentSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    description: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createDynamicModel('Department', departmentSchema, 'admin');
