const configDao = require('../dao/configDao');

// 获取单个配置项 GET /api/system/config/:key?production_line_id=X
// 支持按生产线隔离：若 production_line_id 存在，则先查 {line_id}_{key}
const getConfig = async (req, res) => {
  try {
    const lineId = req.query.production_line_id;
    let key = req.params.key;
    let config = null;
    if (lineId) {
      // 先按生产线查，若无则回退到全局
      config = await configDao.findOne(`${lineId}_${key}`);
    }
    if (!config) {
      config = await configDao.findOne(key);
    }
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
// body 支持 production_line_id: 存在时 key 自动加前缀
const updateConfig = async (req, res) => {
  try {
    const { value, description, production_line_id } = req.body;
    if (value === undefined) {
      return res.status(400).json({ success: false, message: '请提供配置值' });
    }
    const key = production_line_id
      ? `${production_line_id}_${req.params.key}`
      : req.params.key;
    await configDao.upsert(null, key, String(value), req.user.id, description || null);
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
