package com.yuntong.board.controller;

import com.yuntong.board.common.PageResult;
import com.yuntong.board.common.Result;
import com.yuntong.board.security.SecurityContext;
import com.yuntong.board.service.CardService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/cards")
@RequiredArgsConstructor
public class CardController {

    private final CardService cardService;

    @PostMapping("/upload")
    public Result<Map<String, Object>> uploadCard(
            @RequestParam("image") MultipartFile file,
            @RequestParam("tank_id") Long tankId,
            HttpServletRequest req) {
        SecurityContext ctx = SecurityContext.get();
        return Result.ok(cardService.uploadCard(file, tankId, ctx.getId(), req.getRemoteAddr()));
    }

    @GetMapping
    public Result<PageResult<Map<String, Object>>> getCards(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long tank_id,
            @RequestParam(required = false) String start_date,
            @RequestParam(required = false) String end_date,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return Result.ok(cardService.getCards(status, tank_id, start_date, end_date, page, limit));
    }

    @GetMapping("/history")
    public Result<PageResult<Map<String, Object>>> getHistory(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long tank_id,
            @RequestParam(required = false) String start_date,
            @RequestParam(required = false) String end_date,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int limit) {
        return Result.ok(cardService.getCardHistory(status, tank_id, start_date, end_date, page, limit));
    }

    @GetMapping("/{id}")
    public Result<Map<String, Object>> getCardById(@PathVariable Long id) {
        return Result.ok(cardService.getCardById(id));
    }

    @PostMapping("/{id}/confirm")
    public Result<?> confirmCard(@PathVariable Long id, HttpServletRequest req) {
        SecurityContext ctx = SecurityContext.get();
        cardService.confirmCard(id, ctx.getId(), req.getRemoteAddr());
        return Result.ok();
    }

    @DeleteMapping("/{id}")
    public Result<?> cancelCard(@PathVariable Long id, HttpServletRequest req) {
        SecurityContext ctx = SecurityContext.get();
        cardService.cancelCard(id, ctx.getId(), req.getRemoteAddr());
        return Result.ok();
    }
}
