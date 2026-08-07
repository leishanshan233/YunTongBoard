# 运通电子看板系统

基于网页的三端联动电子看板系统，**前后端完全分离架构**。

## 🏗️ 架构说明

```
┌──────────────┐     HTTP API      ┌──────────────┐
│   前端应用    │ ──────────────→  │   后端服务    │
│  (React SPA)  │ ←────────────── │ (Node.js +   │
│              │   WebSocket      │  Express)    │
└──────────────┘                  └──────┬───────┘
                                          │
                                    ┌─────▼─────┐
                                    │   MySQL    │
                                    └───────────┘
```

**前后端完全分离**：
- 前端独立部署，可部署在任何 Web 服务器
- 后端只提供 API 和 WebSocket 服务
- 通过环境变量配置连接地址

## 📍 三端访问地址

| 端 | 访问地址 | 入口文件 |
|---|---|---|
| 电视看板 | `/board` | `board.html` |
| PDA端 | `/pda` | `pda.html` |
| 后台管理 | `/admin` | `admin.html` |

## 🔑 默认账户

- **用户名**: `admin`
- **密码**: `admin123`

## 🚀 快速开始

### 1. 创建数据库

```sql
CREATE DATABASE IF NOT EXISTS yuntong_board 
  DEFAULT CHARACTER SET utf8mb4 
  DEFAULT COLLATE utf8mb4_unicode_ci;
```

### 2. 启动后端

```bash
cd backend
npm install
npm run dev
# 后端运行在 http://localhost:3001
```

### 3. 启动前端

```bash
cd frontend
npm install
npm run dev
# 前端运行在 http://localhost:3000
```

### 4. 访问系统

- 电视看板: http://localhost:3000/board
- PDA端: http://localhost:3000/pda
- 后台管理: http://localhost:3000/admin

## ⚙️ 配置说明

### 后端配置 (backend/.env)

```env
PORT=3001
CORS_ORIGIN=*          # 允许的前端地址，* 表示所有
DB_HOST=localhost
DB_NAME=yuntong_board
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_secret
TIMEOUT_HOURS=4
```

### 前端配置 (frontend/.env.production)

```env
# 后端 API 地址
VITE_API_BASE=http://your-server:3001/api
# 后端 WebSocket 地址
VITE_SOCKET_URL=http://your-server:3001
# 后端静态文件地址
VITE_UPLOAD_URL=http://your-server:3001/uploads
```

## 📦 部署

### Docker 部署（推荐）

```bash
# 克隆项目后
docker-compose up -d

# 访问：
# 看板: http://your-ip/board
# PDA: http://your-ip/pda
# 后台: http://your-ip/admin
```

### 手动部署

**后端：**
```bash
cd backend
npm install
# 修改 .env 配置
npm start
```

**前端：**
```bash
cd frontend
npm install
# 修改 .env.production 中的后端地址
npm run build
# 将 dist 目录部署到 Nginx
```

**Nginx 配置示例：**
```nginx
server {
    listen 80;
    
    # 看板
    location /board { try_files $uri /board.html; }
    # PDA
    location /pda { try_files $uri /pda.html; }
    # 后台
    location /admin { try_files $uri /admin.html; }
    
    # API 代理
    location /api/ { proxy_pass http://backend:3001; }
    # WebSocket
    location /socket.io/ { proxy_pass http://backend:3001; }
}
```

## 📁 项目结构

```
YunTongBoard/
├── backend/                    # 后端（独立部署）
│   ├── src/
│   │   ├── config/db.js
│   │   ├── models/              # 数据模型
│   │   ├── controllers/         # 控制器
│   │   ├── routes/              # 路由
│   │   ├── middlewares/         # 中间件
│   │   └── app.js              # 入口
│   ├── uploads/                # 图片存储
│   ├── .env
│   └── package.json
│
├── frontend/                   # 前端（独立部署）
│   ├── src/
│   │   ├── entries/            # 入口文件
│   │   │   ├── board.tsx       # 看板入口
│   │   │   ├── pda.tsx         # PDA入口
│   │   │   └── admin.tsx       # 后台入口
│   │   ├── pages/
│   │   │   ├── board/          # 电视看板
│   │   │   ├── pda/            # PDA端
│   │   │   └── admin/          # 后台管理
│   │   ├── services/           # API 服务
│   │   └── utils/              # 工具函数
│   ├── board.html              # 看板 HTML
│   ├── pda.html                # PDA HTML
│   ├── admin.html              # 后台 HTML
│   ├── .env.development        # 开发环境配置
│   ├── .env.production         # 生产环境配置
│   └── package.json
│
├── docker/                     # Docker 配置
├── docker-compose.yml
├── Dockerfile.backend
└── Dockerfile.frontend
```

## 🔌 API 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/tanks` | 获取所有料罐 |
| GET | `/api/tanks/empty` | 获取空罐位 |
| POST | `/api/cards/upload` | 上传流转卡 |
| POST | `/api/cards/:id/confirm` | 确认入库 |
| POST | `/api/users/login` | 登录 |

## ⚠️ 注意事项

1. PDA端调用摄像头需要 HTTPS 或 localhost
2. 生产环境请修改 `CORS_ORIGIN` 为具体域名
3. 生产环境请修改 `JWT_SECRET` 为强密码
4. 图片上传限制为 10MB
5. 首次启动自动创建12个料罐和管理员账户

## 📝 更新日志

- v1.0.0 - 初始版本，支持看板展示、PDA拍照上传、后台管理
