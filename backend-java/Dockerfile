# 多阶段构建：先编译，再运行
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /build
COPY pom.xml .
RUN mvn dependency:go-offline -B
COPY src ./src
RUN mvn package -DskipTests -B

# 运行阶段
FROM eclipse-temurin:17-jre
WORKDIR /app

# 复制 jar
COPY --from=builder /build/target/yuntong-board-backend.jar app.jar

# 创建上传目录
RUN mkdir -p /app/uploads
VOLUME /app/uploads

# 环境变量
ENV DB_HOST=localhost \
    DB_PORT=3306 \
    DB_NAME=yuntong_board \
    DB_USER=root \
    DB_PASSWORD=root \
    JWT_SECRET=yuntong_board_jwt_secret_key_2024 \
    UPLOAD_PATH=/app/uploads \
    CORS_ORIGIN=* \
    SOCKETIO_PORT=9092

EXPOSE 3001 9092

ENTRYPOINT ["java", "-jar", "app.jar"]
