const mongoose = require('mongoose');

const createDynamicModel = require('../config/modelHelper');

const activitySchema = mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  action: {
    type: String,
    required: true,
  },
  method: {
    type: String,
    required: true,
  },
  resource: {
    type: String,
    required: true,
  },
  details: {
    type: String,
  },
  isSuccess: {
    type: Boolean,
    default: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = createDynamicModel('Activity', activitySchema, 'admin');
