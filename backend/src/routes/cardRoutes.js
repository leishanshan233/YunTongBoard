const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();
const cardController = require('../controllers/cardController');
const { authMiddleware, adminMiddleware } = require('../middlewares/auth');
require('dotenv').config();

// 上传目录使用绝对路径，避免 Tomcat 临时目录问题
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760')
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的文件类型'));
    }
  }
});

// 上传流转卡：需登录（PDA 操作员可上传）
router.post('/upload', authMiddleware, upload.single('image'), cardController.uploadCard);

// 以下接口均需登录
router.use(authMiddleware);
router.get('/', cardController.getCards);
router.get('/history', cardController.getCardHistory);
router.get('/:id', cardController.getCardById);
router.post('/:id/confirm', cardController.confirmCard);

// 取消流转卡：仅管理员（异常处理，与强制清空一致）
router.use(adminMiddleware);
router.delete('/:id', cardController.cancelCard);
// 移动流转卡到另一个料罐：仅管理员
router.post('/:id/move', cardController.moveCard);

module.exports = router;
