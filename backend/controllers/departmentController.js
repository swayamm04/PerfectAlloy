const Department = require('../models/Department');
const User = require('../models/User');

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private/Admin
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find({});
    res.json(departments);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
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
