-- ============================================================
-- 数据库结构升级迁移脚本
-- 用法：mysql -u root -p yuntong_board < migrate_v2.sql
-- ============================================================

USE yuntong_board;

-- 1. tanks 表：添加 deleted 字段
ALTER TABLE tanks ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除' AFTER current_card_id;

-- 2. cards 表结构调整
ALTER TABLE cards
    ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除' AFTER confirmed_at,
    CHANGE COLUMN uploaded_at created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（原上传时间）',
    CHANGE COLUMN confirmed_by confirm_user_id INT COMMENT '确认人ID',
    DROP INDEX idx_uploaded_at,
    ADD INDEX idx_created_at (created_at);

-- 3. operation_logs 表结构调整
ALTER TABLE operation_logs
    CHANGE COLUMN user_id created_user_id INT COMMENT '创建人ID',
    ADD COLUMN modified_user_id INT NULL COMMENT '修改人ID' AFTER created_user_id,
    ADD COLUMN modified_at DATETIME NULL COMMENT '修改时间' AFTER created_at,
    DROP INDEX idx_user_id,
    ADD INDEX idx_created_user_id (created_user_id);

-- 4. image_url / thumbnail_url TEXT → VARCHAR
ALTER TABLE cards
    MODIFY COLUMN image_url VARCHAR(500) NOT NULL COMMENT '照片URL',
    MODIFY COLUMN thumbnail_url VARCHAR(500) COMMENT '缩略图URL';

-- 验证
-- SHOW CREATE TABLE tanks\G
-- SHOW CREATE TABLE cards\G
-- SHOW CREATE TABLE operation_logs\G
