const mongoose = require('mongoose');

const createDynamicModel = require('../config/modelHelper');

const systemSettingSchema = mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = createDynamicModel('SystemSetting', systemSettingSchema, 'expenses');
