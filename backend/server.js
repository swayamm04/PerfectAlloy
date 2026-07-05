const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const { connectDB } = require('./config/db');
const bootstrapDB = require('./config/bootstrap');
const contextStorage = require('./config/context');

const userRoutes = require('./routes/userRoutes');
const activityRoutes = require('./routes/activityRoutes');
const productRoutes = require('./routes/productRoutes');
const supplierRoutes = require('./routes/supplierRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const masterTableRoutes = require('./routes/masterTableRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const machineRoutes = require('./routes/machineRoutes');
const operatorTableRoutes = require('./routes/operatorTableRoutes');
const equipmentTableRoutes = require('./routes/equipmentTableRoutes');
const machineHourRateRoutes = require('./routes/machineHourRateRoutes');
const systemSettingRoutes = require('./routes/systemSettingRoutes');
const materialRateRoutes = require('./routes/materialRateRoutes');
const finalCostSheetRoutes = require('./routes/finalCostSheetRoutes');
const auditLogger = require('./middleware/auditMiddleware');

// Load env vars from current directory
dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Request-scoped database routing middleware
app.use((req, res, next) => {
  let dbType = 'admin'; // default fallback
  
  if (req.headers['x-module'] === 'expenses') {
    dbType = 'expenses';
  } else if (req.headers['x-module'] === 'admin') {
    dbType = 'admin';
  } else if (req.body && req.body.portal === 'expenses') {
    dbType = 'expenses';
  } else if (req.body && req.body.portal === 'admin') {
    dbType = 'admin';
  } else {
    // Path-based fallback
    const pathName = req.path;
    const expensesRoutes = [
      '/api/machines',
      '/api/operator-table',
      '/api/equipment-table',
      '/api/machine-hour-rate',
      '/api/system-settings',
      '/api/material-rate',
      '/api/final-cost-sheet'
    ];
    if (expensesRoutes.some(route => pathName.startsWith(route))) {
      dbType = 'expenses';
    }
  }

  contextStorage.run({ dbType }, () => {
    next();
  });
});

app.use(auditLogger); // Global audit logger

app.use('/api/users', userRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/products', productRoutes);
app.use('/api/suppliers', supplierRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/master-tables', masterTableRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/machines', machineRoutes);
app.use('/api/operator-table', operatorTableRoutes);
app.use('/api/equipment-table', equipmentTableRoutes);
app.use('/api/machine-hour-rate', machineHourRateRoutes);
app.use('/api/system-settings', systemSettingRoutes);
app.use('/api/material-rate', materialRateRoutes);
app.use('/api/final-cost-sheet', finalCostSheetRoutes);

app.get('/', (req, res) => {
  res.send('API is running...');
});

const PORT = process.env.PORT || 5000;

// Connect to Database, bootstrap collections, and start server
connectDB()
  .then(async () => {
    await bootstrapDB();
    app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
  })
  .catch(err => {
    console.error('Failed to connect to MongoDB', err);
  });
