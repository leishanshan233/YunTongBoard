const logDao = require('../dao/logDao');

const getOperationLogs = async (req, res) => {
  try {
    const data = await logDao.findList(req.query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取操作日志失败:', error);
    res.status(500).json({ success: false, message: '获取操作日志失败' });
  }
};

const getActionTypes = async (req, res) => {
  try {
    const actions = await logDao.findActionTypes();
    res.json({ success: true, data: actions });
  } catch (error) {
    console.error('获取操作类型失败:', error);
    res.status(500).json({ success: false, message: '获取操作类型失败' });
  }
};

module.exports = { getOperationLogs, getActionTypes };
