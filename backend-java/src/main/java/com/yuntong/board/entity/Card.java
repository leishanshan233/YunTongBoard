package com.yuntong.board.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("cards")
public class Card {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long tankId;
    private String imageUrl;
    private String thumbnailUrl;
    private Long uploadedBy;
    private String status;
    private Long confirmedBy;
    private LocalDateTime confirmedAt;
    private LocalDateTime uploadedAt;
    @TableLogic
    private Integer deleted;
}
