const EquipmentTable = require('../models/EquipmentTable');

const DEFAULT_COLUMNS = [
  { key: 'designation', name: 'Machine', type: 'manual', formula: '', meta: '' },
  { key: 'mc_cost', name: 'M/c Cost', type: 'manual', formula: '', meta: '( incl comp)' },
  { key: 'dep_pa', name: 'Dep', type: 'formula', formula: '[mc_cost] * 0.15', meta: 'at 15% PA' },
  { key: 'dep_hr', name: 'Dep', type: 'formula', formula: 'round([dep_pa] / 7117.5, 1)', meta: 'Per Hr' },
  { key: 'interest_pa', name: 'Interest', type: 'formula', formula: '[mc_cost] * 0.10', meta: 'at 10% PA' },
  { key: 'interest_hr', name: 'Interest', type: 'formula', formula: 'round([interest_pa] / 7117.5, 1)', meta: 'Per Hr' },
  { key: 'total', name: 'Total', type: 'formula', formula: 'round(([dep_pa] + [interest_pa]) / 7117.5, 1)', meta: '' },
];

const DEFAULT_ROWS = [
  { designation: 'Annealing', values: { mc_cost: '1000000' } },
  { designation: 'CNC', values: { mc_cost: '1875000' } },
  { designation: 'VMC', values: { mc_cost: '5225000' } },
  { designation: 'Metrology', values: { mc_cost: '3500000' } },
  { designation: 'Grinding GCL 100', values: { mc_cost: '2000000' } },
  { designation: 'Manual Lathe', values: { mc_cost: '6000000' } },
  { designation: 'Vibrofinishing', values: { mc_cost: '200000' } },
  { designation: 'Ultrasonic Cleaning', values: { mc_cost: '2500000' } },
  { designation: 'Laser Marking', values: { mc_cost: '1800000' } },
  { designation: 'Muratec', values: { mc_cost: '11000000' } },
  { designation: 'Paragan Grinding', values: { mc_cost: '4500000' } },
  { designation: 'Grinding CLG 5020 cnc with auto load', values: { mc_cost: '8000000' } },
];

// @desc    Get equipment table config/data
// @route   GET /api/equipment-table
// @access  Private
const getEquipmentTable = async (req, res) => {
  try {
    let table = await EquipmentTable.findOne({});
    if (!table) {
      table = await EquipmentTable.create({
        columns: DEFAULT_COLUMNS,
        rows: DEFAULT_ROWS,
      });
    } else {
      // Auto-migrate total column formula if it's the old one
      let updated = false;
      table.columns = table.columns.map(col => {
        if (col.key === 'total' && col.formula !== 'round(([dep_pa] + [interest_pa]) / 7117.5, 1)') {
          col.formula = 'round(([dep_pa] + [interest_pa]) / 7117.5, 1)';
          updated = true;
        }
        return col;
      });
      if (updated) {
        await table.save();
      }
    }
    res.json(table);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Update equipment table config/data
// @route   PUT /api/equipment-table
// @access  Private/SuperAdmin
const updateEquipmentTable = async (req, res) => {
  const { columns, rows } = req.body;
  try {
    let table = await EquipmentTable.findOne({});
    if (!table) {
      table = new EquipmentTable({ columns, rows });
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

// @desc    Reset equipment table to default template
// @route   POST /api/equipment-table/reset
// @access  Private/SuperAdmin
const resetEquipmentTable = async (req, res) => {
  try {
    await EquipmentTable.deleteMany({});
    const seededTable = await EquipmentTable.create({
      columns: DEFAULT_COLUMNS,
      rows: DEFAULT_ROWS,
    });
    res.json(seededTable);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

module.exports = {
  getEquipmentTable,
  updateEquipmentTable,
  resetEquipmentTable,
};
