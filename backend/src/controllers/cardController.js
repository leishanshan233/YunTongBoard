const tankDao = require('../dao/tankDao');
const cardDao = require('../dao/cardDao');
const logDao = require('../dao/logDao');
const { withTransaction } = require('../config/db');
const path = require('path');
const Jimp = require('jimp');

// 上传路径（与 app.js 静态服务一致）
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
// 缩略图最大宽度（看板网格清晰且轻量）
const THUMB_WIDTH = 480;
// 原图优化最大宽度（点击查看原图，避免动辄几 MB）
const ORIG_MAX_WIDTH = 1280;

/**
 * 图片优化：生成轻量缩略图 + 原图重压缩。
 * 失败不阻断上传，仅记录日志（保证业务可用）。
 * @returns {{ thumbnailName: string|null }}
 */
const optimizeImage = async (originalFile) => {
  let thumbnailName = null;
  try {
    const srcPath = originalFile.path;
    const ext = path.extname(originalFile.filename);
    const baseName = path.basename(originalFile.filename, ext);
    const thumbPath = path.join(UPLOAD_DIR, `${baseName}_thumb${ext}`);

    const image = await Jimp.read(srcPath);

    // 1) 原图重压缩：超过最大宽度才缩放（不放大），质量 85 —— 覆盖写回
    if (image.bitmap.width > ORIG_MAX_WIDTH) {
      image.resize(ORIG_MAX_WIDTH, Jimp.AUTO);
    }
    image.quality(85);
    await image.writeAsync(srcPath);

    // 2) 生成缩略图：按 480 宽等比缩放（不放大），质量 80
    const thumb = image.clone();
    if (thumb.bitmap.width > THUMB_WIDTH) {
      thumb.resize(THUMB_WIDTH, Jimp.AUTO);
    }
    thumb.quality(80);
    await thumb.writeAsync(thumbPath);

    thumbnailName = `${baseName}_thumb${ext}`;
  } catch (e) {
    console.error('图片优化失败（不阻断上传）:', e.message);
  }
  return { thumbnailName };
};

// 上传流转卡（事务：插入卡片 + 更新罐位 + 记录日志）
const uploadCard = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: '请上传照片' });
    }
    const { tank_id } = req.body;
    if (!tank_id) {
      return res.status(400).json({ success: false, message: '请选择料罐' });
    }

    const tank = await tankDao.findById(tank_id);
    if (!tank) {
      return res.status(404).json({ success: false, message: '料罐不存在' });
    }
    if (tank.status !== 'idle') {
      return res.status(400).json({ success: false, message: '该罐位已被占用' });
    }

    // 图片优化：生成缩略图 + 原图重压缩（失败不阻断）
    const { thumbnailName } = await optimizeImage(req.file);
    const imageUrl = `/uploads/${req.file.filename}`;
    const thumbnailUrl = thumbnailName ? `/uploads/${thumbnailName}` : null;

    const cardId = await withTransaction(async (conn) => {
      const id = await cardDao.create(conn, {
        tank_id: Number(tank_id),
        image_url: imageUrl,
        thumbnail_url: thumbnailUrl,
        created_user_id: req.user.id
      });
      await tankDao.updateStatus(conn, tank_id, 'pending', id);
      await logDao.create(conn, {
        created_user_id: req.user.id,
        action: 'upload',
        tank_id: tank.id,
        card_id: id,
        ip_address: req.ip
      });
      return id;
    });

    // WebSocket 推送
    const io = req.app.get('io');
    if (io) {
      io.emit('new_card_uploaded', {
        tank_id: tank.id,
        card: { id: cardId, image_url: imageUrl, thumbnail_url: thumbnailUrl },
        tank_status: 'pending'
      });
    }

    res.status(201).json({
      success: true,
      data: { id: cardId, tank_id: tank.id, image_url: imageUrl, thumbnail_url: thumbnailUrl, status: 'pending' }
    });
  } catch (error) {
    console.error('上传流转卡失败:', error);
    res.status(500).json({ success: false, message: '上传流转卡失败' });
  }
};

const getCards = async (req, res) => {
  try {
    const data = await cardDao.findList(req.query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取流转卡列表失败:', error);
    res.status(500).json({ success: false, message: '获取流转卡列表失败' });
  }
};

const getCardById = async (req, res) => {
  try {
    const card = await cardDao.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: '流转卡不存在' });
    }
    res.json({ success: true, data: card });
  } catch (error) {
    console.error('获取流转卡详情失败:', error);
    res.status(500).json({ success: false, message: '获取流转卡详情失败' });
  }
};

// 确认入库（事务：更新卡片 + 清空罐位 + 记录日志）
const confirmCard = async (req, res) => {
  try {
    const card = await cardDao.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: '流转卡不存在' });
    }
    if (card.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该卡已处理' });
    }

    await withTransaction(async (conn) => {
      await cardDao.updateStatus(conn, card.id, 'confirmed', req.user.id);
      await tankDao.updateStatus(conn, card.tank_id, 'idle', null);
      await logDao.create(conn, {
        created_user_id: req.user.id,
        action: 'confirm',
        tank_id: card.tank_id,
        card_id: card.id,
        ip_address: req.ip
      });
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('card_confirmed', {
        tank_id: card.tank_id,
        card_id: card.id,
        tank_status: 'idle'
      });
    }

    res.json({ success: true, message: '入库确认成功' });
  } catch (error) {
    console.error('确认入库失败:', error);
    res.status(500).json({ success: false, message: '确认入库失败' });
  }
};

// 取消流转卡（事务）
const cancelCard = async (req, res) => {
  try {
    const card = await cardDao.findById(req.params.id);
    if (!card) {
      return res.status(404).json({ success: false, message: '流转卡不存在' });
    }
    if (card.status !== 'pending') {
      return res.status(400).json({ success: false, message: '该卡已处理' });
    }

    await withTransaction(async (conn) => {
      await cardDao.updateStatus(conn, card.id, 'cancelled');
      await tankDao.updateStatus(conn, card.tank_id, 'idle', null);
      await logDao.create(conn, {
        created_user_id: req.user.id,
        action: 'cancel',
        tank_id: card.tank_id,
        card_id: card.id,
        ip_address: req.ip
      });
    });

    res.json({ success: true, message: '取消成功' });
  } catch (error) {
    console.error('取消流转卡失败:', error);
    res.status(500).json({ success: false, message: '取消流转卡失败' });
  }
};

const getCardHistory = async (req, res) => {
  try {
    const data = await cardDao.findList(req.query);
    res.json({ success: true, data });
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({ success: false, message: '获取历史记录失败' });
  }
};

module.exports = {
  uploadCard, getCards, getCardById, confirmCard, cancelCard, getCardHistory
};
