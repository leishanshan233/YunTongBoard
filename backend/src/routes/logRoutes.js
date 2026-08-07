const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

router.use(authMiddleware, adminMiddleware);
router.get('/', logController.getOperationLogs);
router.get('/actions', logController.getActionTypes);

module.exports = router;
