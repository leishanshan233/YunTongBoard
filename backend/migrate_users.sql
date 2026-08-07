-- ============================================================
-- 用户表迁移脚本：username → code/name/created_user_id
-- 适用于已存在旧版 users 表的数据库
-- 用法：mysql -u root -p yuntong_board < migrate_users.sql
-- ============================================================

USE yuntong_board;

-- 1. 添加新列
ALTER TABLE users ADD COLUMN code VARCHAR(50) AFTER id;
ALTER TABLE users ADD COLUMN name VARCHAR(50) AFTER code;
ALTER TABLE users ADD COLUMN created_user_id INT NULL AFTER role;
ALTER TABLE users ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除' AFTER role;

-- 2. 将旧 username 数据迁移到 code 和 name
UPDATE users SET code = username, name = username WHERE code IS NULL;

-- 3. 设置 NOT NULL 约束
ALTER TABLE users MODIFY COLUMN code VARCHAR(50) NOT NULL;
ALTER TABLE users MODIFY COLUMN name VARCHAR(50) NOT NULL;

-- 4. 添加唯一索引
ALTER TABLE users ADD UNIQUE KEY uk_code (code);

-- 5. 删除旧列
ALTER TABLE users DROP INDEX uk_username;
ALTER TABLE users DROP COLUMN username;

-- 6. 更新管理员姓名（如果 code='admin'）
UPDATE users SET name = '管理员' WHERE code = 'admin' AND name = 'admin';

-- 验证
-- SELECT id, code, name, role, created_user_id FROM users;
