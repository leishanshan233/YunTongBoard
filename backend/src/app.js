const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');
const { Server } = require('socket.io');
const { testConnection } = require('./config/db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);

const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const io = new Server(server, {
  cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true }
});

app.set('io', io);

app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件：上传的图片
const uploadPath = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}
app.use('/uploads', express.static(uploadPath));

// 路由
app.use('/api/tanks', require('./routes/tankRoutes'));
app.use('/api/cards', require('./routes/cardRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/logs', require('./routes/logRoutes'));
app.use('/api/system', require('./routes/configRoutes'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || '服务器内部错误' });
});

// WebSocket
io.on('connection', (socket) => {
  console.log('客户端连接:', socket.id);
  socket.on('join', (room) => socket.join(room));
  socket.on('leave', (room) => socket.leave(room));
  socket.on('disconnect', () => console.log('客户端断开:', socket.id));
});

// 初始化数据（只在表为空时插入）
const initData = async () => {
  const tankDao = require('./dao/tankDao');
  const userDao = require('./dao/userDao');
  const configDao = require('./dao/configDao');
  const bcrypt = require('bcryptjs');

  // 初始化料罐
  if ((await tankDao.count()) === 0) {
    const tanks = [];
    for (let i = 0; i < 12; i++) {
      tanks.push({
        tank_code: `T-${String(i + 1).padStart(2, '0')}`,
        tank_name: `${i + 1}号罐`,
        row_index: Math.floor(i / 4),
        col_index: i % 4
      });
    }
    await tankDao.bulkInsert(null, tanks);
    console.log('已初始化12个料罐');
  }

  // 初始化管理员
  if ((await userDao.countByCode('admin')) === 0) {
    const passwordHash = await bcrypt.hash('admin123', 10);
    await userDao.create(null, { code: 'admin', name: '管理员', password_hash: passwordHash, role: 'admin', created_user_id: null });
    console.log('已创建管理员账户 (工号: admin / 密码: admin123)');
  }

  // 初始化系统配置
  const configs = [
    { key: 'timeout_hours', value: '4', desc: '超时预警时间(小时)' },
    { key: 'board_columns', value: '4', desc: '看板列数' },
    { key: 'board_rows', value: '3', desc: '看板行数' },
    { key: 'refresh_interval', value: '5', desc: '轮询刷新间隔(秒)' }
  ];
  for (const c of configs) {
    await configDao.upsert(null, c.key, c.value, null, c.desc);
  }
  console.log('系统配置已初始化');
};

// 超时检查定时任务
const startTimeoutChecker = () => {
  const tankDao = require('./dao/tankDao');
  const cardDao = require('./dao/cardDao');
  const configDao = require('./dao/configDao');

  setInterval(async () => {
    try {
      const timeoutHours = parseInt(await configDao.getValue('timeout_hours', '4'));
      const pendingCards = await cardDao.findPendingWithTank();
      const now = new Date();

      for (const card of pendingCards) {
        const hoursElapsed = (now - new Date(card.created_at)) / (1000 * 60 * 60);
        if (hoursElapsed >= timeoutHours && card.tank_status !== 'timeout') {
          await tankDao.updateStatus(null, card.tank_id, 'timeout');
          io.emit('tank_status_update', {
            tank_id: card.tank_id,
            status: 'timeout',
            action: 'timeout'
          });
        }
      }
    } catch (error) {
      console.error('超时检查失败:', error);
    }
  }, 60 * 1000);
};

const PORT = process.env.PORT || 3001;

const startServer = async () => {
  try {
    await testConnection();
    await initData();

    server.listen(PORT, () => {
      console.log(`服务器运行在端口 ${PORT}`);
      console.log(`看板地址: http://localhost:${PORT}/board`);
      console.log(`PDA地址: http://localhost:${PORT}/pda`);
      console.log(`后台地址: http://localhost:${PORT}/admin`);
    });

    startTimeoutChecker();
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
};

startServer();
