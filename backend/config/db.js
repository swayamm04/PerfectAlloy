const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from parent .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('Using URI:', process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/:.*@/, ':****@') : 'UNDEFINED');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
