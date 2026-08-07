package com.yuntong.board.event;

import com.corundumstudio.socketio.SocketIOServer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

/**
 * WebSocket 事件推送（对应 Node.js 的 io.emit）
 * 前端 socket.io-client 零改动，事件名完全一致
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventPublisher {

    private final SocketIOServer server;

    // 事件名常量（与前端 socket.ts 完全一致）
    public static final String EVENT_TANK_STATUS = "tank_status_update";
    public static final String EVENT_NEW_CARD = "new_card_uploaded";
    public static final String EVENT_CARD_CONFIRMED = "card_confirmed";

    /**
     * 推送料罐状态更新
     */
    public void emitTankStatus(Long tankId, String status, String action) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("tank_id", tankId);
        payload.put("status", status);
        payload.put("action", action);
        server.getBroadcastOperations().sendEvent(EVENT_TANK_STATUS, payload);
        log.debug("推送料罐状态: tankId={}, status={}, action={}", tankId, status, action);
    }

    /**
     * 推送新流转卡上传
     */
    public void emitNewCard(Long tankId, Long cardId, String imageUrl) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("tank_id", tankId);
        Map<String, Object> card = new HashMap<>();
        card.put("id", cardId);
        card.put("image_url", imageUrl);
        payload.put("card", card);
        payload.put("tank_status", "pending");
        server.getBroadcastOperations().sendEvent(EVENT_NEW_CARD, payload);
        log.debug("推送新卡片: tankId={}, cardId={}", tankId, cardId);
    }

    /**
     * 推送卡片确认入库
     */
    public void emitCardConfirmed(Long tankId, Long cardId) {
        Map<String, Object> payload = new HashMap<>();
        payload.put("tank_id", tankId);
        payload.put("card_id", cardId);
        payload.put("tank_status", "idle");
        server.getBroadcastOperations().sendEvent(EVENT_CARD_CONFIRMED, payload);
        log.debug("推送卡片确认: tankId={}, cardId={}", tankId, cardId);
    }
}
