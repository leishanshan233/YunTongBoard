package com.yuntong.board.service.impl;

import com.yuntong.board.common.BizException;
import com.yuntong.board.entity.User;
import com.yuntong.board.mapper.UserMapper;
import com.yuntong.board.security.JwtUtils;
import com.yuntong.board.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private final UserMapper userMapper;
    private final JwtUtils jwtUtils;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    public java.util.Map<String, Object> login(String username, String password) {
        User user = userMapper.findByUsername(username);
        if (user == null || !passwordEncoder.matches(password, user.getPasswordHash())) {
            throw new BizException(401, "用户名或密码错误");
        }
        userMapper.updateLastLogin(user.getId(), LocalDateTime.now());
        String token = jwtUtils.generate(user.getId(), user.getUsername(), user.getRole());

        java.util.Map<String, Object> result = new java.util.HashMap<>();
        result.put("token", token);
        java.util.Map<String, Object> userInfo = new java.util.HashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("username", user.getUsername());
        userInfo.put("role", user.getRole());
        result.put("user", userInfo);
        return result;
    }

    @Override
    public User getCurrentUser(Long id) {
        return userMapper.selectById(id);
    }

    @Override
    public User createUser(String username, String password, String role) {
        if (userMapper.countByUsername(username) > 0) {
            throw new BizException("用户名已存在");
        }
        User user = new User();
        user.setUsername(username);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setRole(role != null ? role : "operator");
        userMapper.insert(user);
        user.setPasswordHash(null); // 不返回密码
        return user;
    }

    @Override
    public List<User> getUsers() {
        List<User> users = userMapper.selectList(null);
        users.forEach(u -> u.setPasswordHash(null));
        return users;
    }

    @Override
    public void updateUser(Long id, String username, String role, String password) {
        User user = userMapper.selectById(id);
        if (user == null) throw new BizException(404, "用户不存在");
        if (username != null) user.setUsername(username);
        if (role != null) user.setRole(role);
        if (password != null && !password.isEmpty()) {
            user.setPasswordHash(passwordEncoder.encode(password));
        }
        userMapper.updateById(user);
    }

    @Override
    public void deleteUser(Long id, Long currentUserId) {
        if (id.equals(currentUserId)) {
            throw new BizException("不能删除自己");
        }
        User user = userMapper.selectById(id);
        if (user == null) throw new BizException(404, "用户不存在");
        userMapper.deleteById(id);
    }
}
