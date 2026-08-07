-- ============================================================
-- 数据库结构修复脚本
-- 用法：mysql -u root -p yuntong_board < fix_schema.sql
-- ============================================================

USE yuntong_board;

-- ============================================================
-- 1. 修复 cards.uploaded_at 自动更新问题
--    移除可能存在的 ON UPDATE CURRENT_TIMESTAMP 属性
-- ============================================================
ALTER TABLE cards
    MODIFY COLUMN uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间（确认入库时不应更新）';

-- ============================================================
-- 2. 添加 deleted 列（匹配 MyBatis-Plus 逻辑删除配置）
--    application.yml 配置了 logic-delete-field: deleted
--    但表中缺少该列，会导致 deleteById 报错
-- ============================================================
ALTER TABLE tanks ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除';
ALTER TABLE cards ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除';
ALTER TABLE users ADD COLUMN deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除';

-- ============================================================
-- 3. 优化 URL 字段类型：TEXT → VARCHAR（更高效）
-- ============================================================
ALTER TABLE cards
    MODIFY COLUMN image_url VARCHAR(500) NOT NULL COMMENT '照片URL',
    MODIFY COLUMN thumbnail_url VARCHAR(500) COMMENT '缩略图URL';

-- ============================================================
-- 验证
-- ============================================================
-- SHOW CREATE TABLE cards\G
-- SHOW CREATE TABLE tanks\G
