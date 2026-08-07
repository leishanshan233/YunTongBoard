package com.yuntong.board.service;

import com.yuntong.board.common.PageResult;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface CardService {
    Map<String, Object> uploadCard(MultipartFile file, Long tankId, Long userId, String ip);
    Map<String, Object> getCardById(Long id);
    PageResult<Map<String, Object>> getCards(String status, Long tankId, String startDate, String endDate, int page, int limit);
    void confirmCard(Long cardId, Long userId, String ip);
    void cancelCard(Long cardId, Long userId, String ip);
    PageResult<Map<String, Object>> getCardHistory(String status, Long tankId, String startDate, String endDate, int page, int limit);
}
