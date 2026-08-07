import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  FileTextOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  ToolOutlined,
  ApartmentOutlined
} from '@ant-design/icons';
import Dashboard from './Dashboard';
import TankManagement from './TankManagement';
import CardRecords from './CardRecords';
import OperationLogs from './OperationLogs';
import SystemSettings from './SystemSettings';
import ProductionLine from './ProductionLine';
import Login from './Login';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import { getStoredUser, removeStoredToken } from '../../utils/auth';

const { Header, Sider, Content } = Layout;

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<any>(getStoredUser);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);

  if (!user) {
    return <Login onLoginSuccess={(u: any) => setUser(u)} />;
  }

  const handleLogout = () => {
    removeStoredToken();
    window.location.reload();
  };

  const menuItems = [
    { key: '/dashboard', icon: <DashboardOutlined />, label: '看板总览' },
    { key: '/production-lines', icon: <ApartmentOutlined />, label: '生产线管理' },
    { key: '/tanks', icon: <AppstoreOutlined />, label: '料罐管理' },
    { key: '/cards', icon: <FileTextOutlined />, label: '流转卡记录' },
    { key: '/logs', icon: <ToolOutlined />, label: '操作日志' },
    { key: '/settings', icon: <SettingOutlined />, label: '系统设置' }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        theme="dark"
        width={200}
        style={{
          boxShadow: '2px 0 8px rgba(0,0,0,0.15)'
        }}
      >
        <div style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: collapsed ? 14 : 18,
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          letterSpacing: 1
        }}>
          {collapsed ? 'YT' : '料罐看板管理'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 1px 4px rgba(0,21,41,0.08)'
        }}>
          <div style={{ color: '#333', fontSize: 14 }}>
            当前位置：{menuItems.find(m => m.key === location.pathname)?.label || '看板总览'}
          </div>
          <Dropdown
            menu={{
              items: [
                { key: 'profile', icon: <UserOutlined />, label: `${user.name}（${user.code}）`, disabled: true },
                { type: 'divider' },
                { key: 'password', icon: <SettingOutlined />, label: '修改密码' },
                { key: 'logout', icon: <LogoutOutlined />, label: '退出登录' }
              ],
              onClick: ({ key }) => {
                if (key === 'logout') handleLogout();
                if (key === 'password') setPwdModalOpen(true);
              }
            }}
            placement="bottomRight"
          >
            <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1890ff' }} />
              <span style={{ fontSize: 14 }}>{user.name}</span>
            </div>
          </Dropdown>
        </Header>
        <Content style={{
          margin: 16,
          background: '#f5f5f5',
          borderRadius: 8,
          padding: 20,
          overflow: 'auto'
        }}>
          <div style={{ background: '#fff', borderRadius: 8, padding: 24, minHeight: 'calc(100vh - 120px)' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/production-lines" element={<ProductionLine />} />
              <Route path="/tanks" element={<TankManagement />} />
              <Route path="/cards" element={<CardRecords />} />
              <Route path="/logs" element={<OperationLogs />} />
              <Route path="/settings" element={<SystemSettings />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Content>
      </Layout>
      <ChangePasswordModal open={pwdModalOpen} onClose={() => setPwdModalOpen(false)} />
    </Layout>
  );
}

export default function AdminApp() {
  return <AdminLayout />;
}
