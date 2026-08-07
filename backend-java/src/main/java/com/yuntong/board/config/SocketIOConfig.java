package com.yuntong.board.config;

import com.corundumstudio.socketio.SocketIOServer;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Slf4j
@Configuration
public class SocketIOConfig {

    @Value("${socketio.host}")
    private String host;

    @Value("${socketio.port}")
    private int port;

    @Value("${socketio.origin}")
    private String origin;

    private SocketIOServer server;

    @Bean
    public SocketIOServer socketIOServer() {
        com.corundumstudio.socketio.Configuration config = new com.corundumstudio.socketio.Configuration();
        config.setHostname(host);
        config.setPort(port);
        config.setOrigin(origin);
        config.setPingInterval(25000);
        config.setPingTimeout(60000);
        config.setAllowCustomRequests(true);

        server = new SocketIOServer(config);
        server.addConnectListener(client -> log.info("客户端连接: {}", client.getSessionId()));
        server.addDisconnectListener(client -> log.info("客户端断开: {}", client.getSessionId()));

        server.start();
        log.info("Socket.IO 服务启动在端口: {}", port);
        return server;
    }

    @PreDestroy
    public void stop() {
        if (server != null) {
            server.stop();
            log.info("Socket.IO 服务已停止");
        }
    }
}
