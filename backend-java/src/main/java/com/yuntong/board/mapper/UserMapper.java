package com.yuntong.board.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yuntong.board.entity.User;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;

public interface UserMapper extends BaseMapper<User> {

    @Select("SELECT * FROM users WHERE username = #{username}")
    User findByUsername(@Param("username") String username);

    @Update("UPDATE users SET last_login_at = #{now} WHERE id = #{id}")
    int updateLastLogin(@Param("id") Long id, @Param("now") LocalDateTime now);

    @Select("SELECT COUNT(*) FROM users WHERE username = #{username}")
    long countByUsername(@Param("username") String username);
}
