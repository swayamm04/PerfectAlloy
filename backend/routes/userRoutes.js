const express = require('express');
const router = express.Router();
const { authUser, registerUser, getUsers, deleteUser, updateUserProfile, updateUser } = require('../controllers/userController');
const { protect, admin, superAdmin } = require('../middleware/authMiddleware');

router.post('/login', authUser);
router.route('/profile').get(protect, (req, res) => res.json(req.user)).put(protect, updateUserProfile);
router.route('/')
  .post(protect, superAdmin, registerUser)
  .get(protect, admin, getUsers);

router.route('/:id')
  .put(protect, superAdmin, updateUser)
  .delete(protect, superAdmin, deleteUser);

module.exports = router;
