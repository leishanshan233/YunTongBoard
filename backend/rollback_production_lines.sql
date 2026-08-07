-- ================================================
-- 生产线条目迁移回滚脚本
-- 用于将数据库还原到执行 add_production_lines.sql 之前的状态
-- 执行前请先备份数据库
-- ================================================

-- 1. 还原 system_config 中的 config_key：去掉 "1_" 前缀，恢复为全局配置
UPDATE system_config
SET config_key = SUBSTRING(config_key, 3),
    production_line_id = NULL
WHERE config_key IN (
  '1_board_columns',
  '1_board_rows',
  '1_timeout_hours',
  '1_refresh_interval_seconds',
  '1_timeout_notification_enabled'
);

-- 2. 删除 system_config 上的生产线相关索引和字段
ALTER TABLE system_config DROP INDEX idx_line_key;
ALTER TABLE system_config DROP COLUMN production_line_id;

-- 3. 删除 tanks 表上的生产线相关索引和字段
ALTER TABLE tanks DROP INDEX idx_production_line;
ALTER TABLE tanks DROP COLUMN production_line_id;

-- 4. 删除 production_lines 表
DROP TABLE IF EXISTS production_lines;

-- 验证：以下查询应能正常返回，且看不到 production_line_id 列
-- DESC tanks;
-- DESC system_config;
-- SHOW TABLES LIKE 'production_lines';  -- 应返回空
