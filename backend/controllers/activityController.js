const Activity = require('../models/Activity');

// @desc    Get all activity logs
// @route   GET /api/activities
// @access  Private/SuperAdmin
const getActivities = async (req, res) => {
  try {
    const { user, startDate, endDate } = req.query;
    
    const query = {};
    
    if (user && user !== 'all') {
      query.user = user;
    }
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.timestamp.$lte = end;
      }
    }
    
    const activities = await Activity.find(query)
      .populate('user', 'name email role')
      .sort({ timestamp: -1 })
      .limit(500); // Limit to last 500 for performance
      
    res.json(activities);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching activities', error: error.message });
  }
};

module.exports = { getActivities };
