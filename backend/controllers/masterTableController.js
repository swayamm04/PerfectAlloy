const MasterTable = require('../models/MasterTable');
const MasterTableRow = require('../models/MasterTableRow');
const Department = require('../models/Department');
const Notification = require('../models/Notification');

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
  const { partName, partNumber, material, selectedLoop } = req.body;

  try {
    const row = await MasterTableRow.create({
      tableId: req.params.id,
      partName,
      partNumber,
      selectedLoop: selectedLoop || [],
      stages: selectedLoop ? selectedLoop.map(() => ({})) : [],
    });

    // Notify the first department in the loop
    if (selectedLoop && selectedLoop.length > 0) {
      const firstDeptId = selectedLoop[0];
      await Notification.create({
        departmentId: firstDeptId,
        message: `New part ${partNumber} created for ${row.partName || 'Unknown'}. Please initialize data.`,
        type: 'task_assigned',
        link: `/task-queue`,
      });
    }

    res.status(201).json(row);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a row in a master table
// @route   PUT /api/master-tables/rows/:rowId
// @access  Private/Admin
const updateMasterTableRow = async (req, res) => {
  const { partName, partNumber, material, selectedLoop, statusValues } = req.body;

  try {
    const row = await MasterTableRow.findById(req.params.rowId);

    if (row) {
      row.partName = partName !== undefined ? partName : row.partName;
      row.partNumber = partNumber || row.partNumber;
      row.material = material !== undefined ? material : row.material;
      if (selectedLoop) {
        row.selectedLoop = selectedLoop;
        
        // Sync stages array length with the new loop length
        while (row.stages.length < selectedLoop.length) {
          row.stages.push({
            inward: { qty: 0, notes: "" },
            outward: { qty: 0, notes: "", isCompleted: false },
            process: { notes: "" }
          });
        }
        
        // If the loop is shortened, we trim the stages to maintain consistency
        if (row.stages.length > selectedLoop.length) {
          row.stages = row.stages.slice(0, selectedLoop.length);
        }

        // Adjust currentDepartmentIndex if it's now out of bounds
        if (row.currentDepartmentIndex >= selectedLoop.length) {
          row.currentDepartmentIndex = Math.max(0, selectedLoop.length - 1);
        }
        
        row.markModified('stages');
      }

      if (statusValues) {
        // Super Admin can edit/delete stage data ONLY IF it has been previously entered.
        // statusValues can be:
        // 1. An object with index keys: { "0": 50, "2": 45 }
        // 2. An object with deptId keys (deprecated/ambiguous): { deptId: 50 }
        
        Object.entries(statusValues).forEach(([key, value]) => {
          const index = parseInt(key);
          const val = Number(value);
          
          if (!isNaN(index) && row.stages[index]) {
            // Index-based update (preferred for sequential)
            const stage = row.stages[index];
            if (stage.inward && stage.inward.receivedAt) {
              stage.outward = { 
                ...stage.outward, 
                qty: val,
                isCompleted: true,
                sentAt: stage.outward?.sentAt || new Date()
              };
            }
          } else {
            // Fallback for department-based update (updates first match)
            const firstIndex = row.selectedLoop.findIndex(d => d.toString() === key);
            if (firstIndex !== -1 && row.stages[firstIndex]) {
              const stage = row.stages[firstIndex];
              if (stage.inward && stage.inward.receivedAt) {
                stage.outward = { 
                  ...stage.outward, 
                  qty: val,
                  isCompleted: true,
                  sentAt: stage.outward?.sentAt || new Date()
                };
              }
            }
          }
        });
        row.markModified('stages');
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

// @desc    Update a master table
// @route   PUT /api/master-tables/:id
// @access  Private/SuperAdmin
const updateMasterTable = async (req, res) => {
  const { name, departments } = req.body;

  try {
    const masterTable = await MasterTable.findById(req.params.id);

    if (masterTable) {
      masterTable.name = name || masterTable.name;
      masterTable.departments = departments || masterTable.departments;

      const updatedMasterTable = await masterTable.save();
      // Populate departments before sending back
      const populatedTable = await updatedMasterTable.populate('departments', 'name');
      res.json(populatedTable);
    } else {
      res.status(404).json({ message: 'Table not found' });
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
  updateMasterTable,
  createMasterTableRow,
  updateMasterTableRow,
  deleteMasterTableRow,
};
