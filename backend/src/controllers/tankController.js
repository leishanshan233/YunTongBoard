const tankDao = require('../dao/tankDao');
const cardDao = require('../dao/cardDao');
const configDao = require('../dao/configDao');
const logDao = require('../dao/logDao');
const { withTransaction } = require('../config/db');

const parseDateToTs = (dateStr) => {
  if (!dateStr) return 0;
  const ts = new Date(dateStr.replace(' ', 'T')).getTime();
  return isNaN(ts) ? 0 : ts;
};

// 获取所有料罐（含当前流转卡）— 扁平结构，前端可直接访问。支持 ?production_line_id=X
const getAllTanks = async (req, res) => {
  try {
    const filter = {};
    if (req.query.production_line_id) filter.production_line_id = req.query.production_line_id;
    const tanks = await tankDao.findAll(filter);
    const result = tanks.map(t => ({
      id: t.id,
      production_line_id: t.production_line_id || null,
      tank_code: t.tank_code,
      tank_name: t.tank_name,
      row_index: t.row_index,
      col_index: t.col_index,
      status: t.status,
      current_card_id: t.current_card_id || null,
      image_url: t.image_url || null,
      thumbnail_url: t.thumbnail_url || null,
      created_at: t.created_at || null,
      created_at_ts: parseDateToTs(t.created_at),
      created_user_id: t.created_user_id || null,
      created_user_name: t.created_user_name || null,
      created_user_code: t.created_user_code || null
    }));
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('获取料罐列表失败:', error);
    res.status(500).json({ success: false, message: '获取料罐列表失败' });
  }
};

const getTankById = async (req, res) => {
  try {
    const tank = await tankDao.findById(req.params.id);
    if (!tank) {
      return res.status(404).json({ success: false, message: '料罐不存在' });
    }
    tank.created_at_ts = parseDateToTs(tank.created_at);
    res.json({ success: true, data: tank });
  } catch (error) {
    console.error('获取料罐详情失败:', error);
    res.status(500).json({ success: false, message: '获取料罐详情失败' });
  }
};

const getEmptyTanks = async (req, res) => {
  try {
    const filter = {};
    if (req.query.production_line_id) filter.production_line_id = req.query.production_line_id;
    const tanks = await tankDao.findEmpty(filter);
    res.json({ success: true, data: tanks });
  } catch (error) {
    console.error('获取空罐位失败:', error);
    res.status(500).json({ success: false, message: '获取空罐位失败' });
  }
};

const createTank = async (req, res) => {
  try {
    const { production_line_id, tank_code, tank_name, row_index, col_index } = req.body;
    if (await tankDao.findByCode(tank_code)) {
      return res.status(400).json({ success: false, message: '罐号已存在' });
    }
    const id = await tankDao.create(null, {
      production_line_id: production_line_id ? Number(production_line_id) : null,
      tank_code, tank_name, row_index, col_index,
      created_user_id: req.user.id
    });
    res.status(201).json({ success: true, data: { id, tank_code, tank_name, row_index, col_index, status: 'idle' } });
  } catch (error) {
    console.error('创建料罐失败:', error);
    res.status(500).json({ success: false, message: '创建料罐失败' });
  }
};

const updateTank = async (req, res) => {
  try {
    const tank = await tankDao.findById(req.params.id);
    if (!tank) {
      return res.status(404).json({ success: false, message: '料罐不存在' });
    }
    const { production_line_id, tank_code, tank_name, row_index, col_index } = req.body;
    await tankDao.update(null, req.params.id, {
      production_line_id: production_line_id !== undefined ? Number(production_line_id) : tank.production_line_id,
      tank_code: tank_code || tank.tank_code,
      tank_name: tank_name ?? tank.tank_name,
      row_index: row_index ?? tank.row_index,
      col_index: col_index ?? tank.col_index,
      modified_user_id: req.user.id
    });
    res.json({ success: true, message: '更新成功' });
  } catch (error) {
    console.error('更新料罐失败:', error);
    res.status(500).json({ success: false, message: '更新料罐失败' });
  }
};

const deleteTank = async (req, res) => {
  try {
    const tank = await tankDao.findById(req.params.id);
    if (!tank) {
      return res.status(404).json({ success: false, message: '料罐不存在' });
    }
    if (tank.status !== 'idle') {
      return res.status(400).json({ success: false, message: '非空罐位不能删除' });
    }
    await tankDao.remove(null, req.params.id);
    res.json({ success: true, message: '删除成功' });
  } catch (error) {
    console.error('删除料罐失败:', error);
    res.status(500).json({ success: false, message: '删除料罐失败' });
  }
};

const forceClearTank = async (req, res) => {
  try {
    const tank = await tankDao.findById(req.params.id);
    if (!tank) {
      return res.status(404).json({ success: false, message: '料罐不存在' });
    }
    if (tank.status === 'idle') {
      return res.status(400).json({ success: false, message: '罐位已是空闲状态' });
    }

    const cardId = tank.current_card_id;

    await withTransaction(async (conn) => {
      if (cardId) {
        await cardDao.updateStatus(conn, cardId, 'cancelled', req.user.id);
      }
      await tankDao.updateStatus(conn, tank.id, 'idle', null);
      await logDao.create(conn, {
        created_user_id: req.user.id,
        action: 'force_clear',
        tank_id: tank.id,
        card_id: cardId,
        ip_address: req.ip
      });
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('tank_status_update', {
        tank_id: tank.id,
        status: 'idle',
        action: 'force_clear'
      });
    }

    res.json({ success: true, message: '强制清空成功' });
  } catch (error) {
    console.error('强制清空料罐失败:', error);
    res.status(500).json({ success: false, message: '强制清空料罐失败' });
  }
};

// 获取看板布局，支持按生产线隔离。?production_line_id=X
const getBoardLayout = async (req, res) => {
  try {
    const lineId = req.query.production_line_id ? String(req.query.production_line_id) + '_' : '';
    const columns = await configDao.getValue(`${lineId}board_columns`, '4');
    const rows = await configDao.getValue(`${lineId}board_rows`, '3');
    res.json({ success: true, data: { columns: Number(columns), rows: Number(rows) } });
  } catch (error) {
    console.error('获取看板布局失败:', error);
    res.status(500).json({ success: false, message: '获取看板布局失败' });
  }
};

const updateBoardLayout = async (req, res) => {
  try {
    const { columns, rows, production_line_id } = req.body;
    const newColumns = Number(columns);
    const newRows = Number(rows);
    const lineId = production_line_id ? Number(production_line_id) : null;
    const linePrefix = lineId ? String(lineId) + '_' : '';

    if (!newColumns || !newRows || newColumns < 1 || newRows < 1) {
      return res.status(400).json({ success: false, message: '行列数必须大于0' });
    }

    const totalCells = newColumns * newRows;

    await withTransaction(async (conn) => {
      // 1. 更新布局配置（按生产线隔离）
      await configDao.upsert(conn, `${linePrefix}board_columns`, String(newColumns), req.user.id);
      await configDao.upsert(conn, `${linePrefix}board_rows`, String(newRows), req.user.id);

      // 2. 获取指定生产线的料罐，按原位置排序
      const tankFilter = lineId ? ' AND t.production_line_id = ?' : '';
      const tankParams = lineId ? [lineId] : [];
      const [allTanks] = await conn.query(
        `SELECT t.id, t.row_index, t.col_index FROM tanks t 
         WHERE t.deleted = 0 ${tankFilter} 
         ORDER BY t.row_index ASC, t.col_index ASC`,
        tankParams
      );

      // 3. 重新映射位置：按顺序分配到新布局
      for (let i = 0; i < allTanks.length; i++) {
        if (i >= totalCells) break;
        const newRow = Math.floor(i / newColumns);
        const newCol = i % newColumns;
        await conn.execute(
          'UPDATE tanks SET row_index = ?, col_index = ?, modified_at = NOW(), modified_user_id = ? WHERE id = ?',
          [newRow, newCol, req.user.id, allTanks[i].id]
        );
      }
    });

    res.json({ success: true, message: '布局更新成功' });
  } catch (error) {
    console.error('更新看板布局失败:', error);
    res.status(500).json({ success: false, message: '更新看板布局失败: ' + (error.message || '未知错误') });
  }
};

const batchUpdatePositions = async (req, res) => {
  try {
    const { updates } = req.body;
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, message: '参数错误' });
    }
    await withTransaction(async (conn) => {
      for (const item of updates) {
        await conn.execute(
          'UPDATE tanks SET row_index = ?, col_index = ?, modified_at = NOW(), modified_user_id = ? WHERE id = ?',
          [item.row_index, item.col_index, req.user.id, item.id]
        );
      }
    });
    res.json({ success: true, message: '位置批量更新成功' });
  } catch (error) {
    console.error('批量更新位置失败:', error);
    res.status(500).json({ success: false, message: '批量更新位置失败: ' + (error.message || '未知错误') });
  }
};

const getBoardStats = async (req, res) => {
  try {
    const filter = {};
    if (req.query.production_line_id) filter.production_line_id = req.query.production_line_id;
    const tanks = await tankDao.findAll(filter);
    const todayConfirmed = await cardDao.countTodayConfirmed();
    const stats = {
      totalTanks: tanks.length,
      pendingCount: tanks.filter(t => t.status === 'pending').length,
      timeoutCount: tanks.filter(t => t.status === 'timeout').length,
      idleCount: tanks.filter(t => t.status === 'idle').length,
      todayConfirmed
    };
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取看板统计失败:', error);
    res.status(500).json({ success: false, message: '获取看板统计失败' });
  }
};

module.exports = {
  getAllTanks, getTankById, getEmptyTanks,
  createTank, updateTank, deleteTank, forceClearTank,
  getBoardLayout, updateBoardLayout, getBoardStats,
  batchUpdatePositions
};
