const { pool } = require('../config/db');

const findOne = async (key) => {
  const [rows] = await pool.execute(
    'SELECT * FROM system_config WHERE config_key = ?',
    [key]
  );
  return rows[0] || null;
};

const findAll = async () => {
  const [rows] = await pool.query('SELECT * FROM system_config ORDER BY id');
  return rows;
};

const upsert = async (conn, key, value, userId = null, description = null) => {
  const db = conn || pool;
  await db.execute(
    `INSERT INTO system_config (config_key, config_value, description, created_user_id) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE 
       config_value = VALUES(config_value), 
       description = VALUES(description),
       modified_user_id = VALUES(created_user_id),
       modified_at = NOW()`,
    [key, value, description || null, userId || null]
  );
};

const getValue = async (key, defaultValue = null) => {
  const config = await findOne(key);
  return config ? config.config_value : defaultValue;
};

module.exports = { findOne, findAll, upsert, getValue };
