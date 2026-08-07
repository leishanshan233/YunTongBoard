package com.yuntong.board.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.yuntong.board.common.Result;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Set;

/**
 * JWT 认证过滤器（对应 Node.js authMiddleware）
 */
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final ObjectMapper objectMapper;

    // 白名单路径（对应 Node.js 中不需要认证的路由）
    private static final Set<String> WHITELIST = Set.of(
            "/api/users/login",
            "/api/health"
    );

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse resp, FilterChain chain)
            throws ServletException, IOException {
        String path = req.getRequestURI();

        // CORS 预检请求直接放行
        if ("OPTIONS".equalsIgnoreCase(req.getMethod())) {
            chain.doFilter(req, resp);
            return;
        }

        // 白名单直接放行
        if (WHITELIST.contains(path) || path.startsWith("/uploads/")) {
            chain.doFilter(req, resp);
            return;
        }

        // 检查是否是公开的 GET 接口（看板、PDA 查询不需要登录）
        if ("GET".equals(req.getMethod()) && isPublicGetPath(path)) {
            chain.doFilter(req, resp);
            return;
        }

        String authHeader = req.getHeader("Authorization");
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            writeUnauthorized(resp, "未登录或Token已过期");
            return;
        }

        String token = authHeader.substring(7);
        Claims claims = jwtUtils.parse(token);
        if (claims == null) {
            writeUnauthorized(resp, "Token无效或已过期");
            return;
        }

        // 存入 ThreadLocal
        SecurityContext ctx = new SecurityContext();
        ctx.setId(claims.get("id", Long.class));
        ctx.setUsername(claims.get("username", String.class));
        ctx.setRole(claims.get("role", String.class));
        SecurityContext.set(ctx);

        try {
            chain.doFilter(req, resp);
        } finally {
            SecurityContext.clear();
        }
    }

    private boolean isPublicGetPath(String path) {
        // 看板、PDA 的公开查询接口
        return path.equals("/api/tanks") ||
                path.equals("/api/tanks/empty") ||
                path.equals("/api/tanks/stats") ||
                path.equals("/api/tanks/layout") ||
                path.equals("/api/cards") ||
                path.equals("/api/cards/history");
    }

    private void writeUnauthorized(HttpServletResponse resp, String message) throws IOException {
        resp.setStatus(401);
        resp.setContentType("application/json;charset=UTF-8");
        resp.getWriter().write(objectMapper.writeValueAsString(Result.fail(message)));
    }
}
