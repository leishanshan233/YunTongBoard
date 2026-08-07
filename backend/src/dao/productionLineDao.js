const { pool } = require('../config/db');

// 所有生产线（不分页，按排序+ID）
const findAll = async () => {
  const [rows] = await pool.query(`
    SELECT 
      id, code, name, sort_order, deleted, created_at, modified_at,
      created_user_id, modified_user_id
    FROM production_lines
    WHERE deleted = 0
    ORDER BY sort_order ASC, id ASC
  `);
  return rows;
};

const findById = async (id) => {
  const [rows] = await pool.execute(`
    SELECT 
      id, code, name, sort_order, deleted, created_at, modified_at,
      created_user_id, modified_user_id
    FROM production_lines
    WHERE id = ? AND deleted = 0
  `, [id]);
  return rows[0] || null;
};

const create = async (conn, data) => {
  const db = conn || pool;
  const [result] = await db.execute(`
    INSERT INTO production_lines (code, name, sort_order, created_user_id)
    VALUES (?, ?, ?, ?)
  `, [data.code, data.name, data.sort_order ?? 0, data.created_user_id ?? null]);
  return result.insertId;
};

const update = async (conn, id, data) => {
  const db = conn || pool;
  await db.execute(`
    UPDATE production_lines
    SET code = ?, name = ?, sort_order = ?, modified_at = NOW(), modified_user_id = ?
    WHERE id = ? AND deleted = 0
  `, [data.code, data.name, data.sort_order ?? 0, data.modified_user_id ?? null, id]);
};

// 逻辑删除
const remove = async (conn, id, modifiedUserId = null) => {
  const db = conn || pool;
  await db.execute(`
    UPDATE production_lines SET deleted = 1, modified_at = NOW(), modified_user_id = ?
    WHERE id = ? AND deleted = 0
  `, [modifiedUserId, id]);
};

// 获取某生产线的料罐数量（用于校验删除）
const countTanks = async (conn, productionLineId) => {
  const db = conn || pool;
  const [rows] = await db.execute(`
    SELECT COUNT(*) AS count FROM tanks
    WHERE production_line_id = ? AND deleted = 0
  `, [productionLineId]);
  return rows[0].count;
};

module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  countTanks
};
