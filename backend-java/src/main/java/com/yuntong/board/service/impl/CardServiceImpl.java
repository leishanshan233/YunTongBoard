package com.yuntong.board.service.impl;

import com.yuntong.board.common.BizException;
import com.yuntong.board.common.PageResult;
import com.yuntong.board.entity.Card;
import com.yuntong.board.entity.OperationLog;
import com.yuntong.board.entity.Tank;
import com.yuntong.board.event.WebSocketEventPublisher;
import com.yuntong.board.mapper.CardMapper;
import com.yuntong.board.mapper.LogMapper;
import com.yuntong.board.mapper.TankMapper;
import com.yuntong.board.service.CardService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CardServiceImpl implements CardService {

    private final CardMapper cardMapper;
    private final TankMapper tankMapper;
    private final LogMapper logMapper;
    private final WebSocketEventPublisher wsPublisher;

    @Value("${app.upload-path}")
    private String uploadPath;

    /**
     * 上传流转卡（事务：插入卡片 + 更新罐位 + 记录日志）
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> uploadCard(MultipartFile file, Long tankId, Long userId, String ip) {
        // 1. 校验罐位
        Tank tank = tankMapper.selectById(tankId);
        if (tank == null) throw new BizException(404, "料罐不存在");
        if (!"idle".equals(tank.getStatus())) {
            throw new BizException("该罐位已被占用");
        }

        // 2. 保存文件（必须用绝对路径，否则会被解析到 Tomcat 临时目录）
        String originalName = file.getOriginalFilename();
        String ext = originalName != null && originalName.contains(".")
                ? originalName.substring(originalName.lastIndexOf("."))
                : ".jpg";
        String fileName = UUID.randomUUID().toString().replace("-", "") + ext;
        File uploadDir = new File(uploadPath).getAbsoluteFile(); // 转为绝对路径
        if (!uploadDir.exists()) {
            uploadDir.mkdirs();
        }
        File dest = new File(uploadDir, fileName);
        try {
            file.transferTo(dest);
        } catch (IOException e) {
            log.error("文件保存失败", e);
            throw new BizException("文件上传失败");
        }

        String imageUrl = "/uploads/" + fileName;

        // 3. 插入卡片记录
        Card card = new Card();
        card.setTankId(tankId);
        card.setImageUrl(imageUrl);
        card.setUploadedBy(userId);
        card.setStatus("pending");
        card.setUploadedAt(LocalDateTime.now());
        cardMapper.insert(card);

        // 4. 更新罐位状态
        tankMapper.updateStatus(tankId, "pending", card.getId());

        // 5. 记录日志
        OperationLog log = new OperationLog();
        log.setUserId(userId);
        log.setAction("upload");
        log.setTankId(tankId);
        log.setCardId(card.getId());
        log.setIpAddress(ip);
        logMapper.insert(log);

        // 6. WebSocket 推送
        wsPublisher.emitNewCard(tankId, card.getId(), imageUrl);

        return Map.of(
                "id", card.getId(),
                "tank_id", tankId,
                "image_url", imageUrl,
                "status", "pending"
        );
    }

    @Override
    public Map<String, Object> getCardById(Long id) {
        Map<String, Object> card = cardMapper.findByIdWithDetail(id);
        if (card == null) throw new BizException(404, "流转卡不存在");
        return card;
    }

    @Override
    public PageResult<Map<String, Object>> getCards(String status, Long tankId, String startDate, String endDate, int page, int limit) {
        int offset = (page - 1) * limit;
        List<Map<String, Object>> list = cardMapper.findList(status, tankId, startDate, endDate, limit, offset);
        long total = cardMapper.countList(status, tankId, startDate, endDate);
        return PageResult.of(total, list);
    }

    /**
     * 确认入库（事务：更新卡片 + 清空罐位 + 记录日志）
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void confirmCard(Long cardId, Long userId, String ip) {
        Map<String, Object> card = cardMapper.findByIdWithDetail(cardId);
        if (card == null) throw new BizException(404, "流转卡不存在");
        if (!"pending".equals(card.get("status"))) {
            throw new BizException("该卡已处理");
        }

        Long tankId = ((Number) card.get("tank_id")).longValue();
        cardMapper.updateStatus(cardId, "confirmed", userId, LocalDateTime.now());
        tankMapper.updateStatus(tankId, "idle", null);

        OperationLog log = new OperationLog();
        log.setUserId(userId);
        log.setAction("confirm");
        log.setTankId(tankId);
        log.setCardId(cardId);
        log.setIpAddress(ip);
        logMapper.insert(log);

        wsPublisher.emitCardConfirmed(tankId, cardId);
    }

    /**
     * 取消流转卡（事务）
     */
    @Override
    @Transactional(rollbackFor = Exception.class)
    public void cancelCard(Long cardId, Long userId, String ip) {
        Map<String, Object> card = cardMapper.findByIdWithDetail(cardId);
        if (card == null) throw new BizException(404, "流转卡不存在");
        if (!"pending".equals(card.get("status"))) {
            throw new BizException("该卡已处理");
        }

        Long tankId = ((Number) card.get("tank_id")).longValue();
        cardMapper.updateStatus(cardId, "cancelled", null, null);
        tankMapper.updateStatus(tankId, "idle", null);

        OperationLog log = new OperationLog();
        log.setUserId(userId);
        log.setAction("cancel");
        log.setTankId(tankId);
        log.setCardId(cardId);
        log.setIpAddress(ip);
        logMapper.insert(log);

        wsPublisher.emitTankStatus(tankId, "idle", "cancel");
    }

    @Override
    public PageResult<Map<String, Object>> getCardHistory(String status, Long tankId, String startDate, String endDate, int page, int limit) {
        return getCards(status, tankId, startDate, endDate, page, limit);
    }
}
