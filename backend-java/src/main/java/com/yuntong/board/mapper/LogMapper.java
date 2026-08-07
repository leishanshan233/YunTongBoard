package com.yuntong.board.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yuntong.board.entity.OperationLog;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

public interface LogMapper extends BaseMapper<OperationLog> {

    @Select("SELECT DISTINCT action FROM operation_logs")
    List<String> findActionTypes();

    /**
     * 条件查询日志（动态 SQL 在 XML 中）
     */
    List<Map<String, Object>> findList(@Param("action") String action,
                                       @Param("userId") Long userId,
                                       @Param("startDate") String startDate,
                                       @Param("endDate") String endDate,
                                       @Param("limit") int limit,
                                       @Param("offset") int offset);

    long countList(@Param("action") String action,
                   @Param("userId") Long userId,
                   @Param("startDate") String startDate,
                   @Param("endDate") String endDate);
}
