-- ============================================================
-- 数据库结构升级迁移脚本 v3
-- 用法：mysql -u root -p yuntong_board < migrate_v3.sql
-- ============================================================

USE yuntong_board;

-- 1. tanks 表：添加 created_user_id / modified_user_id，updated_at → modified_at
ALTER TABLE tanks
    ADD COLUMN created_user_id INT NULL COMMENT '创建人ID' AFTER current_card_id,
    ADD COLUMN modified_user_id INT NULL COMMENT '修改人ID' AFTER created_user_id,
    CHANGE COLUMN updated_at modified_at DATETIME NULL COMMENT '修改时间';

-- 2. cards 表：uploaded_by → created_user_id，加 modified_user_id / modified_at
ALTER TABLE cards
    CHANGE COLUMN uploaded_by created_user_id INT NULL COMMENT '创建人ID（原上传人）',
    ADD COLUMN modified_user_id INT NULL COMMENT '修改人ID' AFTER confirmed_at,
    ADD COLUMN modified_at DATETIME NULL COMMENT '修改时间' AFTER created_at;

-- 3. users 表：加 modified_user_id，updated_at → modified_at
ALTER TABLE users
    ADD COLUMN modified_user_id INT NULL COMMENT '修改人ID' AFTER created_user_id,
    CHANGE COLUMN updated_at modified_at DATETIME NULL COMMENT '修改时间';

-- 4. system_config 表：加 created_user_id / modified_user_id / created_at，updated_at → modified_at
ALTER TABLE system_config
    ADD COLUMN created_user_id INT NULL COMMENT '创建人ID' AFTER description,
    ADD COLUMN modified_user_id INT NULL COMMENT '修改人ID' AFTER created_user_id,
    ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间' AFTER modified_user_id,
    CHANGE COLUMN updated_at modified_at DATETIME NULL COMMENT '修改时间';

-- 5. operation_logs 表：user_id → created_user_id，加 modified_user_id / modified_at
-- （如果还未执行过此迁移）
-- ALTER TABLE operation_logs
--     CHANGE COLUMN user_id created_user_id INT COMMENT '创建人ID',
--     ADD COLUMN modified_user_id INT NULL COMMENT '修改人ID' AFTER created_user_id,
--     ADD COLUMN modified_at DATETIME NULL COMMENT '修改时间' AFTER created_at,
--     DROP INDEX idx_user_id,
--     ADD INDEX idx_created_user_id (created_user_id);

-- 验证
-- SHOW CREATE TABLE tanks\G
-- SHOW CREATE TABLE cards\G
-- SHOW CREATE TABLE users\G
-- SHOW CREATE TABLE system_config\G
-- SHOW CREATE TABLE operation_logs\G
