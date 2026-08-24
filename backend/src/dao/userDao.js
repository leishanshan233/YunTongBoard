const { pool } = require('../config/db');

const findByCode = async (code) => {
  const [rows] = await pool.execute(
    'SELECT * FROM users WHERE code = ? AND deleted = 0',
    [code]
  );
  return rows[0] || null;
};

const findById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT id, code, name, role, created_user_id, last_login_at, created_at FROM users WHERE id = ? AND deleted = 0',
    [id]
  );
  return rows[0] || null;
};

const findAll = async () => {
  const [rows] = await pool.query(`
    SELECT u.id, u.code, u.name, u.role, u.created_user_id, u.last_login_at, u.created_at,
           c.name AS created_user_name, c.code AS created_user_code
    FROM users u
    LEFT JOIN users c ON c.id = u.created_user_id
    WHERE u.deleted = 0
    ORDER BY u.created_at DESC
  `);
  return rows;
};

const create = async (conn, data) => {
  const db = conn || pool;
  const [result] = await db.execute(
    'INSERT INTO users (code, name, password_hash, role, created_user_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
    [data.code, data.name, data.password_hash, data.role || 'operator', data.created_user_id || null]
  );
  return result.insertId;
};

const update = async (conn, id, data) => {
  const db = conn || pool;
  if (data.password_hash) {
    await db.execute(
      'UPDATE users SET code = ?, name = ?, role = ?, password_hash = ?, modified_at = NOW(), modified_user_id = ? WHERE id = ?',
      [data.code, data.name, data.role, data.password_hash, data.modified_user_id || null, id]
    );
  } else {
    await db.execute(
      'UPDATE users SET code = ?, name = ?, role = ?, modified_at = NOW(), modified_user_id = ? WHERE id = ?',
      [data.code, data.name, data.role, data.modified_user_id || null, id]
    );
  }
};

const updateLastLogin = async (id) => {
  await pool.execute('UPDATE users SET last_login_at = NOW() WHERE id = ?', [id]);
};

// 修改密码（仅更新密码哈希，记录修改时间）
const updatePassword = async (id, passwordHash) => {
  await pool.execute(
    'UPDATE users SET password_hash = ?, modified_at = NOW() WHERE id = ?',
    [passwordHash, id]
  );
};

const remove = async (conn, id) => {
  const db = conn || pool;
  await db.execute('UPDATE users SET deleted = 1, modified_at = NOW() WHERE id = ?', [id]);
};

const count = async () => {
  const [rows] = await pool.query('SELECT COUNT(*) AS count FROM users WHERE deleted = 0');
  return rows[0].count;
};

const countByCode = async (code) => {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS count FROM users WHERE code = ? AND deleted = 0',
    [code]
  );
  return rows[0].count;
};

module.exports = {
  findByCode, findById, findAll, create, update,
  updateLastLogin, updatePassword, remove, count, countByCode
};
