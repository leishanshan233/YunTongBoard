import { useState } from 'react';
import { Form, Input, Button, Card, message } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { userApi } from '../../services/api';
import { setStoredToken, setStoredUser } from '../../utils/auth';

export default function Login({ onLoginSuccess }: { onLoginSuccess: (user: any) => void }) {
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { code: string; password: string }) => {
    setLoading(true);
    try {
      const res: any = await userApi.login(values.code, values.password);
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      message.success('登录成功');
      onLoginSuccess(res.data.user);
    } catch (error: any) {
      message.error(error.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)'
    }}>
      <Card
        style={{ width: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}
        bodyStyle={{ padding: 32 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <h1 style={{ color: '#1890ff', margin: 0 }}>运通条码</h1>
          <p style={{ color: '#999', marginTop: 8 }}>电子看板管理系统</p>
        </div>
        <Form onFinish={handleLogin} size="large">
          <Form.Item
            name="code"
            rules={[{ required: true, message: '请输入工号' }]}
          >
            <Input prefix={<UserOutlined />} placeholder="工号" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: '请输入密码' }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
