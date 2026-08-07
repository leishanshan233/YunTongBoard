package com.yuntong.board.common;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class Result<T> {
    private boolean success;
    private T data;
    private String message;

    public static <T> Result<T> ok(T data) {
        return new Result<>(true, data, null);
    }

    public static Result<?> ok() {
        return new Result<>(true, null, null);
    }

    public static Result<?> fail(String message) {
        return new Result<>(false, null, message);
    }
}
