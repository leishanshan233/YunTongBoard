package com.yuntong.board.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import com.yuntong.board.entity.Tank;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.List;
import java.util.Map;

public interface TankMapper extends BaseMapper<Tank> {

    /**
     * 查询所有料罐（含当前流转卡）
     * 用 t.current_card_id 直接关联 cards 表，避免 LEFT JOIN 不匹配时 NULL 覆盖
     */
    @Select("SELECT t.id, t.tank_code, t.tank_name, t.row_index, t.col_index, " +
            "t.status, t.current_card_id, " +
            "c.image_url, c.thumbnail_url, c.uploaded_at, " +
            "u.id AS uploader_id, u.username AS uploader_name " +
            "FROM tanks t " +
            "LEFT JOIN cards c ON c.id = t.current_card_id " +
            "LEFT JOIN users u ON u.id = c.uploaded_by " +
            "ORDER BY t.row_index ASC, t.col_index ASC")
    List<Map<String, Object>> findAllWithCard();

    @Update("UPDATE tanks SET status = #{status}, current_card_id = #{cardId} WHERE id = #{id}")
    int updateStatus(@Param("id") Long id, @Param("status") String status, @Param("cardId") Long cardId);

    @Select("SELECT * FROM tanks WHERE status = 'idle' ORDER BY row_index ASC, col_index ASC")
    List<Tank> findEmpty();

    @Select("SELECT * FROM tanks WHERE tank_code = #{tankCode}")
    Tank findByCode(@Param("tankCode") String tankCode);

    @Select("SELECT COUNT(*) FROM tanks")
    long count();
}
