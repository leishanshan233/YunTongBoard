package com.yuntong.board.controller;

import com.yuntong.board.common.Result;
import com.yuntong.board.security.SecurityContext;
import com.yuntong.board.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/login")
    public Result<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        Map<String, Object> data = userService.login(body.get("username"), body.get("password"));
        return Result.ok(data);
    }

    @GetMapping("/current")
    public Result<?> getCurrentUser() {
        SecurityContext ctx = SecurityContext.get();
        return Result.ok(userService.getCurrentUser(ctx.getId()));
    }

    @GetMapping
    public Result<List<com.yuntong.board.entity.User>> getUsers() {
        return Result.ok(userService.getUsers());
    }

    @PostMapping
    public Result<?> createUser(@RequestBody Map<String, String> body) {
        return Result.ok(userService.createUser(
                body.get("username"),
                body.get("password"),
                body.get("role")));
    }

    @PutMapping("/{id}")
    public Result<?> updateUser(@PathVariable Long id, @RequestBody Map<String, String> body) {
        userService.updateUser(id, body.get("username"), body.get("role"), body.get("password"));
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    public Result<?> deleteUser(@PathVariable Long id) {
        SecurityContext ctx = SecurityContext.get();
        userService.deleteUser(id, ctx.getId());
        return Result.ok();
    }
}
