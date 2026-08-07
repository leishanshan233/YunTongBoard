/*
 Navicat Premium Data Transfer

 Source Server         : Test
 Source Server Type    : MySQL
 Source Server Version : 80018
 Source Host           : localhost:3306
 Source Schema         : yuntong_board

 Target Server Type    : MySQL
 Target Server Version : 80018
 File Encoding         : 65001

 Date: 05/08/2026 09:23:43
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for cards
-- ----------------------------
DROP TABLE IF EXISTS `cards`;
CREATE TABLE `cards`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tank_id` int(11) NOT NULL COMMENT '料罐ID',
  `image_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '照片URL',
  `thumbnail_url` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '缩略图URL',
  `uploaded_by` int(11) DEFAULT NULL COMMENT '上传人ID',
  `status` enum('pending','confirmed','cancelled') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending' COMMENT '状态：待入库/已确认/已取消',
  `confirmed_by` int(11) DEFAULT NULL COMMENT '确认人ID',
  `confirmed_at` datetime(0) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0) COMMENT '确认时间',
  `uploaded_at` datetime(0) DEFAULT NULL COMMENT '上传时间',
  `deleted` tinyint(4) NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除',
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `uploaded_by`(`uploaded_by`) USING BTREE,
  INDEX `confirmed_by`(`confirmed_by`) USING BTREE,
  INDEX `cards_tank_id`(`tank_id`) USING BTREE,
  INDEX `cards_status`(`status`) USING BTREE,
  INDEX `cards_uploaded_at`(`uploaded_at`) USING BTREE,
  CONSTRAINT `cards_ibfk_1` FOREIGN KEY (`tank_id`) REFERENCES `tanks` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `cards_ibfk_2` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `cards_ibfk_3` FOREIGN KEY (`confirmed_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of cards
-- ----------------------------
INSERT INTO `cards` VALUES (3, 6, '/uploads/f80f4ab5480d4c53b5357d3122dc4bc3.png', NULL, 1, 'confirmed', 1, '2026-08-04 21:40:48', '2026-08-04 21:40:48', 0);
INSERT INTO `cards` VALUES (4, 2, '/uploads/46bac6c69932416d9b0a7b361ba98bb1.png', NULL, 1, 'pending', NULL, NULL, '2026-08-04 21:43:53', 0);
INSERT INTO `cards` VALUES (5, 10, '/uploads/388690bd9ba541818707fdfcce637a44.jpg', NULL, 1, 'pending', 1, '2026-08-04 22:55:31', '2026-08-04 22:55:31', 0);

-- ----------------------------
-- Table structure for operation_logs
-- ----------------------------
DROP TABLE IF EXISTS `operation_logs`;
CREATE TABLE `operation_logs`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `user_id` int(11) DEFAULT NULL COMMENT '操作人ID',
  `action` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '操作类型：upload/confirm/force_clear/edit',
  `tank_id` int(11) DEFAULT NULL COMMENT '料罐ID',
  `card_id` int(11) DEFAULT NULL COMMENT '流转卡ID',
  `details` json COMMENT '详细信息',
  `ip_address` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'IP地址',
  `created_at` datetime(0) DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP(0),
  PRIMARY KEY (`id`) USING BTREE,
  INDEX `operation_logs_action`(`action`) USING BTREE,
  INDEX `operation_logs_created_at`(`created_at`) USING BTREE,
  INDEX `operation_logs_user_id`(`user_id`) USING BTREE,
  CONSTRAINT `operation_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB AUTO_INCREMENT = 1 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of operation_logs
-- ----------------------------
INSERT INTO `operation_logs` VALUES (1, 1, 'upload', 6, 3, NULL, '0:0:0:0:0:0:0:1', NULL);
INSERT INTO `operation_logs` VALUES (2, 1, 'confirm', 6, 3, NULL, '127.0.0.1', NULL);
INSERT INTO `operation_logs` VALUES (3, 1, 'upload', 2, 4, NULL, '0:0:0:0:0:0:0:1', NULL);
INSERT INTO `operation_logs` VALUES (4, 1, 'upload', 10, 5, NULL, '0:0:0:0:0:0:0:1', NULL);

-- ----------------------------
-- Table structure for system_config
-- ----------------------------
DROP TABLE IF EXISTS `system_config`;
CREATE TABLE `system_config`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `config_key` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '配置键',
  `config_value` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT '配置值',
  `description` varchar(200) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '描述',
  `updated_at` datetime(0) DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `config_key`(`config_key`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 5 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of system_config
-- ----------------------------
INSERT INTO `system_config` VALUES (1, 'timeout_hours', '4', '超时预警时间(小时)', '2026-08-04 19:33:23');
INSERT INTO `system_config` VALUES (2, 'board_columns', '4', '看板列数', '2026-08-04 19:33:23');
INSERT INTO `system_config` VALUES (3, 'board_rows', '3', '看板行数', '2026-08-04 19:33:23');
INSERT INTO `system_config` VALUES (4, 'refresh_interval', '5', '轮询刷新间隔(秒)', '2026-08-04 19:33:23');

-- ----------------------------
-- Table structure for tanks
-- ----------------------------
DROP TABLE IF EXISTS `tanks`;
CREATE TABLE `tanks`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tank_code` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '罐号 T-01',
  `tank_name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT '罐名称',
  `row_index` int(11) NOT NULL COMMENT '行位置',
  `col_index` int(11) NOT NULL COMMENT '列位置',
  `status` enum('idle','pending','timeout') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'idle' COMMENT '状态：空闲/待入库/超时',
  `current_card_id` int(11) DEFAULT NULL COMMENT '当前流转卡ID',
  `created_at` datetime(0) DEFAULT NULL,
  `updated_at` datetime(0) DEFAULT NULL,
  `deleted` tinyint(4) NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `tank_code`(`tank_code`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 13 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of tanks
-- ----------------------------
INSERT INTO `tanks` VALUES (1, 'T-01', '1号罐', 0, 0, 'idle', NULL, '2026-08-04 19:33:23', '2026-08-04 19:33:23', 0);
INSERT INTO `tanks` VALUES (2, 'T-02', '2号罐', 0, 1, 'pending', 4, '2026-08-04 19:33:23', '2026-08-04 19:33:23', 0);
INSERT INTO `tanks` VALUES (3, 'T-03', '3号罐', 0, 2, 'idle', NULL, '2026-08-04 19:33:23', '2026-08-04 19:33:23', 0);
INSERT INTO `tanks` VALUES (4, 'T-04', '4号罐', 0, 3, 'idle', NULL, '2026-08-04 19:33:23', '2026-08-04 19:33:23', 0);
INSERT INTO `tanks` VALUES (5, 'T-05', '5号罐', 1, 0, 'idle', NULL, '2026-08-04 19:33:23', '2026-08-04 19:33:23', 0);
INSERT INTO `tanks` VALUES (6, 'T-06', '6号罐', 1, 1, 'idle', NULL, '2026-08-04 19:33:23', '2026-08-04 19:33:23', 0);
INSERT INTO `tanks` VALUES (7, 'T-07', '7号罐', 1, 2, 'idle', NULL, '2026-08-04 19:33:23', '2026-08-04 19:33:23', 0);
INSERT INTO `tanks` VALUES (8, 'T-08', '8号罐', 1, 3, 'idle', NULL, '2026-08-04 19:33:23', '2026-08-04 19:33:23', 0);
INSERT INTO `tanks` VALUES (9, 'T-09', '9号罐', 2, 0, 'idle', NULL, '2026-08-04 19:33:23', '2026-08-04 19:33:23', 0);
INSERT INTO `tanks` VALUES (10, 'T-10', '10号罐', 2, 1, 'pending', 5, '2026-08-04 19:33:23', '2026-08-04 19:33:23', 0);
INSERT INTO `tanks` VALUES (11, 'T-11', '11号罐', 2, 2, 'idle', NULL, '2026-08-04 19:33:23', '2026-08-04 19:33:23', 0);
INSERT INTO `tanks` VALUES (12, 'T-12', '12号罐', 2, 3, 'idle', NULL, '2026-08-04 19:33:23', '2026-08-04 19:33:23', 0);

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users`  (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `code` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '用户名',
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '密码哈希',
  `role` enum('operator','admin') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT '角色：操作员/管理员',
  `created_user_id` int(11) DEFAULT NULL,
  `last_login_at` datetime(0) DEFAULT NULL COMMENT '最后登录时间',
  `created_at` datetime(0) NOT NULL,
  `updated_at` datetime(0) NOT NULL,
  `deleted` tinyint(4) NOT NULL DEFAULT 0 COMMENT '逻辑删除：0-未删除 1-已删除',
  PRIMARY KEY (`id`) USING BTREE,
  UNIQUE INDEX `username`(`name`) USING BTREE,
  UNIQUE INDEX `uk_code`(`code`) USING BTREE
) ENGINE = InnoDB AUTO_INCREMENT = 2 CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci ROW_FORMAT = Dynamic;

-- ----------------------------
-- Records of users
-- ----------------------------
INSERT INTO `users` VALUES (1, 'admin', 'admin', '$2a$10$OFVO0IC/RbPE/2Dd4uXbr.NkBLcs9YjAhN53tXJaJbXwJ4K2G4Frm', 'admin', NULL, '2026-08-04 22:04:35', '2026-08-04 19:33:23', '2026-08-04 19:33:23', 0);

SET FOREIGN_KEY_CHECKS = 1;
