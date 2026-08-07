package com.yuntong.board.controller;

import com.yuntong.board.common.Result;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

    @GetMapping("/api/health")
    public Result<Map<String, Object>> health() {
        return Result.ok(Map.of(
                "status", "ok",
                "timestamp", java.time.LocalDateTime.now().toString()
        ));
    }
}
