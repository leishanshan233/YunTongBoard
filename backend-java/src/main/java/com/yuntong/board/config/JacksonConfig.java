package com.yuntong.board.config;

import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.format.DateTimeFormatter;

/**
 * 全局 Jackson 配置：统一 LocalDateTime 序列化/反序列化格式为 "yyyy-MM-dd HH:mm:ss"。
 * Spring Boot 的 spring.jackson.date-format 仅对 java.util.Date 生效，
 * 对 java.time.LocalDateTime 需要显式配置 JavaTimeModule 的 Serializer/Deserializer，
 * 否则默认输出 ISO-8601 格式（带 'T'，如 2026-08-04T21:44:03）。
 */
@Configuration
public class JacksonConfig {

    private static final DateTimeFormatter DATE_TIME_FORMATTER =
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    @Bean
    public Jackson2ObjectMapperBuilderCustomizer jacksonCustomizer() {
        return builder -> {
            builder.serializers(new LocalDateTimeSerializer(DATE_TIME_FORMATTER));
            builder.deserializers(new LocalDateTimeDeserializer(DATE_TIME_FORMATTER));
        };
    }
}
