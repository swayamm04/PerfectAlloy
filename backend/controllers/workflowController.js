const MasterTableRow = require('../models/MasterTableRow');
const MasterTable = require('../models/MasterTable');
const Notification = require('../models/Notification');
const User = require('../models/User');

// @desc    Get rows currently at my department
// @route   GET /api/workflow/queue
// @access  Private/Admin
const getTaskQueue = async (req, res) => {
  try {
    const { departmentId, startDate, endDate } = req.query;
    
    // Default to user's assigned department if not specified (for non-Super Admins or as default)
    let deptId = departmentId || req.user.department;

    if (!deptId) {
      if (req.user.role === 'super-admin') {
        // If super admin and no dept selected, return empty or all? 
        // User asked for a filter, so returning empty until selected is safer or just pick first.
        // For now, let's require selection for Super Admin.
        return res.json([]); 
      }
      return res.status(400).json({ message: 'Department assignment required' });
    }

    const deptIdStr = deptId.toString();

    // Find all rows where this department is in the loop (regardless of table-level department lists)
    const rows = await MasterTableRow.find({ selectedLoop: deptIdStr })
      .populate('tableId')
      .populate('selectedLoop');
    
    const filteredRows = rows.filter(row => {
      const loop = row.selectedLoop || [];

      // Special handling for blueprints: they only show up for the initial department in the loop
      if (row.isBlueprint) {
        const firstDeptIdObj = loop[0];
        const firstDeptIdStr = firstDeptIdObj?._id ? firstDeptIdObj._id.toString() : firstDeptIdObj?.toString();
        return firstDeptIdStr === deptIdStr;
      }

      const currentDeptIdObj = loop[row.currentDepartmentIndex];
      const currentDeptIdStr = currentDeptIdObj?._id ? currentDeptIdObj._id.toString() : currentDeptIdObj?.toString();
      const isCurrentlyAtThisDept = currentDeptIdStr === deptIdStr;

      // Check for any past completed stage for this department
      const hasPastStages = row.stages.some((stage, index) => {
        const loopDeptIdObj = loop[index];
        const loopDeptIdStr = loopDeptIdObj?._id ? loopDeptIdObj._id.toString() : loopDeptIdObj?.toString();
        return loopDeptIdStr === deptIdStr && stage.outward?.isCompleted;
      });

      // If date filters are provided, check if any stage was completed within the range
      if (startDate || endDate) {
        const matchesDate = row.stages.some((stage, index) => {
          if (loop[index]?.toString() === deptIdStr && stage.outward?.isCompleted && stage.outward.sentAt) {
            const sentAt = new Date(stage.outward.sentAt);
            const sDate = startDate ? new Date(startDate) : null;
            const eDate = endDate ? new Date(endDate) : null;
            if (sDate && !isNaN(sDate.getTime()) && sentAt < sDate) return false;
            if (eDate && !isNaN(eDate.getTime()) && sentAt > eDate) return false;
            return true;
          }
          return false;
        });
        return matchesDate;
      }

      return isCurrentlyAtThisDept || hasPastStages;
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

    const deptId = req.user.department?.toString();
    if (!deptId) return res.status(400).json({ message: 'User department not assigned' });

    // Verify it is this department's turn
    const loop = row.selectedLoop || [];
    const currentDeptIdInLoop = loop[row.currentDepartmentIndex];
    if (!currentDeptIdInLoop || currentDeptIdInLoop.toString() !== deptId) {
      return res.status(403).json({ message: "It is not your department's turn for this task" });
    }

    const stage = row.stages[row.currentDepartmentIndex];
    if (stage.inward && stage.inward.receivedAt) {
      return res.status(400).json({ message: 'Inward already accepted' });
    }

    stage.inward = {
      qty,
      receivedAt: new Date(),
      source: source || 'External',
    };
    stage.process = stage.process || {};
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

    const deptId = req.user.department?.toString();
    const currentDeptId = row.selectedLoop[row.currentDepartmentIndex];
    if (currentDeptId.toString() !== deptId) {
       return res.status(403).json({ message: "It is not your department's turn for this task" });
    }

    const stage = row.stages[row.currentDepartmentIndex];

    if (!stage || !stage.inward || !stage.inward.receivedAt) {
      return res.status(400).json({ message: 'Inward not yet accepted' });
    }
    if (stage.outward && stage.outward.isCompleted) {
      return res.status(403).json({ message: 'Cannot edit a completed stage' });
    }

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
  const { qty, rejectionQty, reason } = req.body;

  try {
    const row = await MasterTableRow.findById(req.params.rowId).populate('tableId');
    if (!row) return res.status(404).json({ message: 'Row not found' });

    const deptId = req.user.department?.toString();
    
    // Verify it is this department's turn
    const loop = row.selectedLoop || [];
    const currentDeptId = loop[row.currentDepartmentIndex];
    if (!currentDeptId || currentDeptId.toString() !== deptId) {
      return res.status(403).json({ message: "It is not your department's turn for this task" });
    }

    const stage = row.stages[row.currentDepartmentIndex];
    
    if (!stage || !stage.inward || !stage.inward.receivedAt) {
      return res.status(400).json({ message: 'Inward not yet accepted' });
    }
    if (stage.outward && stage.outward.isCompleted) {
      return res.status(400).json({ message: 'Stage is already completed' });
    }

    stage.outward = {
      qty,
      rejectionQty: rejectionQty || 0,
      reason: reason || "",
      sentAt: new Date(),
      isCompleted: true,
    };
    stage.process = stage.process || {};
    stage.process.status = 'Completed';

    // Move to next department in part's selected loop
    const nextIndex = row.currentDepartmentIndex + 1;
    
    if (nextIndex < loop.length) {
      row.currentDepartmentIndex = nextIndex;
      const nextDeptId = loop[nextIndex];

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
