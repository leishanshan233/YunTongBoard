package com.yuntong.board.service.impl;

import com.yuntong.board.common.PageResult;
import com.yuntong.board.mapper.LogMapper;
import com.yuntong.board.service.LogService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class LogServiceImpl implements LogService {

    private final LogMapper logMapper;

    @Override
    public PageResult<Map<String, Object>> getLogs(String action, Long userId, String startDate, String endDate, int page, int limit) {
        int offset = (page - 1) * limit;
        List<Map<String, Object>> list = logMapper.findList(action, userId, startDate, endDate, limit, offset);
        long total = logMapper.countList(action, userId, startDate, endDate);
        return PageResult.of(total, list);
    }

    @Override
    public List<String> getActionTypes() {
        return logMapper.findActionTypes();
    }
}
