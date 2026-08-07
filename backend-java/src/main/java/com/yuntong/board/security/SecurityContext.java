package com.yuntong.board.security;

import lombok.Data;

/**
 * 当前登录用户（ThreadLocal 存储）
 */
@Data
public class SecurityContext {
    private static final ThreadLocal<SecurityContext> HOLDER = new ThreadLocal<>();

    private Long id;
    private String username;
    private String role;

    public static void set(SecurityContext ctx) {
        HOLDER.set(ctx);
    }

    public static SecurityContext get() {
        return HOLDER.get();
    }

    public static void clear() {
        HOLDER.remove();
    }

    public static boolean isAdmin() {
        SecurityContext ctx = get();
        return ctx != null && "admin".equals(ctx.getRole());
    }
}
