const Department = require('../models/Department');
const User = require('../models/User');

const FinalCostSheet = require('../models/FinalCostSheet');

const STATIC_PROCESSES = [
  'Annealing',
  'Heat Treatment',
  'CNC Turning 1st setup',
  'CNC Turning 2nd setup',
  'CNC Turning 3rd setup',
  'CNC Turning Muratec',
  'GCL 60 Centerless grinding',
  'Paragan Centerless grinding',
  'Vibrofinishing',
  'Metrology',
  'Ultrasonic cleaning',
  '100% Dimension inspection',
  'Marking',
  'Packing cost'
];

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private/Admin
const getDepartments = async (req, res) => {
  try {
    // 1. Gather all target names
    const targetNames = new Set(STATIC_PROCESSES);

    // 2. Fetch all final cost sheets to find custom columns
    const sheets = await FinalCostSheet.find({});
    for (const sheet of sheets) {
      if (sheet.customColumns && Array.isArray(sheet.customColumns)) {
        for (const col of sheet.customColumns) {
          // If it has cycle time or tooling, it is a process column
          if (col.hasCycleTime || col.hasTooling) {
            if (col.name) {
              targetNames.add(col.name.trim());
            }
          }
        }
      }
    }

    // 3. Sync targetNames with Department collection
    const existingDepts = await Department.find({});
    const existingNamesLower = new Set(existingDepts.map(d => d.name.toLowerCase().trim()));

    for (const name of targetNames) {
      const nameTrimmed = name.trim();
      if (!existingNamesLower.has(nameTrimmed.toLowerCase())) {
        await Department.create({
          name: nameTrimmed,
          description: 'Auto-extracted from Final Cost Sheet columns'
        });
      }
    }

    // 4. Return all departments
    const allDepartments = await Department.find({}).sort({ name: 1 });
    res.json(allDepartments);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Create a department
// @route   POST /api/departments
// @access  Private/SuperAdmin
const createDepartment = async (req, res) => {
  const { name, description } = req.body;

  try {
    const departmentExists = await Department.findOne({ name });

    if (departmentExists) {
      res.status(400).json({ message: 'Department already exists' });
      return;
    }

    const department = await Department.create({
      name,
      description,
    });

    if (department) {
      res.status(201).json(department);
    } else {
      res.status(400).json({ message: 'Invalid department data' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a department
// @route   DELETE /api/departments/:id
// @access  Private/SuperAdmin
const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (department) {
      // Check if any users are assigned to this department
      const usersInDepartment = await User.countDocuments({ department: req.params.id });
      if (usersInDepartment > 0) {
        res.status(400).json({ message: 'Cannot delete department with active users' });
        return;
      }

      await Department.deleteOne({ _id: department._id });
      res.json({ message: 'Department removed' });
    } else {
      res.status(404).json({ message: 'Department not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a department
// @route   PUT /api/departments/:id
// @access  Private/SuperAdmin
const updateDepartment = async (req, res) => {
  const { name, description } = req.body;

  try {
    const department = await Department.findById(req.params.id);

    if (department) {
      department.name = name || department.name;
      department.description = description || department.description;

      const updatedDepartment = await department.save();
      res.json(updatedDepartment);
    } else {
      res.status(404).json({ message: 'Department not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getDepartments,
  createDepartment,
  deleteDepartment,
  updateDepartment,
};
