package com.yuntong.board.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableLogic;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("tanks")
public class Tank {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String tankCode;
    private String tankName;
    private Integer rowIndex;
    private Integer colIndex;
    private String status;
    private Long currentCardId;
    @TableLogic
    private Integer deleted;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
