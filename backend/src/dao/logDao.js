const { pool } = require('../config/db');

// 清洗 IP 地址：去除 ::ffff: 前缀（IPv4 映射的 IPv6 格式）
const normalizeIp = (ip) => {
  if (!ip) return null;
  // ::ffff:127.0.0.1 → 127.0.0.1
  const match = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  return match ? match[1] : ip;
};

const create = async (conn, data) => {
  const db = conn || pool;
  await db.execute(
    'INSERT INTO operation_logs (created_user_id, action, tank_id, card_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
    [
      data.created_user_id || null,
      data.action,
      data.tank_id || null,
      data.card_id || null,
      data.details ? JSON.stringify(data.details) : null,
      normalizeIp(data.ip_address)
    ]
  );
};

const findList = async (params = {}) => {
  const { action, created_user_id, start_date, end_date, page = 1, limit = 50 } = params;
  const offset = (page - 1) * limit;
  const where = [];
  const values = [];

  if (action) { where.push('l.action = ?'); values.push(action); }
  if (created_user_id) { where.push('l.created_user_id = ?'); values.push(created_user_id); }
  if (start_date) { where.push('l.created_at >= ?'); values.push(start_date); }
  if (end_date) {
    where.push('l.created_at < ?');
    values.push(new Date(end_date + ' 23:59:59'));
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

  const [countRows] = await pool.execute(
    `SELECT COUNT(*) AS count FROM operation_logs l ${whereClause}`,
    values
  );

  const [rows] = await pool.execute(`
    SELECT l.*, u.name AS created_user_name, u.code AS created_user_code
    FROM operation_logs l
    LEFT JOIN users u ON u.id = l.created_user_id
    ${whereClause}
    ORDER BY l.created_at DESC
    LIMIT ? OFFSET ?
  `, [...values, Number(limit), Number(offset)]);

  return { total: countRows[0].count, list: rows };
};

const findActionTypes = async () => {
  const [rows] = await pool.query('SELECT DISTINCT action FROM operation_logs');
  return rows.map(r => r.action);
};

module.exports = { create, findList, findActionTypes };
