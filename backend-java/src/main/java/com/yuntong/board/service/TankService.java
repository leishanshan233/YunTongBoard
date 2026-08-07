package com.yuntong.board.service;

import com.yuntong.board.entity.Tank;

import java.util.List;
import java.util.Map;

public interface TankService {
    List<Map<String, Object>> getAllTanks();
    Map<String, Object> getTankById(Long id);
    List<Tank> getEmptyTanks();
    Tank createTank(String tankCode, String tankName, Integer rowIndex, Integer colIndex);
    void updateTank(Long id, String tankCode, String tankName, Integer rowIndex, Integer colIndex);
    void deleteTank(Long id);
    void forceClearTank(Long tankId, Long userId, String ip);
    Map<String, Integer> getBoardLayout();
    void updateBoardLayout(Integer columns, Integer rows);
    Map<String, Object> getBoardStats();
}
