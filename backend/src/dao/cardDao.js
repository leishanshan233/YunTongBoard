const { pool } = require('../config/db');

const findById = async (id) => {
  const [rows] = await pool.execute(`
    SELECT c.*, t.tank_code, t.tank_name,
      u1.name AS created_user_name, u2.name AS confirmer_name
    FROM cards c
    LEFT JOIN tanks t ON t.id = c.tank_id
    LEFT JOIN users u1 ON u1.id = c.created_user_id
    LEFT JOIN users u2 ON u2.id = c.confirm_user_id
    WHERE c.id = ? AND c.deleted = 0
  `, [id]);
  return rows[0] || null;
};

const findList = async (params = {}) => {
  const { status, tank_id, production_line_id, tank_code, start_date, end_date, page = 1, limit = 20 } = params;
  const offset = (page - 1) * limit;
  const where = ['c.deleted = 0'];
  const values = [];

  if (status) { where.push('c.status = ?'); values.push(status); }
  if (tank_id) { where.push('c.tank_id = ?'); values.push(tank_id); }
  if (production_line_id) { where.push('t.production_line_id = ?'); values.push(Number(production_line_id)); }
  if (tank_code) { where.push('t.tank_code LIKE ?'); values.push(`%${tank_code}%`); }
  if (start_date) { where.push('c.created_at >= ?'); values.push(start_date); }
  if (end_date) {
    where.push('c.created_at < ?');
    values.push(new Date(end_date + ' 23:59:59'));
  }

  const whereClause = 'WHERE ' + where.join(' AND ');
  const needJoin = !!production_line_id || !!tank_code;
  const joinClause = needJoin ? 'LEFT JOIN tanks t ON t.id = c.tank_id' : '';

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS count FROM cards c ${joinClause} ${whereClause}`,
    values
  );

  const [rows] = await pool.execute(`
    SELECT c.*, t.tank_code, t.tank_name, t.production_line_id,
      u1.name AS created_user_name, u2.name AS confirmer_name
    FROM cards c
    LEFT JOIN tanks t ON t.id = c.tank_id
    LEFT JOIN users u1 ON u1.id = c.created_user_id
    LEFT JOIN users u2 ON u2.id = c.confirm_user_id
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `, [...values, Number(limit), Number(offset)]);

  return { total: countRows[0].count, list: rows };
};

// 上传卡片时：tank_id 通过 findById 已能拿到 production_line_id，不需额外处理
const create = async (conn, data) => {
  const db = conn || pool;
  const [result] = await db.execute(`
    INSERT INTO cards (image_url, thumbnail_url, tank_id, status, created_user_id)
    VALUES (?, ?, ?, ?, ?)
  `, [data.image_url, data.thumbnail_url || null, data.tank_id, 'pending', data.created_user_id ?? null]);
  return result.insertId;
};

const updateStatus = async (conn, id, status, confirmUserId = null) => {
  const db = conn || pool;
  if (status === 'confirmed') {
    await db.execute(
      `UPDATE cards SET status = ?, confirmed_at = NOW(), confirm_user_id = ?, modified_at = NOW() WHERE id = ?`,
      [status, confirmUserId ?? null, id]
    );
  } else {
    await db.execute(
      `UPDATE cards SET status = ?, modified_at = NOW() WHERE id = ?`,
      [status, id]
    );
  }
};

const remove = async (conn, id, modifiedUserId = null) => {
  const db = conn || pool;
  await db.execute(
    'UPDATE cards SET deleted = 1, modified_at = NOW(), modified_user_id = ? WHERE id = ?',
    [modifiedUserId, id]
  );
};

const countTodayConfirmed = async () => {
  const [rows] = await pool.query(`
    SELECT COUNT(*) AS count FROM cards
    WHERE DATE(confirmed_at) = CURDATE() AND status = 'confirmed' AND deleted = 0
  `);
  return rows[0].count;
};

const getHistory = async (params = {}) => {
  const { page = 1, limit = 50 } = params;
  const offset = (page - 1) * limit;
  const [rows] = await pool.execute(`
    SELECT c.*, t.tank_code, t.tank_name,
      u1.name AS created_user_name, u2.name AS confirmer_name
    FROM cards c
    LEFT JOIN tanks t ON t.id = c.tank_id
    LEFT JOIN users u1 ON u1.id = c.created_user_id
    LEFT JOIN users u2 ON u2.id = c.confirm_user_id
    WHERE c.deleted = 0
    ORDER BY c.created_at DESC
    LIMIT ? OFFSET ?
  `, [Number(limit), Number(offset)]);
  return rows;
};

module.exports = {
  findById,
  findList,
  create,
  updateStatus,
  remove,
  countTodayConfirmed,
  getHistory
};
