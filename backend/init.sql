-- ============================================
-- 运通电子看板系统 数据库初始化脚本
-- 数据库: MySQL 8.0+
-- ============================================

-- 1. 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS yuntong_board 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE yuntong_board;

-- 2. 料罐表
CREATE TABLE IF NOT EXISTS tanks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tank_code VARCHAR(20) NOT NULL COMMENT '罐号 T-01',
  tank_name VARCHAR(50) COMMENT '罐名称',
  row_index INT NOT NULL COMMENT '行位置',
  col_index INT NOT NULL COMMENT '列位置',
  status ENUM('idle', 'pending', 'timeout') DEFAULT 'idle' COMMENT '状态：空闲/待入库/超时',
  current_card_id INT NULL COMMENT '当前流转卡ID',
  created_user_id INT NULL COMMENT '创建人ID',
  modified_user_id INT NULL COMMENT '修改人ID',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  modified_at DATETIME NULL COMMENT '修改时间',
  UNIQUE KEY uk_tank_code (tank_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='料罐表';

-- 3. 流转卡表
CREATE TABLE IF NOT EXISTS cards (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tank_id INT NOT NULL COMMENT '料罐ID',
  image_url VARCHAR(500) NOT NULL COMMENT '照片URL',
  thumbnail_url VARCHAR(500) COMMENT '缩略图URL',
  created_user_id INT NULL COMMENT '创建人ID（原上传人）',
  status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending' COMMENT '状态：待入库/已确认/已取消',
  confirm_user_id INT COMMENT '确认人ID',
  confirmed_at DATETIME NULL COMMENT '确认时间',
  modified_user_id INT NULL COMMENT '修改人ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间（原上传时间，不应自动更新）',
  modified_at DATETIME NULL COMMENT '修改时间',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除',
  INDEX idx_tank_id (tank_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='流转卡表';

-- 4. 用户表
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL COMMENT '工号',
  name VARCHAR(50) NOT NULL COMMENT '姓名',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  role ENUM('operator', 'admin') NOT NULL COMMENT '角色：操作员/管理员',
  created_user_id INT NULL COMMENT '创建人ID',
  modified_user_id INT NULL COMMENT '修改人ID',
  deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除',
  last_login_at DATETIME NULL COMMENT '最后登录时间',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  modified_at DATETIME NULL COMMENT '修改时间',
  UNIQUE KEY uk_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';

-- 5. 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_user_id INT COMMENT '创建人ID',
  modified_user_id INT NULL COMMENT '修改人ID',
  action VARCHAR(50) NOT NULL COMMENT '操作类型：upload/confirm/force_clear/edit',
  tank_id INT COMMENT '料罐ID',
  card_id INT COMMENT '流转卡ID',
  details JSON COMMENT '详细信息',
  ip_address VARCHAR(50) COMMENT 'IP地址',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  modified_at DATETIME NULL COMMENT '修改时间',
  INDEX idx_action (action),
  INDEX idx_created_at (created_at),
  INDEX idx_created_user_id (created_user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作日志表';

-- 6. 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  config_key VARCHAR(50) NOT NULL COMMENT '配置键',
  config_value TEXT COMMENT '配置值',
  description VARCHAR(200) COMMENT '描述',
  created_user_id INT NULL COMMENT '创建人ID',
  modified_user_id INT NULL COMMENT '修改人ID',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  modified_at DATETIME NULL COMMENT '修改时间',
  UNIQUE KEY uk_config_key (config_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='系统配置表';

-- 7. 初始化系统配置
INSERT INTO system_config (config_key, config_value, description) VALUES
('timeout_hours', '4', '超时预警时间(小时)'),
('board_columns', '4', '看板列数'),
('board_rows', '3', '看板行数'),
('refresh_interval', '5', '轮询刷新间隔(秒)')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 8. 初始化12个料罐（可选，后端启动时也会自动创建）
INSERT INTO tanks (tank_code, tank_name, row_index, col_index, status) VALUES
('T-01', '1号罐', 0, 0, 'idle'),
('T-02', '2号罐', 0, 1, 'idle'),
('T-03', '3号罐', 0, 2, 'idle'),
('T-04', '4号罐', 0, 3, 'idle'),
('T-05', '5号罐', 1, 0, 'idle'),
('T-06', '6号罐', 1, 1, 'idle'),
('T-07', '7号罐', 1, 2, 'idle'),
('T-08', '8号罐', 1, 3, 'idle'),
('T-09', '9号罐', 2, 0, 'idle'),
('T-10', '10号罐', 2, 1, 'idle'),
('T-11', '11号罐', 2, 2, 'idle'),
('T-12', '12号罐', 2, 3, 'idle')
ON DUPLICATE KEY UPDATE tank_name = VALUES(tank_name);

-- 9. 创建默认管理员账户（密码: admin123）
-- 注意: password_hash 是通过 bcrypt 加密生成的
-- 实际使用时后端启动会自动创建此账户
