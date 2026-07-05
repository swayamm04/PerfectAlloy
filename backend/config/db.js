const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars from parent .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const getDbUri = (dbName) => {
  const baseUri = process.env.MONGODB_URI;
  if (!baseUri) return null;
  const uriWithoutParams = baseUri.split('?')[0];
  const params = baseUri.split('?')[1] ? '?' + baseUri.split('?')[1] : '';
  const lastSlashIndex = uriWithoutParams.lastIndexOf('/');
  const protocolIndex = uriWithoutParams.indexOf('://');
  
  if (lastSlashIndex > protocolIndex + 2) {
    const hostPart = uriWithoutParams.substring(0, lastSlashIndex);
    return `${hostPart}/${dbName}${params}`;
  } else {
    return `${uriWithoutParams}/${dbName}${params}`;
  }
};

const adminUri = process.env.MONGODB_ADMIN_URI || getDbUri('pac_admin');
const expensesUri = process.env.MONGODB_EXPENSES_URI || getDbUri('pac_expenses');

console.log('Using Admin URI:', adminUri ? adminUri.replace(/:.*@/, ':****@') : 'UNDEFINED');
console.log('Using Expenses URI:', expensesUri ? expensesUri.replace(/:.*@/, ':****@') : 'UNDEFINED');

const adminConn = mongoose.createConnection(adminUri);
const expensesConn = mongoose.createConnection(expensesUri);

const connectDB = async () => {
  try {
    await Promise.all([
      new Promise((resolve, reject) => {
        adminConn.once('open', () => {
          console.log('MongoDB Admin connected successfully');
          resolve();
        });
        adminConn.once('error', reject);
      }),
      new Promise((resolve, reject) => {
        expensesConn.once('open', () => {
          console.log('MongoDB Expenses connected successfully');
          resolve();
        });
        expensesConn.once('error', reject);
      })
    ]);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = {
  adminConn,
  expensesConn,
  connectDB
};
