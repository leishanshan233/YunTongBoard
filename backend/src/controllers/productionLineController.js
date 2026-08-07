const productionLineDao = require('../dao/productionLineDao');
const { withTransaction } = require('../config/db');

// 获取所有生产线（不分页，PDA/看板/后台都需要）
const getAllLines = async (req, res) => {
  try {
    const lines = await productionLineDao.findAll();
    res.json({ success: true, data: lines });
  } catch (error) {
    console.error('获取生产线列表失败:', error);
    res.status(500).json({ success: false, message: '获取生产线列表失败' });
  }
};

// 获取单个生产线
const getLineById = async (req, res) => {
  try {
    const line = await productionLineDao.findById(req.params.id);
    if (!line) {
      return res.status(404).json({ success: false, message: '生产线不存在' });
    }
    res.json({ success: true, data: line });
  } catch (error) {
    console.error('获取生产线失败:', error);
    res.status(500).json({ success: false, message: '获取生产线失败' });
  }
};

// 新增生产线（管理员）
const createLine = async (req, res) => {
  try {
    const { code, name, sort_order } = req.body;
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: '生产线编码不能为空' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '生产线名称不能为空' });
    }

    const id = await withTransaction(async (conn) => {
      return await productionLineDao.create(conn, {
        code: code.trim(),
        name: name.trim(),
        sort_order: Number(sort_order) || 0,
        created_user_id: req.user.id
      });
    });

    res.json({ success: true, data: { id }, message: '创建成功' });
  } catch (error) {
    console.error('新增生产线失败:', error);
    const msg = error.message && error.message.includes('Duplicate') && error.message.includes('uk_code')
      ? '生产线编码已存在'
      : '新增生产线失败: ' + (error.message || '未知错误');
    res.status(500).json({ success: false, message: msg });
  }
};

// 更新生产线（管理员）
const updateLine = async (req, res) => {
  try {
    const { code, name, sort_order } = req.body;
    const id = req.params.id;
    const existing = await productionLineDao.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '生产线不存在' });
    }
    if (!code || !code.trim()) {
      return res.status(400).json({ success: false, message: '生产线编码不能为空' });
    }
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: '生产线名称不能为空' });
    }

    await withTransaction(async (conn) => {
      await productionLineDao.update(conn, id, {
        code: code.trim(),
        name: name.trim(),
        sort_order: Number(sort_order) || 0,
        modified_user_id: req.user.id
      });
    });

    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新生产线失败:', error);
    const msg = error.message && error.message.includes('Duplicate') && error.message.includes('uk_code')
      ? '生产线编码已存在'
      : '更新生产线失败: ' + (error.message || '未知错误');
    res.status(500).json({ success: false, message: msg });
  }
};

// 删除生产线（管理员）— 要求该生产线无料罐
const deleteLine = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await productionLineDao.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: '生产线不存在' });
    }

    const tankCount = await productionLineDao.countTanks(null, id);
    if (tankCount > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `该生产线下还有 ${tankCount} 个料罐，请先清空或迁移料罐后再删除` 
      });
    }

    await withTransaction(async (conn) => {
      await productionLineDao.remove(conn, id, req.user.id);
    });

    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除生产线失败:', error);
    res.status(500).json({ success: false, message: '删除生产线失败: ' + (error.message || '未知错误') });
  }
};

module.exports = {
  getAllLines,
  getLineById,
  createLine,
  updateLine,
  deleteLine
};
