package com.yuntong.board;

import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@MapperScan("com.yuntong.board.mapper")
@EnableScheduling
public class YuntongBoardApplication {
    public static void main(String[] args) {
        SpringApplication.run(YuntongBoardApplication.class, args);
    }
}
