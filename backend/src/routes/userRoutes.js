const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');

router.post('/login', userController.login);

router.use(authMiddleware);
router.get('/me', userController.getCurrentUser);
// 修改自己的密码（登录用户均可）
router.put('/me/password', userController.changePassword);

router.use(adminMiddleware);
router.get('/', userController.getUsers);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
