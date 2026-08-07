import io, { Socket } from 'socket.io-client';

// WebSocket 服务地址配置：
// 开发环境: 通过 Vite 代理 /socket.io -> http://localhost:9092
// 生产环境: 通过 Nginx 代理 /socket.io -> http://backend:9092
// VITE_SOCKET_URL 可自定义后端地址
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;
const SOCKET_PATH = '/socket.io'; // socket.io 的路径（默认也是 /socket.io）

/**
 * Socket 服务封装
 * 直接代理底层 socket 的 on/off/connect 方法，保持与原代码兼容
 */
class SocketService {
  private socket: Socket | null = null;

  /** 获取/创建 socket 连接 */
  connect(): Socket {
    if (this.socket) return this.socket;

    this.socket = io(SOCKET_URL, {
      path: SOCKET_PATH,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    this.socket.on('connect', () => {
      console.log('WebSocket 已连接:', this.socket?.id);
    });

    this.socket.on('disconnect', (reason: string) => {
      console.log('WebSocket 断开:', reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('WebSocket 连接错误:', error.message);
    });

    return this.socket;
  }

  /** 订阅事件（代理到底层 socket.on） */
  on(event: string, callback: (...args: any[]) => void) {
    this.connect();
    this.socket?.on(event, callback);
  }

  /** 取消订阅（代理到底层 socket.off） */
  off(event: string, callback?: (...args: any[]) => void) {
    this.socket?.off(event, callback);
  }

  /** 发送事件（代理到底层 socket.emit） */
  emit(event: string, ...args: any[]) {
    this.connect();
    this.socket?.emit(event, ...args);
  }

  /** 断开连接 */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

const socketService = new SocketService();
export { socketService };
export default socketService;
