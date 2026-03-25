const MasterTableRow = require('../models/MasterTableRow');
const MasterTable = require('../models/MasterTable');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get rows currently at my department
// @route   GET /api/workflow/queue
// @access  Private/Admin
const getTaskQueue = async (req, res) => {
  try {
    const deptId = req.user.department;
    if (!deptId) {
      return res.status(400).json({ message: 'User is not assigned to a department' });
    }

    // Find all master tables to see where this department is in the sequence
    const allTables = await MasterTable.find({ departments: deptId });
    const tableIds = allTables.map(t => t._id);

    // Find rows for these tables where the currentDepartmentIndex points to this user's department
    // However, finding the index requires matching the deptId in the table.departments array
    // Let's simplify: Get all rows where the current department in their table's department list matches the user's dept.
    
    // We'll populate the table to iterate through the departments array
    const rows = await MasterTableRow.find({ tableId: { $in: tableIds } }).populate('tableId');
    
    constfilteredRows = rows.filter(row => {
      const table = row.tableId;
      const currentDeptId = table.departments[row.currentDepartmentIndex];
      return currentDeptId && currentDeptId.toString() === deptId.toString();
    });

    res.json(filteredRows);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Accept inward data
// @route   POST /api/workflow/accept/:rowId
// @access  Private/Admin
const acceptInward = async (req, res) => {
  const { qty, source } = req.body;

  try {
    const row = await MasterTableRow.findById(req.params.rowId);
    if (!row) return res.status(404).json({ message: 'Row not found' });

    const deptId = req.user.department.toString();
    
    // Initialize stage for this dept if not exists
    if (!row.stages.has(deptId)) {
      row.stages.set(deptId, { inward: {}, process: {}, outward: {} });
    }

    const stage = row.stages.get(deptId);
    stage.inward = {
      qty,
      receivedAt: new Date(),
      source: source || 'External',
    };
    stage.process.status = 'Processing';
    stage.process.updatedAt = new Date();

    row.markModified('stages');
    await row.save();

    res.json(row);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update process details
// @route   PUT /api/workflow/process/:rowId
// @access  Private/Admin
const updateProcess = async (req, res) => {
  const { status, notes } = req.body;

  try {
    const row = await MasterTableRow.findById(req.params.rowId);
    if (!row) return res.status(404).json({ message: 'Row not found' });

    const deptId = req.user.department.toString();
    const stage = row.stages.get(deptId);

    if (!stage) return res.status(400).json({ message: 'Stage not initialized for this department' });

    stage.process.status = status || stage.process.status;
    stage.process.notes = notes || stage.process.notes;
    stage.process.updatedAt = new Date();

    row.markModified('stages');
    await row.save();

    res.json(row);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Record outward and move to next department
// @route   POST /api/workflow/outward/:rowId
// @access  Private/Admin
const completeOutward = async (req, res) => {
  const { qty } = req.body;

  try {
    const row = await MasterTableRow.findById(req.params.rowId).populate('tableId');
    if (!row) return res.status(404).json({ message: 'Row not found' });

    const deptId = req.user.department.toString();
    const stage = row.stages.get(deptId);

    if (!stage) return res.status(400).json({ message: 'Stage not initialized' });

    stage.outward = {
      qty,
      sentAt: new Date(),
      isCompleted: true,
    };
    stage.process.status = 'Completed';

    // Move to next department in table sequence
    const table = row.tableId;
    const nextIndex = row.currentDepartmentIndex + 1;
    
    if (nextIndex < table.departments.length) {
      row.currentDepartmentIndex = nextIndex;
      const nextDeptId = table.departments[nextIndex];

      // Notify users of the next department
      await Notification.create({
        departmentId: nextDeptId,
        message: `New task for ${row.partNumber} received from ${req.user.name}`,
        type: 'task_assigned',
        link: `/task-queue`,
      });
    }

    row.markModified('stages');
    await row.save();

    res.json(row);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getTaskQueue,
  acceptInward,
  updateProcess,
  completeOutward,
};
