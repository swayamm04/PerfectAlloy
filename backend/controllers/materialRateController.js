const MaterialRate = require('../models/MaterialRate');

const DEFAULT_COLUMNS = [
  { key: 'designation', name: 'Material Name', type: 'manual', formula: '', meta: '' },
  { key: 'rate_per_kg', name: 'Material Rate Per KG', type: 'manual', formula: '', meta: '' },
  { key: 'scrap_rate_per_kg', name: 'Scrap Material Rate Per KG', type: 'manual', formula: '', meta: '' },
];

const DEFAULT_ROWS = [
  { designation: 'PL 33 M10', values: { rate_per_kg: '243.47', scrap_rate_per_kg: '228.80' } },
  { designation: 'BM 33 10-1', values: { rate_per_kg: '243.47', scrap_rate_per_kg: '228.80' } },
  { designation: 'IDM 5391', values: { rate_per_kg: '243.47', scrap_rate_per_kg: '228.80' } },
  { designation: 'BWS 33016', values: { rate_per_kg: '243.47', scrap_rate_per_kg: '228.80' } },
  { designation: 'IDM 5414', values: { rate_per_kg: '103.32', scrap_rate_per_kg: '93.47' } },
  { designation: 'IDM 5325', values: { rate_per_kg: '0', scrap_rate_per_kg: '0' } },
  { designation: 'IDM5416', values: { rate_per_kg: '268.66', scrap_rate_per_kg: '229.02' } },
  { designation: 'BM 29-2', values: { rate_per_kg: '749.25', scrap_rate_per_kg: '729.30' } },
  { designation: 'BM 26-2', values: { rate_per_kg: '604.18', scrap_rate_per_kg: '583.00' } },
  { designation: 'BM 1.4057', values: { rate_per_kg: '126.80', scrap_rate_per_kg: '90.5' } },
  { designation: 'IDM 8413', values: { rate_per_kg: '4547.78', scrap_rate_per_kg: '4547.78' } },
  { designation: 'BWS 33009', values: { rate_per_kg: '247.22', scrap_rate_per_kg: '230.94' } },
  { designation: 'BWS 39004-2', values: { rate_per_kg: '415.98', scrap_rate_per_kg: '399.78' } },
  { designation: 'BWS 39004-3', values: { rate_per_kg: '502.20', scrap_rate_per_kg: '454.00' } },
  { designation: 'BWS 33017-1', values: { rate_per_kg: '272.21', scrap_rate_per_kg: '232.66' } },
  { designation: 'BM 23', values: { rate_per_kg: '268.66', scrap_rate_per_kg: '229.02' } },
  { designation: 'BWS 33012-1', values: { rate_per_kg: '766.10', scrap_rate_per_kg: '752' } },
  { designation: 'VBS 2419', values: { rate_per_kg: '762.70', scrap_rate_per_kg: '749.40' } },
  { designation: 'PL 33 MV', values: { rate_per_kg: '216.50', scrap_rate_per_kg: '202.50' } }
];

// @desc    Get all material rates (seeding if empty)
// @route   GET /api/material-rate
// @access  Private
const getMaterialRates = async (req, res) => {
  try {
    let rates = await MaterialRate.find({}).sort({ month: -1 });

    const today = new Date();
    const year = today.getFullYear();
    const monthNum = String(today.getMonth() + 1).padStart(2, '0');
    const currentMonth = `${year}-${monthNum}`;

    if (rates.length === 0) {
      const seeded = await MaterialRate.create({
        month: currentMonth,
        columns: DEFAULT_COLUMNS,
        rows: DEFAULT_ROWS
      });
      rates = [seeded];
    } else {
      const hasCurrentMonth = rates.some(r => r.month === currentMonth);
      if (!hasCurrentMonth) {
        const latest = rates[0]; // Sorted by month: -1
        let columns = DEFAULT_COLUMNS;
        let rows = DEFAULT_ROWS;

        if (latest) {
          columns = latest.columns;
          rows = latest.rows.map((row) => {
            const copiedValues = {};
            if (row.values) {
              row.values.forEach((v, k) => {
                copiedValues[k] = v;
              });
            }
            return {
              designation: row.designation,
              values: copiedValues
            };
          });
        }

        const newRate = await MaterialRate.create({
          month: currentMonth,
          columns,
          rows
        });
        rates.unshift(newRate);
      }
    }

    res.json(rates);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Update a specific month's material rates
// @route   PUT /api/material-rate/:month
// @access  Private/SuperAdmin
const updateMaterialRate = async (req, res) => {
  const { month } = req.params;
  const { columns, rows } = req.body;

  try {
    let rate = await MaterialRate.findOne({ month });

    if (!rate) {
      rate = new MaterialRate({
        month,
        columns,
        rows
      });
    } else {
      rate.columns = columns;
      rate.rows = rows;
    }

    const updated = await rate.save();
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Create new month material rate template (copying structure from latest, clearing numerical values)
// @route   POST /api/material-rate/new-month
// @access  Private/SuperAdmin
const createMonth = async (req, res) => {
  const { month } = req.body;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({ message: 'Valid month is required in YYYY-MM format' });
  }

  try {
    const existing = await MaterialRate.findOne({ month });
    if (existing) {
      return res.status(400).json({ message: 'Material Rate sheet for this month already exists' });
    }

    // Find the chronologically latest month to copy structural layout (columns, row names)
    const latest = await MaterialRate.findOne({}).sort({ month: -1 });
    
    let columns = DEFAULT_COLUMNS;
    let rows = DEFAULT_ROWS;

    if (latest) {
      columns = latest.columns;
      // Copy rows but clear out numerical value maps
      rows = latest.rows.map((row) => {
        const clearedValues = {};
        // Preserve designation but reset all other values to 0 or empty string
        if (row.values) {
          row.values.forEach((v, k) => {
            clearedValues[k] = '0';
          });
        }
        return {
          designation: row.designation,
          values: clearedValues
        };
      });
    }

    const newRate = await MaterialRate.create({
      month,
      columns,
      rows
    });

    res.status(201).json(newRate);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Delete a specific month's material rates
// @route   DELETE /api/material-rate/:month
// @access  Private/SuperAdmin
const deleteMaterialRate = async (req, res) => {
  const { month } = req.params;
  try {
    const result = await MaterialRate.deleteOne({ month });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Material rate sheet not found for this month' });
    }
    res.json({ message: `Material rate sheet for ${month} removed` });
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

module.exports = {
  getMaterialRates,
  updateMaterialRate,
  createMonth,
  deleteMaterialRate
};
