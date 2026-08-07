import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import AdminApp from '../pages/admin/AdminApp';
import '../styles/index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider 
      locale={zhCN}
      theme={{ token: { colorPrimary: '#1890ff', borderRadius: 6 } }}
    >
      <BrowserRouter basename="/admin">
        <AdminApp />
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
