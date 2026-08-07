const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

// 公开接口：获取单个配置项（看板需要读取超时配置，无需登录）
router.get('/config/:key', configController.getConfig);

// 需要登录
router.use(authMiddleware);
router.get('/config', configController.getAllConfigs);

// 需要管理员权限
router.use(adminMiddleware);
router.put('/config/:key', configController.updateConfig);

module.exports = router;
