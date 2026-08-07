package com.yuntong.board.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yuntong.board.entity.SystemConfig;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

public interface ConfigMapper extends BaseMapper<SystemConfig> {

    @Select("SELECT * FROM system_config WHERE config_key = #{key}")
    SystemConfig findOne(@Param("key") String key);

    @Select("SELECT config_value FROM system_config WHERE config_key = #{key}")
    String getValue(@Param("key") String key);

    @Update("INSERT INTO system_config (config_key, config_value, description) VALUES (#{key}, #{value}, #{description}) " +
            "ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), description = VALUES(description)")
    int upsert(@Param("key") String key, @Param("value") String value, @Param("description") String description);
}
