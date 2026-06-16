const OperatorTable = require('../models/OperatorTable');

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

// @desc    Get operator table config/data
// @route   GET /api/operator-table
// @access  Private
const getOperatorTable = async (req, res) => {
  try {
    let table = await OperatorTable.findOne({});
    if (!table) {
      table = await OperatorTable.create({
        columns: DEFAULT_COLUMNS,
        rows: DEFAULT_ROWS,
      });
    }
    res.json(table);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Update operator table config/data
// @route   PUT /api/operator-table
// @access  Private/SuperAdmin
const updateOperatorTable = async (req, res) => {
  const { columns, rows } = req.body;
  try {
    let table = await OperatorTable.findOne({});
    if (!table) {
      table = new OperatorTable({ columns, rows });
    } else {
      table.columns = columns;
      table.rows = rows;
    }
    const updatedTable = await table.save();
    res.json(updatedTable);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Reset operator table to default template
// @route   POST /api/operator-table/reset
// @access  Private/SuperAdmin
const resetOperatorTable = async (req, res) => {
  try {
    await OperatorTable.deleteMany({});
    const seededTable = await OperatorTable.create({
      columns: DEFAULT_COLUMNS,
      rows: DEFAULT_ROWS,
    });
    res.json(seededTable);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

module.exports = {
  getOperatorTable,
  updateOperatorTable,
  resetOperatorTable,
};
