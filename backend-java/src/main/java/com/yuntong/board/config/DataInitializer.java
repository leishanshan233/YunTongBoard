package com.yuntong.board.config;

import com.yuntong.board.entity.SystemConfig;
import com.yuntong.board.entity.Tank;
import com.yuntong.board.entity.User;
import com.yuntong.board.mapper.ConfigMapper;
import com.yuntong.board.mapper.TankMapper;
import com.yuntong.board.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * 数据初始化
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class DataInitializer {

    private final TankMapper tankMapper;
    private final UserMapper userMapper;
    private final ConfigMapper configMapper;

    @Bean
    CommandLineRunner initData() {
        return args -> {
            // 初始化料罐
            if (tankMapper.count() == 0) {
                String[] names = {"1号罐", "2号罐", "3号罐", "4号罐", "5号罐", "6号罐",
                        "7号罐", "8号罐", "9号罐", "10号罐", "11号罐", "12号罐"};
                for (int i = 0; i < 12; i++) {
                    Tank tank = new Tank();
                    tank.setTankCode(String.format("T-%02d", i + 1));
                    tank.setTankName(names[i]);
                    tank.setRowIndex(i / 4);
                    tank.setColIndex(i % 4);
                    tank.setStatus("idle");
                    tankMapper.insert(tank);
                }
                log.info("已初始化12个料罐");
            }

            // 初始化管理员
            if (userMapper.countByUsername("admin") == 0) {
                BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
                User admin = new User();
                admin.setUsername("admin");
                admin.setPasswordHash(encoder.encode("admin123"));
                admin.setRole("admin");
                userMapper.insert(admin);
                log.info("已创建管理员账户 (admin/admin123)");
            }

            // 初始化系统配置
            configMapper.upsert("timeout_hours", "4", "超时预警时间(小时)");
            configMapper.upsert("board_columns", "4", "看板列数");
            configMapper.upsert("board_rows", "3", "看板行数");
            configMapper.upsert("refresh_interval", "5", "轮询刷新间隔(秒)");
            log.info("系统配置已初始化");

            log.info("========================================");
            log.info("  运通电子看板系统启动成功！");
            log.info("  API 地址: http://localhost:3001/api");
            log.info("  Socket.IO: http://localhost:9092");
            log.info("  默认账户: admin / admin123");
            log.info("========================================");
        };
    }
}
