-- 运通电子看板系统数据库初始化脚本
-- 使用前请先创建数据库: CREATE DATABASE IF NOT EXISTS yuntong_board DEFAULT CHARACTER SET utf8mb4;

USE yuntong_board;

-- 料罐表
CREATE TABLE IF NOT EXISTS tanks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tank_code VARCHAR(20) UNIQUE NOT NULL COMMENT '罐号 T-01',
    tank_name VARCHAR(50) COMMENT '罐名称',
    row_index INT NOT NULL COMMENT '行位置',
    col_index INT NOT NULL COMMENT '列位置',
    status ENUM('idle', 'pending', 'timeout') DEFAULT 'idle' COMMENT '状态',
    current_card_id INT NULL COMMENT '当前流转卡ID',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 流转卡表
CREATE TABLE IF NOT EXISTS cards (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tank_id INT NOT NULL COMMENT '料罐ID',
    image_url VARCHAR(500) NOT NULL COMMENT '照片URL',
    thumbnail_url VARCHAR(500) COMMENT '缩略图URL',
    uploaded_by INT COMMENT '上传人ID',
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    confirmed_by INT COMMENT '确认人ID',
    confirmed_at DATETIME NULL COMMENT '确认时间',
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '上传时间（不应自动更新，确认入库时保持原值）',
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除',
    INDEX idx_tank_id (tank_id),
    INDEX idx_status (status),
    INDEX idx_uploaded_at (uploaded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('operator', 'admin') NOT NULL,
    last_login_at DATETIME NULL,
    deleted TINYINT NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(50) NOT NULL COMMENT 'upload/confirm/force_clear',
    tank_id INT,
    card_id INT,
    details JSON,
    ip_address VARCHAR(50),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_action (action),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value TEXT,
    description VARCHAR(200),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 插入默认配置
INSERT INTO system_config (config_key, config_value, description) VALUES
('timeout_hours', '4', '超时预警时间(小时)'),
('board_columns', '4', '看板列数'),
('board_rows', '3', '看板行数'),
('refresh_interval', '5', '轮询刷新间隔(秒)')
ON DUPLICATE KEY UPDATE config_value = VALUES(config_value);

-- 初始化12个料罐
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

-- 管理员账户（密码 admin123，BCrypt 加密）
-- 注意：Java 的 BCryptPasswordEncoder 生成的 hash 与 Node.js bcryptjs 兼容
INSERT INTO users (username, password_hash, role) VALUES
('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin')
ON DUPLICATE KEY UPDATE username = VALUES(username);
