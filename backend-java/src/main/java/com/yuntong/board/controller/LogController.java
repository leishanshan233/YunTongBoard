package com.yuntong.board.controller;

import com.yuntong.board.common.PageResult;
import com.yuntong.board.common.Result;
import com.yuntong.board.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class LogController {

    private final LogService logService;

    @GetMapping
    public Result<PageResult<Map<String, Object>>> getLogs(
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long user_id,
            @RequestParam(required = false) String start_date,
            @RequestParam(required = false) String end_date,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int limit) {
        return Result.ok(logService.getLogs(action, user_id, start_date, end_date, page, limit));
    }

    @GetMapping("/actions")
    public Result<List<String>> getActionTypes() {
        return Result.ok(logService.getActionTypes());
    }
}
