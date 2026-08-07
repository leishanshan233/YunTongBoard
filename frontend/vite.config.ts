import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        ws: true
      }
    }
  },
  plugins: [
    react(),
    {
      name: 'multi-page-rewrite',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          // 按前缀匹配，支持子路由刷新（如 /admin/dashboard、/admin/users）
          const url = req.url.split('?')[0];
          if (url === '/board' || url.startsWith('/board/')) {
            req.url = '/board.html';
          } else if (url === '/pda' || url.startsWith('/pda/')) {
            req.url = '/pda.html';
          } else if (url === '/admin' || url.startsWith('/admin/')) {
            req.url = '/admin.html';
          } else if (url === '/' || url === '/index.html') {
            req.url = '/board.html';
          }
          next();
        });
      }
    }
  ],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        board: path.resolve(__dirname, 'board.html'),
        pda: path.resolve(__dirname, 'pda.html'),
        admin: path.resolve(__dirname, 'admin.html')
      }
    }
  }
});
