package com.yuntong.board.service;

import com.yuntong.board.entity.User;

import java.util.List;
import java.util.Map;

public interface UserService {
    Map<String, Object> login(String username, String password);
    User getCurrentUser(Long id);
    User createUser(String username, String password, String role);
    List<User> getUsers();
    void updateUser(Long id, String username, String role, String password);
    void deleteUser(Long id, Long currentUserId);
}
