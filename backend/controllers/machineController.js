const Machine = require('../models/Machine');

// @desc    Get all machines
// @route   GET /api/machines
// @access  Private/Admin
const getMachines = async (req, res) => {
  try {
    const machines = await Machine.find({});
    res.json(machines);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get a single machine by ID
// @route   GET /api/machines/:id
// @access  Private/Admin
const getMachineById = async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);
    if (machine) {
      res.json(machine);
    } else {
      res.status(404).json({ message: 'Machine not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a machine
// @route   POST /api/machines
// @access  Private/SuperAdmin
const createMachine = async (req, res) => {
  const { name, description } = req.body;

  try {
    const machineExists = await Machine.findOne({ name });

    if (machineExists) {
      res.status(400).json({ message: 'Machine already exists' });
      return;
    }

    const machine = await Machine.create({
      name,
      description,
      fields: [],
    });

    if (machine) {
      res.status(201).json(machine);
    } else {
      res.status(400).json({ message: 'Invalid machine data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a machine (including fields)
// @route   PUT /api/machines/:id
// @access  Private/SuperAdmin
const updateMachine = async (req, res) => {
  const { name, description, fields } = req.body;

  try {
    const machine = await Machine.findById(req.params.id);

    if (machine) {
      // If updating name, make sure it is unique
      if (name && name !== machine.name) {
        const nameExists = await Machine.findOne({ name });
        if (nameExists) {
          res.status(400).json({ message: 'Machine with this name already exists' });
          return;
        }
        machine.name = name;
      }

      if (description !== undefined) {
        machine.description = description;
      }

      if (fields !== undefined) {
        machine.fields = fields;
      }

      const updatedMachine = await machine.save();
      res.json(updatedMachine);
    } else {
      res.status(404).json({ message: 'Machine not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a machine
// @route   DELETE /api/machines/:id
// @access  Private/SuperAdmin
const deleteMachine = async (req, res) => {
  try {
    const machine = await Machine.findById(req.params.id);

    if (machine) {
      await Machine.deleteOne({ _id: machine._id });
      res.json({ message: 'Machine removed' });
    } else {
      res.status(404).json({ message: 'Machine not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all unique labels from all machines
// @route   GET /api/machines/unique-labels
// @access  Private/Admin
const getUniqueLabels = async (req, res) => {
  try {
    const labels = await Machine.distinct('fields.label');
    res.json(labels);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getMachines,
  getMachineById,
  createMachine,
  updateMachine,
  deleteMachine,
  getUniqueLabels,
};
