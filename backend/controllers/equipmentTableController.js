const EquipmentTable = require('../models/EquipmentTable');

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

const getPowerForMachine = (name) => {
  const n = name.toLowerCase();
  if (n.includes('annealing')) return '18';
  if (n.includes('cnc')) return '11';
  if (n.includes('vmc')) return '15';
  if (n.includes('metrology')) return '5';
  if (n.includes('gcl 100')) return '20';
  if (n.includes('lathe')) return '11';
  if (n.includes('vibro')) return '6';
  if (n.includes('cleaning') || n.includes('ultrasonic')) return '10';
  if (n.includes('marking') || n.includes('laser')) return '5';
  if (n.includes('muratec')) return '40';
  if (n.includes('paragan')) return '40';
  if (n.includes('clg 5020')) return '40';
  return '10'; // generic fallback
};

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
      let updated = false;

      // Auto-migrate total column formula if it's the old one
      table.columns = table.columns.map(col => {
        if (col.key === 'total' && col.formula !== 'round(([dep_pa] + [interest_pa]) / 7117.5, 1)') {
          col.formula = 'round(([dep_pa] + [interest_pa]) / 7117.5, 1)';
          updated = true;
        }
        return col;
      });

      // Check if migration is needed for power columns
      const hasPower = table.columns.some(col => col.key === 'power');
      const hasPF = table.columns.some(col => col.key === 'power_factor');
      const hasRV = table.columns.some(col => col.key === 'range_value');

      if (!hasPower || !hasPF || !hasRV) {
        const mcCostIndex = table.columns.findIndex(col => col.key === 'mc_cost');
        const newCols = [];
        if (!hasPower) newCols.push({ key: 'power', name: 'Power (kW)', type: 'manual', formula: '', meta: '' });
        if (!hasPF) newCols.push({ key: 'power_factor', name: 'Power Factor', type: 'manual', formula: '', meta: '' });
        if (!hasRV) newCols.push({ key: 'range_value', name: 'Range Value', type: 'manual', formula: '', meta: '' });

        if (mcCostIndex !== -1) {
          table.columns.splice(mcCostIndex + 1, 0, ...newCols);
        } else {
          table.columns.push(...newCols);
        }

        table.rows.forEach(row => {
          if (!row.values) {
            row.values = new Map();
          }

          if (row.values instanceof Map) {
            if (!row.values.has('power')) {
              row.values.set('power', getPowerForMachine(row.designation));
            }
            if (!row.values.has('power_factor')) {
              row.values.set('power_factor', '0.75');
            }
            if (!row.values.has('range_value')) {
              row.values.set('range_value', '6.8');
            }
          } else {
            if (!row.values.power) {
              row.values.power = getPowerForMachine(row.designation);
            }
            if (!row.values.power_factor) {
              row.values.power_factor = '0.75';
            }
            if (!row.values.range_value) {
              row.values.range_value = '6.8';
            }
          }
        });

        table.markModified('columns');
        table.markModified('rows');
        updated = true;
      }

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
