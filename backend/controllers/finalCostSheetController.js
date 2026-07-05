const FinalCostSheet = require('../models/FinalCostSheet');
const MaterialRate = require('../models/MaterialRate');

const DEFAULT_ROWS = [
  {
    partName: 'BUSH',
    partNumber: '5900 130 054',
    materialName: 'BWS 33009',
    values: {
      rough_casting_weight: '1.029',
      finish_weight: '0.006',
      semi_machining_cost: '9.00',
      selling_price: '41.88',
      annealing_cycle_time: '0',
      heat_treatment_cycle_time: '0',
      cnc_turning_1st_setup_cycle_time: '29',
      cnc_turning_1st_setup_tooling_cost: '0.21',
      cnc_turning_2nd_setup_cycle_time: '48',
      cnc_turning_2nd_setup_tooling_cost: '0.51',
      cnc_turning_3rd_setup_cycle_time: '0',
      cnc_turning_3rd_setup_tooling_cost: '0',
      cnc_turning_muratec_cycle_time: '0',
      cnc_turning_muratec_tooling_cost: '0',
      gcl_60_centerless_grinding_cycle_time: '2',
      gcl_60_centerless_grinding_tooling_cost: '0.4',
      paragan_centerless_grinding_cycle_time: '1.5',
      paragan_centerless_grinding_tooling_cost: '0.33',
      vibrofinishing_cycle_time: '0',
      vibrofinishing_tooling_cost: '0',
      metrology_cycle_time: '220',
      metrology_production_quantity: '1000',
      metrology_cost: '18.41',
      ultrasonic_cleaning_cycle_time: '12',
      ultrasonic_cleaning_tooling_cost: '0',
      '100_dimension_inspection_cycle_time': '15.4',
      marking_cycle_time: '0',
      packing_cost_cycle_time: '6.3',
      packing_cost_packing_material_cost: '0.42',
    }
  }
];

// @desc    Get all final cost sheets (seeding if empty)
// @route   GET /api/final-cost-sheet
// @access  Private
const getFinalCostSheets = async (req, res) => {
  try {
    let sheets = await FinalCostSheet.find({}).sort({ month: -1 });
    const materialRates = await MaterialRate.find({}).sort({ month: -1 });

    const today = new Date();
    const year = today.getFullYear();
    const monthNum = String(today.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}-${monthNum}`;

    // Collect all months that should exist in final cost sheets
    const targetMonths = new Set(materialRates.map(r => r.month));
    targetMonths.add(currentMonth);

    let changed = false;

    if (sheets.length === 0) {
      // Seed initial sheet for the current month
      const seeded = await FinalCostSheet.create({
        month: currentMonth,
        rows: DEFAULT_ROWS
      });
      sheets = [seeded];
      changed = true;
    }

    // Auto-create final cost sheets for any month configured in Material Rates
    for (const m of targetMonths) {
      const exists = sheets.some(s => s.month === m);
      if (!exists) {
        const latest = sheets.length > 0 ? sheets[0] : await FinalCostSheet.findOne({}).sort({ month: -1 });
        let rows = DEFAULT_ROWS;

        if (latest) {
          rows = latest.rows.map((row) => {
            const copiedValues = {};
            if (row.values) {
              row.values.forEach((v, k) => {
                copiedValues[k] = v;
              });
            }
            return {
              partName: row.partName,
              partNumber: row.partNumber,
              materialName: row.materialName,
              selectedLoop: row.selectedLoop || [],
              values: copiedValues
            };
          });
        }

        const newSheet = await FinalCostSheet.create({
          month: m,
          rows,
          customColumns: latest ? (latest.customColumns || []) : []
        });
        sheets.push(newSheet);
        changed = true;
      }
    }

    if (changed) {
      sheets.sort((a, b) => b.month.localeCompare(a.month));
    }

    res.json(sheets);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Update a specific month's final cost sheet
// @route   PUT /api/final-cost-sheet/:month
// @access  Private/SuperAdmin
const updateFinalCostSheet = async (req, res) => {
  const { month } = req.params;
  const { rows, customColumns } = req.body;

  try {
    let sheet = await FinalCostSheet.findOne({ month });

    if (!sheet) {
      sheet = new FinalCostSheet({
        month,
        rows,
        customColumns: customColumns || []
      });
    } else {
      sheet.rows = rows;
      if (customColumns !== undefined) {
        sheet.customColumns = customColumns;
        sheet.markModified('customColumns');
      }
    }

    const updated = await sheet.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Create new month final cost sheet (copying parts/weights structure from latest, clearing cycle times)
// @route   POST /api/final-cost-sheet/new-month
// @access  Private/SuperAdmin
const createMonth = async (req, res) => {
  const { month } = req.body;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ message: 'Valid month is required in YYYY-MM format' });
  }

  try {
    const existing = await FinalCostSheet.findOne({ month });
    if (existing) {
      return res.status(400).json({ message: 'Final Cost Sheet for this month already exists' });
    }

    const latest = await FinalCostSheet.findOne({}).sort({ month: -1 });
    
    let rows = DEFAULT_ROWS;

    if (latest) {
      rows = latest.rows.map((row) => {
        const clearedValues = {};
        
        // Preserve weights, material name, selling price, but clear cycle times and tooling costs
        if (row.values) {
          row.values.forEach((v, k) => {
            if (
              k === 'rough_casting_weight' ||
              k === 'finish_weight' ||
              k === 'semi_machining_cost' ||
              k === 'selling_price'
            ) {
              clearedValues[k] = v;
            } else if (k === 'metrology_production_quantity') {
              clearedValues[k] = '1000'; // Default quantity
            } else {
              clearedValues[k] = '0';
            }
          });
        }
        
        return {
          partName: row.partName,
          partNumber: row.partNumber,
          materialName: row.materialName,
          values: clearedValues
        };
      });
    }

    const newSheet = await FinalCostSheet.create({
      month,
      rows,
      customColumns: latest ? (latest.customColumns || []) : []
    });

    res.status(201).json(newSheet);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Delete a specific month's final cost sheet
// @route   DELETE /api/final-cost-sheet/:month
// @access  Private/SuperAdmin
const deleteFinalCostSheet = async (req, res) => {
  const { month } = req.params;
  try {
    const result = await FinalCostSheet.deleteOne({ month });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Final cost sheet not found for this month' });
    }
    res.json({ message: `Final cost sheet for ${month} removed` });
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

module.exports = {
  getFinalCostSheets,
  updateFinalCostSheet,
  createMonth,
  deleteFinalCostSheet
};
