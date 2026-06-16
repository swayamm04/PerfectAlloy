const MachineHourRate = require('../models/MachineHourRate');
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


const DEFAULT_SEEDS = [
  {
    machine: 'Annealing',
    values: {
      operator_alloc: '0.5',
      online_inspect_alloc: '0',
      supervisor_alloc: '0',
      plant_manager_alloc: '0',
      power_alloc: '18 KW',
      power_cost: '11.475',
      consumables_cost: '1.0',
      maintenance_cost: '1.0',
      rent_cost: '1.0',
      wiring_cost: '0.0',
      utilisation_factor: '90'
    }
  },
  {
    machine: 'CNC',
    values: {
      operator_alloc: '0.5',
      online_inspect_alloc: '10',
      supervisor_alloc: '20',
      plant_manager_alloc: '40',
      power_alloc: '11 KW',
      power_cost: '26.4',
      consumables_cost: '3.2',
      maintenance_cost: '2.0',
      rent_cost: '1.0',
      wiring_cost: '1.0',
      utilisation_factor: '81'
    }
  },
  {
    machine: 'VMC',
    values: {
      operator_alloc: '0.5',
      online_inspect_alloc: '10',
      supervisor_alloc: '25',
      plant_manager_alloc: '50',
      power_alloc: '15 KW',
      power_cost: '36.0',
      consumables_cost: '3.2',
      maintenance_cost: '8.0',
      rent_cost: '3.0',
      wiring_cost: '1.0',
      utilisation_factor: '81'
    }
  },
  {
    machine: 'Metrology',
    values: {
      operator_alloc: '1',
      online_inspect_alloc: '0',
      supervisor_alloc: '0',
      plant_manager_alloc: '0',
      power_alloc: '5 KW',
      power_cost: '17.0',
      consumables_cost: '1.0',
      maintenance_cost: '0.0',
      rent_cost: '2.0',
      wiring_cost: '1.0',
      utilisation_factor: '90'
    }
  },
  {
    machine: 'Grinding GCL 100',
    values: {
      operator_alloc: '2',
      online_inspect_alloc: '0',
      supervisor_alloc: '0',
      plant_manager_alloc: '0',
      power_alloc: '20 KW',
      power_cost: '34.0',
      consumables_cost: '1.5',
      maintenance_cost: '1.0',
      rent_cost: '1.0',
      wiring_cost: '0.0',
      utilisation_factor: '90'
    }
  },
  {
    machine: 'Manual Lathe',
    values: {
      operator_alloc: '1',
      online_inspect_alloc: '10',
      supervisor_alloc: '20',
      plant_manager_alloc: '40',
      power_alloc: '11 KW',
      power_cost: '22.4',
      consumables_cost: '1.0',
      maintenance_cost: '2.0',
      rent_cost: '1.0',
      wiring_cost: '1.0',
      utilisation_factor: '81'
    }
  },
  {
    machine: 'Vibrofinishing',
    values: {
      operator_alloc: '0.5',
      online_inspect_alloc: '0',
      supervisor_alloc: '0',
      plant_manager_alloc: '0',
      power_alloc: '6 KW',
      power_cost: '12.2',
      consumables_cost: '1.0',
      maintenance_cost: '0.0',
      rent_cost: '1.0',
      wiring_cost: '1.0',
      utilisation_factor: '81'
    }
  },
  {
    machine: 'Ultrasonic Cleaning',
    values: {
      operator_alloc: '0.5',
      online_inspect_alloc: '0',
      supervisor_alloc: '0',
      plant_manager_alloc: '40',
      power_alloc: '10 KW',
      power_cost: '24.0',
      consumables_cost: '32.1',
      maintenance_cost: '1.6',
      rent_cost: '1.0',
      wiring_cost: '1.0',
      utilisation_factor: '81'
    }
  },
  {
    machine: 'Laser Marking',
    values: {
      operator_alloc: '1',
      online_inspect_alloc: '0',
      supervisor_alloc: '0',
      plant_manager_alloc: '0',
      power_alloc: '5 KW',
      power_cost: '17.0',
      consumables_cost: '1.0',
      maintenance_cost: '1.0',
      rent_cost: '1.0',
      wiring_cost: '0.0',
      utilisation_factor: '90'
    }
  },
  {
    machine: 'Muratec',
    values: {
      operator_alloc: '0.5',
      online_inspect_alloc: '10',
      supervisor_alloc: '20',
      plant_manager_alloc: '40',
      power_alloc: '40 KW',
      power_cost: '96.0',
      consumables_cost: '5.0',
      maintenance_cost: '8.0',
      rent_cost: '1.0',
      wiring_cost: '1.0',
      utilisation_factor: '81'
    }
  },
  {
    machine: 'Paragan Grinding',
    values: {
      operator_alloc: '2',
      online_inspect_alloc: '0',
      supervisor_alloc: '0',
      plant_manager_alloc: '0',
      power_alloc: '40 KW',
      power_cost: '96.0',
      consumables_cost: '5.0',
      maintenance_cost: '0.0',
      rent_cost: '1.0',
      wiring_cost: '1.0',
      utilisation_factor: '81'
    }
  },
  {
    machine: 'Grinding CLG 5020 cnc with auto load',
    values: {
      operator_alloc: '2',
      online_inspect_alloc: '0',
      supervisor_alloc: '0',
      plant_manager_alloc: '0',
      power_alloc: '40 KW',
      power_cost: '96.0',
      consumables_cost: '5.0',
      maintenance_cost: '5.0',
      rent_cost: '1.0',
      wiring_cost: '1.0',
      utilisation_factor: '81'
    }
  }
];

// @desc    Get all machine hour rates
// @route   GET /api/machine-hour-rate
// @access  Private
const getMachineHourRates = async (req, res) => {
  try {
    let eqTable = await EquipmentTable.findOne({});
    if (!eqTable) {
      eqTable = await EquipmentTable.create({
        columns: DEFAULT_COLUMNS,
        rows: DEFAULT_ROWS,
      });
    }
    const eqMachines = eqTable.rows.map(r => r.designation);

    let rates = await MachineHourRate.find({});

    // If both are empty (or equipment table is empty), seed with defaults
    if (eqMachines.length === 0) {
      if (rates.length === 0) {
        rates = await MachineHourRate.create(DEFAULT_SEEDS);
      }
      return res.json(rates);
    }

    // Align rates with the equipment table designations
    const ratesMap = new Map(rates.map(r => [r.machine.toLowerCase(), r]));
    const syncedRates = [];
    const createdRates = [];

    for (const machineName of eqMachines) {
      const existingRate = ratesMap.get(machineName.toLowerCase());
      if (existingRate) {
        // If casing is different, update machine name to match designation casing exactly
        if (existingRate.machine !== machineName) {
          existingRate.machine = machineName;
          await existingRate.save();
        }
        syncedRates.push(existingRate);
      } else {
        // Create new rate entry
        // Look up in DEFAULT_SEEDS (case-insensitive)
        const seed = DEFAULT_SEEDS.find(s => s.machine.toLowerCase() === machineName.toLowerCase());
        const newRateValues = seed ? seed.values : {
          operator_alloc: '0',
          online_inspect_alloc: '0',
          supervisor_alloc: '0',
          plant_manager_alloc: '0',
          power_alloc: '0 KW',
          power_cost: '0',
          consumables_cost: '0',
          maintenance_cost: '0',
          rent_cost: '0',
          wiring_cost: '0',
          utilisation_factor: '100'
        };

        const newRate = new MachineHourRate({
          machine: machineName,
          values: newRateValues
        });
        createdRates.push(newRate);
        syncedRates.push(newRate);
      }
    }

    // Save newly created rates in bulk
    if (createdRates.length > 0) {
      await MachineHourRate.insertMany(createdRates);
    }

    // Clean up rates for machines that no longer exist in the equipment table
    const eqMachinesLower = new Set(eqMachines.map(m => m.toLowerCase()));
    const obsoleteRates = rates.filter(r => !eqMachinesLower.has(r.machine.toLowerCase()));
    if (obsoleteRates.length > 0) {
      const obsoleteIds = obsoleteRates.map(r => r._id);
      await MachineHourRate.deleteMany({ _id: { $in: obsoleteIds } });
    }

    res.json(syncedRates);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Update a specific machine hour rate or multiple machine rates
// @route   PUT /api/machine-hour-rate
// @access  Private/SuperAdmin
const updateMachineHourRate = async (req, res) => {
  const { machine, values } = req.body;
  try {
    let rate = await MachineHourRate.findOne({ machine });
    if (!rate) {
      rate = new MachineHourRate({ machine, values });
    } else {
      rate.values = values;
    }
    const updatedRate = await rate.save();
    res.json(updatedRate);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Reset all machine hour rates to default seeds
// @route   POST /api/machine-hour-rate/reset
// @access  Private/SuperAdmin
const resetMachineHourRates = async (req, res) => {
  try {
    await MachineHourRate.deleteMany({});
    
    let eqTable = await EquipmentTable.findOne({});
    if (!eqTable) {
      eqTable = await EquipmentTable.create({
        columns: DEFAULT_COLUMNS,
        rows: DEFAULT_ROWS,
      });
    }
    const eqMachines = eqTable.rows.map(r => r.designation);

    if (eqMachines.length === 0) {
      const seededRates = await MachineHourRate.create(DEFAULT_SEEDS);
      return res.json(seededRates);
    }

    const seedsToCreate = eqMachines.map(machineName => {
      const seed = DEFAULT_SEEDS.find(s => s.machine.toLowerCase() === machineName.toLowerCase());
      return {
        machine: machineName,
        values: seed ? seed.values : {
          operator_alloc: '0',
          online_inspect_alloc: '0',
          supervisor_alloc: '0',
          plant_manager_alloc: '0',
          power_alloc: '0 KW',
          power_cost: '0',
          consumables_cost: '0',
          maintenance_cost: '0',
          rent_cost: '0',
          wiring_cost: '0',
          utilisation_factor: '100'
        }
      };
    });

    const seededRates = await MachineHourRate.create(seedsToCreate);
    res.json(seededRates);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

module.exports = {
  getMachineHourRates,
  updateMachineHourRate,
  resetMachineHourRates,
};
