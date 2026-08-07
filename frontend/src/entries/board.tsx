import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import BoardApp from '../pages/board/BoardApp';
import '../styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider 
      locale={zhCN}
      theme={{ token: { colorPrimary: '#1890ff', borderRadius: 6 } }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<BoardApp />} />
          <Route path="*" element={<BoardApp />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
