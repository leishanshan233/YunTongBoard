const { pool } = require('../config/db');

const findAll = async (filter = {}) => {
  const where = ['t.deleted = 0'];
  const values = [];
  if (filter.production_line_id) {
    where.push('t.production_line_id = ?');
    values.push(Number(filter.production_line_id));
  }
  const whereClause = 'WHERE ' + where.join(' AND ');

  const [rows] = await pool.query(`
    SELECT 
      t.id, t.production_line_id, t.tank_code, t.tank_name, t.row_index, t.col_index, 
      t.status, t.current_card_id,
      c.image_url, c.thumbnail_url, c.created_at,
      u.id AS created_user_id, u.name AS created_user_name, u.code AS created_user_code
    FROM tanks t
    LEFT JOIN cards c ON c.id = t.current_card_id
    LEFT JOIN users u ON u.id = c.created_user_id
    ${whereClause}
    ORDER BY t.row_index ASC, t.col_index ASC
  `, values);
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.execute(`
    SELECT 
      t.id, t.production_line_id, t.tank_code, t.tank_name, t.row_index, t.col_index, 
      t.status, t.current_card_id,
      c.image_url, c.thumbnail_url, c.created_at,
      u.id AS created_user_id, u.name AS created_user_name, u.code AS created_user_code
    FROM tanks t
    LEFT JOIN cards c ON c.id = t.current_card_id
    LEFT JOIN users u ON u.id = c.created_user_id
    WHERE t.id = ? AND t.deleted = 0
  `, [id]);
  return rows[0] || null;
};

const findEmpty = async (filter = {}) => {
  const where = ['status = ?', 'deleted = 0'];
  const values = ['idle'];
  if (filter.production_line_id) {
    where.push('production_line_id = ?');
    values.push(Number(filter.production_line_id));
  }
  const whereClause = 'WHERE ' + where.join(' AND ');
  const [rows] = await pool.execute(
    `SELECT * FROM tanks ${whereClause} ORDER BY row_index ASC, col_index ASC`,
    values
  );
  return rows;
};

const findByCode = async (tankCode) => {
  const [rows] = await pool.execute('SELECT * FROM tanks WHERE tank_code = ? AND deleted = 0', [tankCode]);
  return rows[0] || null;
};

const create = async (conn, data) => {
  const db = conn || pool;
  const [result] = await db.execute(
    'INSERT INTO tanks (production_line_id, tank_code, tank_name, row_index, col_index, status, created_user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [data.production_line_id || null, data.tank_code, data.tank_name || null, data.row_index, data.col_index, 'idle', data.created_user_id || null]
  );
  return result.insertId;
};

const update = async (conn, id, data) => {
  const db = conn || pool;
  await db.execute(
    'UPDATE tanks SET production_line_id = ?, tank_code = ?, tank_name = ?, row_index = ?, col_index = ?, modified_at = NOW(), modified_user_id = ? WHERE id = ?',
    [
      data.production_line_id !== undefined ? data.production_line_id : null,
      data.tank_code,
      data.tank_name ?? null,
      data.row_index,
      data.col_index,
      data.modified_user_id || null,
      id
    ]
  );
};

const updateStatus = async (conn, id, status, cardId = undefined) => {
  const db = conn || pool;
  if (cardId !== undefined) {
    await db.execute(
      'UPDATE tanks SET status = ?, current_card_id = ?, modified_at = NOW() WHERE id = ?',
      [status, cardId, id]
    );
  } else {
    await db.execute(
      'UPDATE tanks SET status = ?, modified_at = NOW() WHERE id = ?',
      [status, id]
    );
  }
};

const remove = async (conn, id) => {
  const db = conn || pool;
  await db.execute('UPDATE tanks SET deleted = 1, modified_at = NOW() WHERE id = ?', [id]);
};

const count = async (filter = {}) => {
  const where = ['deleted = 0'];
  const values = [];
  if (filter.production_line_id) {
    where.push('production_line_id = ?');
    values.push(Number(filter.production_line_id));
  }
  const whereClause = 'WHERE ' + where.join(' AND ');
  const [rows] = await pool.query(`SELECT COUNT(*) AS count FROM tanks ${whereClause}`, values);
  return rows[0].count;
};

const bulkInsert = async (conn, tanks) => {
  const db = conn || pool;
  const values = tanks.map(t => `('${t.tank_code}', '${t.tank_name}', ${t.row_index}, ${t.col_index}, 'idle', NULL)`).join(',');
  await db.query(`INSERT INTO tanks (tank_code, tank_name, row_index, col_index, status, created_user_id) VALUES ${values}`);
};

module.exports = {
  findAll, findById, findEmpty, findByCode,
  create, update, updateStatus, remove, count, bulkInsert
};
