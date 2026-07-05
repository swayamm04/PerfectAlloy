const User = require('../models/User');
const Department = require('../models/Department');
const generateToken = require('../config/generateToken');
const Product = require('../models/Product');
const Supplier = require('../models/Supplier');
const MasterTable = require('../models/MasterTable');
const MasterTableRow = require('../models/MasterTableRow');
const Notification = require('../models/Notification');
const Activity = require('../models/Activity');
const OperatorTable = require('../models/OperatorTable');
const EquipmentTable = require('../models/EquipmentTable');
const MachineHourRate = require('../models/MachineHourRate');

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const authUser = async (req, res) => {
  const { email, password, portal } = req.body;

  const user = await User.findOne({ email }).populate('department', 'name');

  if (user && (await user.matchPassword(password))) {
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      department: user.department,
      token: generateToken(user._id),
      module: portal === 'expenses' ? 'expenses' : 'admin',
    });
  } else {
    res.status(401).json({ message: 'Invalid email or password' });
  }
};

// @desc    Register a new user (By Super Admin)
// @route   POST /api/users
// @access  Private/SuperAdmin
const registerUser = async (req, res) => {
  const { name, email, password, role, department } = req.body;

  const userExists = await User.findOne({ email });

  if (userExists) {
    res.status(400).json({ message: 'User already exists' });
    return;
  }

  const user = await User.create({
    name,
    email,
    password,
    role: role || 'admin',
    isAdmin: true,
    department,
  });

  if (user) {
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin,
      department: user.department,
    });
  } else {
    res.status(400).json({ message: 'Invalid user data' });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  const users = await User.find({}).select('-password').populate('department', 'name text');
  res.json(users);
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/SuperAdmin
const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    if (user.role === 'super-admin') {
      res.status(400).json({ message: 'Cannot delete Super Admin' });
      return;
    }
    req.deletedUserName = user.name;
    await User.deleteOne({ _id: user._id });
    res.json({ message: 'User removed' });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// @desc    Update user profile (Password)
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user) {
    if (req.body.password) {
      user.password = req.body.password;
    }

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      token: generateToken(updatedUser._id),
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// @desc    Update user (By Super Admin)
// @route   PUT /api/users/:id
// @access  Private/SuperAdmin
const updateUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (user) {
    user.name = req.body.name || user.name;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;
    user.department = req.body.department || user.department;

    const updatedUser = await user.save();

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      department: updatedUser.department,
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};

// @desc    Clear all business data except users and departments
// @route   POST /api/users/clear-business-data
// @access  Private/SuperAdmin
const clearBusinessData = async (req, res) => {
  try {
    await Product.deleteMany({});
    await Supplier.deleteMany({});
    await MasterTable.deleteMany({});
    await MasterTableRow.deleteMany({});
    await Notification.deleteMany({});
    await Activity.deleteMany({});
    await OperatorTable.deleteMany({});
    await EquipmentTable.deleteMany({});
    await MachineHourRate.deleteMany({});

    res.json({ message: 'All business data cleared successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

module.exports = { 
  authUser, 
  registerUser, 
  getUsers, 
  deleteUser, 
  updateUserProfile, 
  updateUser,
  clearBusinessData
};
