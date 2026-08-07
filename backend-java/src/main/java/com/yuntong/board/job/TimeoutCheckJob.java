package com.yuntong.board.job;

import com.yuntong.board.event.WebSocketEventPublisher;
import com.yuntong.board.mapper.CardMapper;
import com.yuntong.board.mapper.ConfigMapper;
import com.yuntong.board.mapper.TankMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * 超时检查定时任务（对应 Node.js 的 startTimeoutChecker）
 * 每60秒检查一次 pending 卡片是否超时
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class TimeoutCheckJob {

    private final CardMapper cardMapper;
    private final TankMapper tankMapper;
    private final ConfigMapper configMapper;
    private final WebSocketEventPublisher wsPublisher;

    @Scheduled(fixedRate = 60_000)
    public void checkTimeout() {
        try {
            String timeoutStr = configMapper.getValue("timeout_hours");
            int timeoutHours = timeoutStr != null ? Integer.parseInt(timeoutStr) : 4;

            List<Map<String, Object>> pendingCards = cardMapper.findPendingWithTank();
            LocalDateTime now = LocalDateTime.now();

            for (Map<String, Object> card : pendingCards) {
                Object uploadedAtObj = card.get("uploaded_at");
                if (uploadedAtObj == null) continue;

                LocalDateTime uploadedAt;
                if (uploadedAtObj instanceof LocalDateTime) {
                    uploadedAt = (LocalDateTime) uploadedAtObj;
                } else {
                    uploadedAt = LocalDateTime.parse(uploadedAtObj.toString().replace(" ", "T"));
                }

                long hoursElapsed = Duration.between(uploadedAt, now).toHours();
                String tankStatus = (String) card.get("tank_status");

                if (hoursElapsed >= timeoutHours && !"timeout".equals(tankStatus)) {
                    Long tankId = ((Number) card.get("tank_id")).longValue();
                    tankMapper.updateStatus(tankId, "timeout", null);
                    wsPublisher.emitTankStatus(tankId, "timeout", "timeout");
                    log.info("料罐 {} 超时预警", tankId);
                }
            }
        } catch (Exception e) {
            log.error("超时检查失败", e);
        }
    }
}
