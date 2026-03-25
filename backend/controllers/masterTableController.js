const MasterTable = require('../models/MasterTable');
const MasterTableRow = require('../models/MasterTableRow');
const Department = require('../models/Department');

// @desc    Create a new master table
// @route   POST /api/master-tables
// @access  Private/SuperAdmin
const createMasterTable = async (req, res) => {
  const { name, departments } = req.body;

  try {
    const masterTable = await MasterTable.create({
      name,
      departments,
      createdBy: req.user._id,
    });

    res.status(201).json(masterTable);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get all master tables
// @route   GET /api/master-tables
// @access  Private/Admin
const getMasterTables = async (req, res) => {
  try {
    const masterTables = await MasterTable.find({}).populate('departments', 'name');
    res.json(masterTables);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Get master table by ID (with rows)
// @route   GET /api/master-tables/:id
// @access  Private/Admin
const getMasterTableById = async (req, res) => {
  try {
    const masterTable = await MasterTable.findById(req.params.id).populate('departments', 'name');

    if (masterTable) {
      const rows = await MasterTableRow.find({ tableId: req.params.id });
      res.json({ masterTable, rows });
    } else {
      res.status(404).json({ message: 'Table not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a master table
// @route   DELETE /api/master-tables/:id
// @access  Private/SuperAdmin
const deleteMasterTable = async (req, res) => {
  try {
    const masterTable = await MasterTable.findById(req.params.id);

    if (masterTable) {
      await MasterTableRow.deleteMany({ tableId: req.params.id });
      await masterTable.deleteOne();
      res.json({ message: 'Table and its data removed' });
    } else {
      res.status(404).json({ message: 'Table not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add a row to a master table
// @route   POST /api/master-tables/:id/rows
// @access  Private/Admin
const createMasterTableRow = async (req, res) => {
  const { partNumber } = req.body;

  try {
    const row = await MasterTableRow.create({
      tableId: req.params.id,
      partNumber,
      statusValues: {}, // Initially empty
    });

    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a row in a master table
// @route   PUT /api/master-tables/rows/:rowId
// @access  Private/Admin
const updateMasterTableRow = async (req, res) => {
  const { partNumber, statusValues } = req.body;

  try {
    const row = await MasterTableRow.findById(req.params.rowId);

    if (row) {
      row.partNumber = partNumber || row.partNumber;
      if (statusValues) {
        // Since it's a Map, merge or replace
        row.statusValues = statusValues;
      }

      const updatedRow = await row.save();
      res.json(updatedRow);
    } else {
      res.status(404).json({ message: 'Row not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a row
// @route   DELETE /api/master-tables/rows/:rowId
// @access  Private/Admin
const deleteMasterTableRow = async (req, res) => {
  try {
    const row = await MasterTableRow.findById(req.params.rowId);

    if (row) {
      await row.deleteOne();
      res.json({ message: 'Row removed' });
    } else {
      res.status(404).json({ message: 'Row not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  createMasterTable,
  getMasterTables,
  getMasterTableById,
  deleteMasterTable,
  createMasterTableRow,
  updateMasterTableRow,
  deleteMasterTableRow,
};
