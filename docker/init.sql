-- 运通电子看板系统 数据库初始化脚本
-- 此脚本将在MySQL容器首次启动时自动执行

CREATE DATABASE IF NOT EXISTS yuntong_board 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE yuntong_board;
