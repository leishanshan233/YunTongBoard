-- ================================================
-- 生产线条目迁移脚本
-- 执行前请确保已执行过 init.sql 和 fix_timestamps.sql
-- ================================================

-- 1. 新建 production_lines 表
CREATE TABLE IF NOT EXISTS production_lines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL COMMENT '生产线编码',
  name VARCHAR(100) NOT NULL COMMENT '生产线名称',
  sort_order INT DEFAULT 0 COMMENT '排序（越小越靠前）',
  deleted TINYINT DEFAULT 0 COMMENT '逻辑删除 0=未删 1=已删',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  modified_at DATETIME NULL DEFAULT NULL COMMENT '修改时间',
  created_user_id INT NULL COMMENT '创建人ID',
  modified_user_id INT NULL COMMENT '修改人ID',
  UNIQUE KEY uk_code (code),
  INDEX idx_deleted (deleted),
  INDEX idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='生产线表';

-- 2. 插入默认生产线（假设默认管理员ID为1，可根据实际修改）
INSERT IGNORE INTO production_lines (code, name, sort_order, created_user_id)
VALUES ('LINE-01', '1号线', 0, 1);

-- 3. tanks 表增加生产线外键列
ALTER TABLE tanks ADD COLUMN IF NOT EXISTS production_line_id INT NULL COMMENT '所属生产线ID' AFTER id;
ALTER TABLE tanks ADD INDEX IF NOT EXISTS idx_production_line (production_line_id);

-- 4. 将现有 tanks 全部归到默认生产线（id=1）
UPDATE tanks SET production_line_id = 1 WHERE production_line_id IS NULL;

-- 5. system_config 表增加生产线列（实现按生产线隔离配置）
ALTER TABLE system_config ADD COLUMN IF NOT EXISTS production_line_id INT NULL COMMENT '生产线ID（NULL=全局配置）' AFTER id;
ALTER TABLE system_config ADD INDEX IF NOT EXISTS idx_line_key (production_line_id, config_key);

-- 6. 将现有布局配置改为按生产线隔离（把 board_columns/board_rows 改为 1_board_columns 等）
UPDATE system_config
SET config_key = CONCAT('1_', config_key)
WHERE config_key IN ('board_columns', 'board_rows', 'timeout_hours', 'refresh_interval_seconds', 'timeout_notification_enabled')
  AND production_line_id IS NULL;

-- 更新备注
UPDATE system_config SET production_line_id = 1
WHERE config_key LIKE '1_%' AND production_line_id IS NULL;
