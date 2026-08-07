package com.yuntong.board.service.impl;

import com.yuntong.board.common.BizException;
import com.yuntong.board.entity.Card;
import com.yuntong.board.entity.OperationLog;
import com.yuntong.board.entity.Tank;
import com.yuntong.board.event.WebSocketEventPublisher;
import com.yuntong.board.mapper.CardMapper;
import com.yuntong.board.mapper.ConfigMapper;
import com.yuntong.board.mapper.LogMapper;
import com.yuntong.board.mapper.TankMapper;
import com.yuntong.board.service.TankService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class TankServiceImpl implements TankService {

    private final TankMapper tankMapper;
    private final CardMapper cardMapper;
    private final LogMapper logMapper;
    private final ConfigMapper configMapper;
    private final WebSocketEventPublisher wsPublisher;

    @Override
    public List<Map<String, Object>> getAllTanks() {
        List<Map<String, Object>> tanks = tankMapper.findAllWithCard();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
        // 为前端添加时间戳字段 + 格式化日期
        // 注意：MyBatis 返回的 Map 键是 SQL 列名（snake_case），必须用 uploaded_at 而非 uploadedAt
        for (Map<String, Object> tank : tanks) {
            Object uploadedAt = tank.get("uploaded_at");
            long ts = 0;
            if (uploadedAt instanceof java.time.LocalDateTime) {
                java.time.LocalDateTime ldt = (java.time.LocalDateTime) uploadedAt;
                ts = ldt.atZone(java.time.ZoneId.of("Asia/Shanghai")).toInstant().toEpochMilli();
                // 转成格式化字符串，避免 Jackson 输出带 T 的 ISO 格式
                tank.put("uploaded_at", ldt.format(fmt));
            } else if (uploadedAt instanceof java.sql.Timestamp) {
                java.sql.Timestamp tsObj = (java.sql.Timestamp) uploadedAt;
                ts = tsObj.toInstant().toEpochMilli();
                tank.put("uploaded_at", tsObj.toLocalDateTime().format(fmt));
            } else if (uploadedAt instanceof String && ((String) uploadedAt).length() > 0) {
                try {
                    java.time.LocalDateTime ldt = java.time.LocalDateTime.parse((String) uploadedAt, fmt);
                    ts = ldt.atZone(java.time.ZoneId.of("Asia/Shanghai")).toInstant().toEpochMilli();
                } catch (Exception ignored) {}
            }
            // 直接用 snake_case 键，确保前端能正确访问 uploaded_at_ts
            tank.put("uploaded_at_ts", ts);
        }
        return tanks;
    }

    @Override
    public Map<String, Object> getTankById(Long id) {
        List<Map<String, Object>> all = tankMapper.findAllWithCard();
        return all.stream()
                .filter(t -> id.equals(t.get("id")))
                .findFirst()
                .orElseThrow(() -> new BizException(404, "料罐不存在"));
    }

    @Override
    public List<Tank> getEmptyTanks() {
        return tankMapper.findEmpty();
    }

    @Override
    public Tank createTank(String tankCode, String tankName, Integer rowIndex, Integer colIndex) {
        if (tankMapper.findByCode(tankCode) != null) {
            throw new BizException("罐号已存在");
        }
        Tank tank = new Tank();
        tank.setTankCode(tankCode);
        tank.setTankName(tankName);
        tank.setRowIndex(rowIndex);
        tank.setColIndex(colIndex);
        tank.setStatus("idle");
        tankMapper.insert(tank);
        return tank;
    }

    @Override
    public void updateTank(Long id, String tankCode, String tankName, Integer rowIndex, Integer colIndex) {
        Tank tank = tankMapper.selectById(id);
        if (tank == null) throw new BizException(404, "料罐不存在");
        tank.setTankCode(tankCode != null ? tankCode : tank.getTankCode());
        tank.setTankName(tankName != null ? tankName : tank.getTankName());
        tank.setRowIndex(rowIndex != null ? rowIndex : tank.getRowIndex());
        tank.setColIndex(colIndex != null ? colIndex : tank.getColIndex());
        tankMapper.updateById(tank);
    }

    @Override
    public void deleteTank(Long id) {
        Tank tank = tankMapper.selectById(id);
        if (tank == null) throw new BizException(404, "料罐不存在");
        if (!"idle".equals(tank.getStatus())) {
            throw new BizException("非空罐位不能删除");
        }
        tankMapper.deleteById(id);
    }

    /**
     * 强制清空料罐（事务：取消卡片 + 清空罐位 + 记录日志）
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void forceClearTank(Long tankId, Long userId, String ip) {
        List<Map<String, Object>> tanks = tankMapper.findAllWithCard();
        Map<String, Object> tankMap = tanks.stream()
                .filter(t -> tankId.equals(t.get("id")))
                .findFirst()
                .orElseThrow(() -> new BizException(404, "料罐不存在"));

        String status = (String) tankMap.get("status");
        if ("idle".equals(status)) {
            throw new BizException("罐位已是空闲状态");
        }

        Long cardId = (Long) tankMap.get("current_card_id"); // 先存下来避免丢失

        if (cardId != null) {
            cardMapper.updateStatus(cardId, "cancelled", null, null);
        }
        tankMapper.updateStatus(tankId, "idle", null);

        OperationLog log = new OperationLog();
        log.setUserId(userId);
        log.setAction("force_clear");
        log.setTankId(tankId);
        log.setCardId(cardId);
        log.setIpAddress(ip);
        logMapper.insert(log);

        wsPublisher.emitTankStatus(tankId, "idle", "force_clear");
    }

    @Override
    public Map<String, Integer> getBoardLayout() {
        Map<String, Integer> layout = new HashMap<>();
        layout.put("columns", Integer.parseInt(configMapper.getValue("board_columns") != null ? configMapper.getValue("board_columns") : "4"));
        layout.put("rows", Integer.parseInt(configMapper.getValue("board_rows") != null ? configMapper.getValue("board_rows") : "3"));
        return layout;
    }

    @Override
    public void updateBoardLayout(Integer columns, Integer rows) {
        configMapper.upsert("board_columns", String.valueOf(columns), "看板列数");
        configMapper.upsert("board_rows", String.valueOf(rows), "看板行数");
    }

    @Override
    public Map<String, Object> getBoardStats() {
        List<Map<String, Object>> tanks = tankMapper.findAllWithCard();
        long todayConfirmed = cardMapper.countTodayConfirmed();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalTanks", tanks.size());
        stats.put("pendingCount", tanks.stream().filter(t -> "pending".equals(t.get("status"))).count());
        stats.put("timeoutCount", tanks.stream().filter(t -> "timeout".equals(t.get("status"))).count());
        stats.put("idleCount", tanks.stream().filter(t -> "idle".equals(t.get("status"))).count());
        stats.put("todayConfirmed", todayConfirmed);
        return stats;
    }
}
