import { useEffect, useState } from 'react';
import { Card, Form, InputNumber, Button, message, Space, Input, Select, Table, Modal, Popconfirm, Switch, Tabs } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { tankApi, userApi, systemApi, productionLineApi } from '../../services/api';

export default function SystemSettings() {
  const [lines, setLines] = useState<any[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<number>(1);
  const [layout, setLayout] = useState({ columns: 4, rows: 3 });
  const [users, setUsers] = useState<any[]>([]);
  const [layoutForm] = Form.useForm();
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userForm] = Form.useForm();
  const [runtimeForm] = Form.useForm();
  const [savingRuntime, setSavingRuntime] = useState(false);

  const loadLines = async () => {
    try {
      const res: any = await productionLineApi.getAll();
      const data = res.data || [];
      setLines(data);
      if (data.length > 0) setSelectedLineId(data[0].id);
    } catch (e) {}
  };

  const fetchLayout = async (lineId: number = selectedLineId) => {
    try {
      const res: any = await tankApi.getLayout({ production_line_id: lineId });
      setLayout(res.data);
      layoutForm.setFieldsValue(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchUsers = async () => {
    try {
      const res: any = await userApi.getList();
      setUsers(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  // 获取运行参数（超时阈值、刷新间隔、通知规则）- 支持生产线
  const fetchRuntime = async (lineId: number = selectedLineId) => {
    try {
      const qs = { production_line_id: lineId };
      const [timeoutRes, refreshRes, notifyRes]: any = await Promise.all([
        systemApi.getConfig('timeout_hours', qs).catch(() => ({ success: false })),
        systemApi.getConfig('refresh_interval', qs).catch(() => ({ success: false })),
        systemApi.getConfig('notify_timeout_enabled', qs).catch(() => ({ success: false }))
      ]);
      runtimeForm.setFieldsValue({
        timeout_hours: timeoutRes.success ? parseInt(timeoutRes.data.config_value) || 4 : 4,
        refresh_interval: refreshRes.success ? parseInt(refreshRes.data.config_value) || 5 : 5,
        notify_timeout_enabled: notifyRes.success ? notifyRes.data.config_value === 'true' : true
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleRuntimeSave = async () => {
    try {
      const values = await runtimeForm.validateFields();
      setSavingRuntime(true);
      const qs = { production_line_id: selectedLineId };
      await Promise.all([
        systemApi.updateConfig('timeout_hours', String(values.timeout_hours), qs),
        systemApi.updateConfig('refresh_interval', String(values.refresh_interval), qs),
        systemApi.updateConfig('notify_timeout_enabled', String(values.notify_timeout_enabled), qs)
      ]);
      message.success('运行参数保存成功');
    } catch (error: any) {
      message.error(error.message || '保存失败');
    } finally {
      setSavingRuntime(false);
    }
  };

  useEffect(() => { loadLines(); }, []);
  useEffect(() => {
    if (selectedLineId && lines.length > 0) {
      fetchLayout(selectedLineId);
      fetchRuntime(selectedLineId);
    }
  }, [selectedLineId, lines.length]);
  useEffect(() => { fetchUsers(); }, []);

  const handleLayoutSave = async () => {
    try {
      const values = await layoutForm.validateFields();
      await tankApi.updateLayout(values, { production_line_id: selectedLineId });
      message.success('布局保存成功');
      fetchLayout(selectedLineId);
    } catch (error: any) {
      message.error(error.message || '保存失败');
    }
  };

  const handleAddUser = () => {
    setEditingUser(null);
    userForm.resetFields();
    setUserModalOpen(true);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    userForm.setFieldsValue(user);
    setUserModalOpen(true);
  };

  const handleUserSubmit = async () => {
    try {
      const values = await userForm.validateFields();
      if (editingUser) {
        await userApi.update(editingUser.id, values);
        message.success('更新成功');
      } else {
        await userApi.create(values);
        message.success(values.password ? '创建成功' : '创建成功，初始密码：123456');
      }
      setUserModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleDeleteUser = async (id: number) => {
    try {
      await userApi.delete(id);
      message.success('删除成功');
      fetchUsers();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  const userColumns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1
    },
    { title: '工号', dataIndex: 'code', key: 'code' },
    { title: '姓名', dataIndex: 'name', key: 'name' },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => role === 'admin' ? '管理员' : '操作员'
    },
    {
      title: '创建人',
      dataIndex: 'created_user_name',
      key: 'created_user_name',
      render: (name: string) => name || '系统'
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditUser(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定删除此用户？"
            onConfirm={() => handleDeleteUser(record.id)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>系统设置</h2>
        <Tabs
          tabPosition="top"
          activeKey={String(selectedLineId)}
          onChange={(k) => setSelectedLineId(Number(k))}
          size="small"
          items={lines.map(l => ({ key: String(l.id), label: l.name }))}
        />
      </div>

      <Card title="看板布局设置" style={{ marginBottom: 24 }}>
        <Form form={layoutForm} layout="inline">
          <Form.Item
            name="columns"
            label="列数"
            rules={[{ required: true, message: '请输入列数' }]}
          >
            <InputNumber min={1} max={10} />
          </Form.Item>
          <Form.Item
            name="rows"
            label="行数"
            rules={[{ required: true, message: '请输入行数' }]}
          >
            <InputNumber min={1} max={10} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" onClick={handleLayoutSave}>保存布局</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="运行参数设置" style={{ marginBottom: 24 }}>
        <Form form={runtimeForm} layout="inline">
          <Form.Item
            name="timeout_hours"
            label="超时阈值"
            rules={[{ required: true, message: '请输入超时阈值' }]}
            tooltip="流转卡挂卡超过此时间将标记为超时预警"
          >
            <InputNumber min={1} max={72} addonAfter="小时" />
          </Form.Item>
          <Form.Item
            name="refresh_interval"
            label="刷新间隔"
            rules={[{ required: true, message: '请输入刷新间隔' }]}
            tooltip="看板自动刷新数据的间隔时间"
          >
            <InputNumber min={3} max={60} addonAfter="秒" />
          </Form.Item>
          <Form.Item
            name="notify_timeout_enabled"
            label="超时通知"
            valuePropName="checked"
            tooltip="开启后，超时罐位在看板上高亮预警"
          >
            <Switch checkedChildren="开" unCheckedChildren="关" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" loading={savingRuntime} onClick={handleRuntimeSave}>保存参数</Button>
          </Form.Item>
        </Form>
      </Card>

      <Card 
        title="用户管理"
        extra={<Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>新增用户</Button>}
      >
        <Table
          columns={userColumns}
          dataSource={users}
          rowKey="id"
          pagination={false}
        />
      </Card>

      <Modal
        title={editingUser ? '编辑用户' : '新增用户'}
        open={userModalOpen}
        onCancel={() => setUserModalOpen(false)}
        onOk={handleUserSubmit}
      >
        <Form form={userForm} layout="vertical">
          <Form.Item
            name="code"
            label="工号"
            rules={[{ required: true, message: '请输入工号' }]}
          >
            <Input placeholder="请输入工号" />
          </Form.Item>
          <Form.Item
            name="name"
            label="姓名"
            rules={[{ required: true, message: '请输入姓名' }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              name="password"
              label="密码"
              tooltip="留空则默认使用 123456"
            >
              <Input.Password placeholder="留空则默认 123456" />
            </Form.Item>
          )}
          {editingUser && (
            <Form.Item name="password" label="新密码（可选）">
              <Input.Password placeholder="留空表示不修改" />
            </Form.Item>
          )}
          <Form.Item
            name="role"
            label="角色"
            rules={[{ required: true, message: '请选择角色' }]}
          >
            <Select
              options={[
                { value: 'operator', label: '操作员' },
                { value: 'admin', label: '管理员' }
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
