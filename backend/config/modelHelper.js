const mongoose = require('mongoose');
const contextStorage = require('./context');
const db = require('./db');

function createDynamicModel(modelName, schema, fallbackDb = 'admin') {
  // Compile the model on both connections
  const AdminModel = db.adminConn.model(modelName, schema);
  const ExpensesModel = db.expensesConn.model(modelName, schema);

  const dummyTarget = function () {};
  return new Proxy(dummyTarget, {
    get(target, prop) {
      // Direct accessors for background tasks/seeding
      if (prop === 'adminModel') return AdminModel;
      if (prop === 'expensesModel') return ExpensesModel;
      if (prop === 'schema') return schema;

      // Request-scoped connection routing
      const context = contextStorage.getStore();
      const dbType = context?.dbType || fallbackDb;
      const model = dbType === 'expenses' ? ExpensesModel : AdminModel;

      const value = model[prop];
      if (typeof value === 'function') {
        return value.bind(model);
      }
      return value;
    },
    set(target, prop, value) {
      const context = contextStorage.getStore();
      const dbType = context?.dbType || fallbackDb;
      const model = dbType === 'expenses' ? ExpensesModel : AdminModel;
      model[prop] = value;
      return true;
    },
    construct(target, args) {
      const context = contextStorage.getStore();
      const dbType = context?.dbType || fallbackDb;
      const model = dbType === 'expenses' ? ExpensesModel : AdminModel;
      return new model(...args);
    }
  });
}

module.exports = createDynamicModel;
