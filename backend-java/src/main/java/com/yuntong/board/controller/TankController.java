package com.yuntong.board.controller;

import com.yuntong.board.common.Result;
import com.yuntong.board.security.SecurityContext;
import com.yuntong.board.service.TankService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tanks")
@RequiredArgsConstructor
public class TankController {

    private final TankService tankService;

    @GetMapping
    public Result<List<Map<String, Object>>> getAllTanks() {
        return Result.ok(tankService.getAllTanks());
    }

    @GetMapping("/empty")
    public Result<?> getEmptyTanks() {
        return Result.ok(tankService.getEmptyTanks());
    }

    @GetMapping("/stats")
    public Result<Map<String, Object>> getBoardStats() {
        return Result.ok(tankService.getBoardStats());
    }

    @GetMapping("/layout")
    public Result<Map<String, Integer>> getBoardLayout() {
        return Result.ok(tankService.getBoardLayout());
    }

    @PutMapping("/layout")
    public Result<?> updateBoardLayout(@RequestBody Map<String, Integer> body) {
        tankService.updateBoardLayout(body.get("columns"), body.get("rows"));
        return Result.ok();
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> getTankById(@PathVariable Long id) {
        return Result.ok(tankService.getTankById(id));
    }

    @PostMapping
    public Result<?> createTank(@RequestBody Map<String, Object> body) {
        return Result.ok(tankService.createTank(
                (String) body.get("tank_code"),
                (String) body.get("tank_name"),
                (Integer) body.get("row_index"),
                (Integer) body.get("col_index")
        ));
    }

    @PutMapping("/{id}")
    public Result<?> updateTank(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        tankService.updateTank(id,
                (String) body.get("tank_code"),
                (String) body.get("tank_name"),
                (Integer) body.get("row_index"),
                (Integer) body.get("col_index"));
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    public Result<?> deleteTank(@PathVariable Long id) {
        tankService.deleteTank(id);
        return Result.ok();
    }

    @PostMapping("/{id}/clear")
    public Result<?> forceClearTank(@PathVariable Long id, HttpServletRequest req) {
        SecurityContext ctx = SecurityContext.get();
        tankService.forceClearTank(id, ctx.getId(), req.getRemoteAddr());
        return Result.ok();
    }
}
