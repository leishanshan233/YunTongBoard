package com.yuntong.board.service;

import com.yuntong.board.common.PageResult;

import java.util.List;
import java.util.Map;

public interface LogService {
    PageResult<Map<String, Object>> getLogs(String action, Long userId, String startDate, String endDate, int page, int limit);
    List<String> getActionTypes();
}
