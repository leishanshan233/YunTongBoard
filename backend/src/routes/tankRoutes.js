const express = require('express');
const router = express.Router();
const tankController = require('../controllers/tankController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

// 三端都需要登录
router.use(authMiddleware);

// 已登录用户均可访问
router.get('/', tankController.getAllTanks);
router.get('/empty', tankController.getEmptyTanks);
router.get('/stats', tankController.getBoardStats);
router.get('/layout', tankController.getBoardLayout);
router.post('/layout', tankController.updateBoardLayout);
router.get('/:id', tankController.getTankById);

// 需要管理员权限
router.use(adminMiddleware);
router.post('/', tankController.createTank);
router.put('/batch-position', tankController.batchUpdatePositions);
router.put('/:id', tankController.updateTank);
router.delete('/:id', tankController.deleteTank);
router.post('/:id/clear', tankController.forceClearTank);

module.exports = router;
