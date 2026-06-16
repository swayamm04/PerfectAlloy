const SystemSetting = require('../models/SystemSetting');

// @desc    Get all system settings
// @route   GET /api/system-settings
// @access  Private
const getSystemSettings = async (req, res) => {
  try {
    const settings = await SystemSetting.find({});
    const settingsMap = {
      power_universal_value: '8', // default value
    };

    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    res.json(settingsMap);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

// @desc    Update or create system setting
// @route   PUT /api/system-settings
// @access  Private/SuperAdmin
const updateSystemSettings = async (req, res) => {
  const { key, value } = req.body;

  if (!key || value === undefined) {
    return res.status(400).json({ message: 'Key and value are required' });
  }

  try {
    let setting = await SystemSetting.findOne({ key });

    if (setting) {
      setting.value = String(value);
      await setting.save();
    } else {
      setting = await SystemSetting.create({
        key,
        value: String(value),
      });
    }

    // Return the updated settings map
    const settings = await SystemSetting.find({});
    const settingsMap = {
      power_universal_value: '8',
    };

    settings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });

    res.json(settingsMap);
  } catch (error) {
    res.status(500).json({ message: 'Server Error: ' + error.message });
  }
};

module.exports = {
  getSystemSettings,
  updateSystemSettings,
};
