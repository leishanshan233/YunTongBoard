package com.yuntong.board.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yuntong.board.entity.Card;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface CardMapper extends BaseMapper<Card> {

    @Select("SELECT c.*, t.tank_code, t.tank_name, " +
            "u1.username AS uploader_name, u2.username AS confirmer_name " +
            "FROM cards c " +
            "LEFT JOIN tanks t ON t.id = c.tank_id " +
            "LEFT JOIN users u1 ON u1.id = c.uploaded_by " +
            "LEFT JOIN users u2 ON u2.id = c.confirmed_by " +
            "WHERE c.id = #{id}")
    Map<String, Object> findByIdWithDetail(@Param("id") Long id);

    @Update("UPDATE cards SET status = #{status}, confirmed_by = #{confirmedBy}, confirmed_at = #{confirmedAt} WHERE id = #{id}")
    int updateStatus(@Param("id") Long id, @Param("status") String status,
                     @Param("confirmedBy") Long confirmedBy, @Param("confirmedAt") LocalDateTime confirmedAt);

    @Select("SELECT c.*, t.status AS tank_status FROM cards c " +
            "JOIN tanks t ON t.id = c.tank_id WHERE c.status = 'pending'")
    List<Map<String, Object>> findPendingWithTank();

    @Select("SELECT COUNT(*) FROM cards WHERE status = 'confirmed' AND confirmed_at >= CURDATE()")
    long countTodayConfirmed();

    /**
     * 条件查询列表（动态 SQL 在 XML 中）
     */
    List<Map<String, Object>> findList(@Param("status") String status,
                                       @Param("tankId") Long tankId,
                                       @Param("startDate") String startDate,
                                       @Param("endDate") String endDate,
                                       @Param("limit") int limit,
                                       @Param("offset") int offset);

    long countList(@Param("status") String status,
                   @Param("tankId") Long tankId,
                   @Param("startDate") String startDate,
                   @Param("endDate") String endDate);
}
