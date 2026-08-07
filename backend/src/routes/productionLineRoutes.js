const express = require('express');
const router = express.Router();
const productionLineController = require('../controllers/productionLineController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

// 已登录用户均可查看生产线列表
router.use(authMiddleware);
router.get('/', productionLineController.getAllLines);
router.get('/:id', productionLineController.getLineById);

// 管理员专属：增删改
router.use(adminMiddleware);
router.post('/', productionLineController.createLine);
router.put('/:id', productionLineController.updateLine);
router.delete('/:id', productionLineController.deleteLine);

module.exports = router;
