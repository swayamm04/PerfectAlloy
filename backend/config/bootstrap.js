const User = require('../models/User');
const OperatorTable = require('../models/OperatorTable');
const EquipmentTable = require('../models/EquipmentTable');
const SystemSetting = require('../models/SystemSetting');
const bcrypt = require('bcryptjs');

const bootstrapDB = async () => {
  try {
    // 1. Seed Admin DB Super Admin
    let adminUser = await User.adminModel.findOne({ email: 'admin@pac.com' });
    if (!adminUser) {
      await User.adminModel.create({
        name: 'Super Admin',
        email: 'admin@pac.com',
        password: 'perfect',
        isAdmin: true,
        role: 'super-admin'
      });
      console.log('Seeded Admin DB Super Admin user');
    } else {
      adminUser.password = 'perfect';
      await adminUser.save();
      console.log('Ensured Admin DB Super Admin password is correct');
    }

    // 2. Seed Expenses DB Super Admin
    let expensesUser = await User.expensesModel.findOne({ email: 'admin@pac.com' });
    if (!expensesUser) {
      await User.expensesModel.create({
        name: 'Expenses Super Admin',
        email: 'admin@pac.com',
        password: 'expences',
        isAdmin: true,
        role: 'super-admin'
      });
      console.log('Seeded Expenses DB Super Admin user');
    } else {
      expensesUser.password = 'expences';
      await expensesUser.save();
      console.log('Ensured Expenses DB Super Admin password is correct');
    }

    // 3. Seed Expenses DB default templates if empty
    const opTableExists = await OperatorTable.expensesModel.findOne({});
    if (!opTableExists) {
      const DEFAULT_COLUMNS = [
        { key: 'designation', name: 'Designation', type: 'manual', formula: '', meta: '' },
        { key: 'basic', name: 'Basic', type: 'manual', formula: '', meta: '' },
        { key: 'da', name: 'DA', type: 'manual', formula: '', meta: '' },
        { key: 'sub_total', name: 'Sub total', type: 'formula', formula: '[basic] + [da] + 5', meta: '' },
        { key: 'esi', name: 'ESI', type: 'formula', formula: 'round([sub_total] * 0.0475, 2)', meta: '4.75%' },
        { key: 'pf', name: 'PF', type: 'formula', formula: 'round([sub_total] * 0.1310, 1)', meta: '13.10%' },
        { key: 'gratuity', name: 'Gratuity', type: 'formula', formula: 'round([sub_total] * 0.04, 1)', meta: '4%' },
        { key: 'bonus', name: 'Bonus', type: 'formula', formula: 'round([sub_total] * 0.20, 2)', meta: '20%' },
        { key: 'food', name: 'Food', type: 'formula', formula: 'round(350 / 25, 0)', meta: '350/mth' },
        { key: 'safety_clothes', name: 'Saftey/Clothes', type: 'formula', formula: 'round(2000 / 365, 1)', meta: '2000/Yr' },
        { key: 'incentive', name: 'Incentive', type: 'manual', formula: '', meta: '' },
        { key: 'grand_total', name: 'Grand Total', type: 'formula', formula: 'round([sub_total] + [esi] + [pf] + [gratuity] + [bonus] + [food] + [safety_clothes] + [incentive], 0)', meta: '' },
      ];
      const DEFAULT_ROWS = [
        { designation: 'Operator', values: { basic: '286', da: '272', incentive: '200' } },
        { designation: 'Supervisor', values: { basic: '286', da: '272', incentive: '400' } },
        { designation: 'Plant Manager', values: { basic: '700', da: '272', incentive: '900' } },
      ];
      await OperatorTable.expensesModel.create({
        columns: DEFAULT_COLUMNS,
        rows: DEFAULT_ROWS
      });
      console.log('Seeded Expenses DB Operator Table default template');
    }

    const eqTableExists = await EquipmentTable.expensesModel.findOne({});
    if (!eqTableExists) {
      const DEFAULT_COLUMNS = [
        { key: 'designation', name: 'Machine', type: 'manual', formula: '', meta: '' },
        { key: 'mc_cost', name: 'M/c Cost', type: 'manual', formula: '', meta: '( incl comp)' },
        { key: 'power', name: 'Power (kW)', type: 'manual', formula: '', meta: '' },
        { key: 'power_factor', name: 'Power Factor', type: 'manual', formula: '', meta: '' },
        { key: 'range_value', name: 'Range Value', type: 'manual', formula: '', meta: '' },
        { key: 'dep_pa', name: 'Dep', type: 'formula', formula: '[mc_cost] * 0.15', meta: 'at 15% PA' },
        { key: 'dep_hr', name: 'Dep', type: 'formula', formula: 'round([dep_pa] / 7117.5, 1)', meta: 'Per Hr' },
        { key: 'interest_pa', name: 'Interest', type: 'formula', formula: '[mc_cost] * 0.10', meta: 'at 10% PA' },
        { key: 'interest_hr', name: 'Interest', type: 'formula', formula: 'round([interest_pa] / 7117.5, 1)', meta: 'Per Hr' },
        { key: 'total', name: 'Total', type: 'formula', formula: 'round(([dep_pa] + [interest_pa]) / 7117.5, 1)', meta: '' },
      ];
      const DEFAULT_ROWS = [
        { designation: 'Annealing', values: { mc_cost: '1000000', power: '18', power_factor: '0.75', range_value: '6.8' } },
        { designation: 'CNC', values: { mc_cost: '1875000', power: '11', power_factor: '0.75', range_value: '6.8' } },
        { designation: 'VMC', values: { mc_cost: '5225000', power: '15', power_factor: '0.75', range_value: '6.8' } },
        { designation: 'Metrology', values: { mc_cost: '3500000', power: '5', power_factor: '0.75', range_value: '6.8' } },
        { designation: 'Grinding GCL 100', values: { mc_cost: '2000000', power: '20', power_factor: '0.75', range_value: '6.8' } },
        { designation: 'Manual Lathe', values: { mc_cost: '6000000', power: '11', power_factor: '0.75', range_value: '6.8' } },
        { designation: 'Vibrofinishing', values: { mc_cost: '200000', power: '6', power_factor: '0.75', range_value: '6.8' } },
        { designation: 'Ultrasonic Cleaning', values: { mc_cost: '2500000', power: '10', power_factor: '0.75', range_value: '6.8' } },
        { designation: 'Laser Marking', values: { mc_cost: '1800000', power: '5', power_factor: '0.75', range_value: '6.8' } },
        { designation: 'Muratec', values: { mc_cost: '11000000', power: '40', power_factor: '0.75', range_value: '6.8' } },
        { designation: 'Paragan Grinding', values: { mc_cost: '4500000', power: '40', power_factor: '0.75', range_value: '6.8' } },
        { designation: 'Grinding CLG 5020 cnc with auto load', values: { mc_cost: '8000000', power: '40', power_factor: '0.75', range_value: '6.8' } },
      ];
      await EquipmentTable.expensesModel.create({
        columns: DEFAULT_COLUMNS,
        rows: DEFAULT_ROWS
      });
      console.log('Seeded Expenses DB Equipment Table default template');
    }

    const powerSettingExists = await SystemSetting.expensesModel.findOne({ key: 'power_universal_value' });
    if (!powerSettingExists) {
      await SystemSetting.expensesModel.create({
        key: 'power_universal_value',
        value: '8'
      });
      console.log('Seeded Expenses DB System Settings default value');
    }

  } catch (error) {
    console.error('Error during DB bootstrap:', error);
  }
};

module.exports = bootstrapDB;
