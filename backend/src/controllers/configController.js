const configDao = require('../dao/configDao');

// 获取单个配置项 GET /api/system/config/:key
const getConfig = async (req, res) => {
  try {
    const config = await configDao.findOne(req.params.key);
    if (!config) {
      return res.status(404).json({ success: false, message: '配置项不存在' });
    }
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('获取配置失败:', error);
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
};

// 获取所有配置 GET /api/system/config
const getAllConfigs = async (req, res) => {
  try {
    const configs = await configDao.findAll();
    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('获取所有配置失败:', error);
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
};

// 更新配置 PUT /api/system/config/:key
const updateConfig = async (req, res) => {
  try {
    const { value, description } = req.body;
    if (value === undefined) {
      return res.status(400).json({ success: false, message: '请提供配置值' });
    }
    await configDao.upsert(null, req.params.key, String(value), req.user.id, description || null);
    res.json({ success: true, message: '配置更新成功' });
  } catch (error) {
    console.error('更新配置失败:', error);
    res.status(500).json({ success: false, message: '更新配置失败' });
  }
};

module.exports = {
  getConfig,
  getAllConfigs,
  updateConfig
};
