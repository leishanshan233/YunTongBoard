const mysql = require('mysql2/promise');
require('dotenv').config();

// 创建连接池（全局单例）
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: '+08:00',
  dateStrings: true,
  namedPlaceholders: true,
  charset: 'utf8mb4'
});

// 测试连接
const testConnection = async () => {
  const conn = await pool.getConnection();
  try {
    await conn.ping();
    console.log('数据库连接成功');
  } finally {
    conn.release();
  }
};

// 事务封装 helper
// 用法: await withTransaction(async (conn) => { await conn.execute(sql, params); })
const withTransaction = async (callback) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
};

module.exports = { pool, testConnection, withTransaction };
