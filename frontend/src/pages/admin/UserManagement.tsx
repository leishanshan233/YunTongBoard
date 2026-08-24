import { useEffect, useState, useMemo } from 'react';
import { Button, message, Space, Input, Select, Table, Modal, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, LockOutlined } from '@ant-design/icons';
import { userApi } from '../../services/api';
import { useTableEnhance } from '../../utils/tableEnhance';

export default function UserManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res: any = await userApi.getList();
      setUsers(res.data);
    } catch (error) {
      console.error(error);
      message.error('获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = () => {
    setEditingUser(null);
    setUserModalOpen(true);
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserModalOpen(true);
  };

  const handleUserSubmit = () => {
    setUserModalOpen(false);
    fetchUsers();
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

  const handleResetPassword = async (id: number) => {
    try {
      await userApi.resetPassword(id);
      message.success('密码已重置为 12346');
    } catch (error: any) {
      message.error(error.message || '重置失败');
    }
  };

  const baseUserColumns = useMemo(() => [
    {
      title: '序号',
      key: 'index',
      width: 60,
      sortable: false,
      searchable: false,
      render: (_: any, __: any, index: number) => index + 1
    },
    { title: '工号', dataIndex: 'code', key: 'code', width: 140, sortable: true, searchable: true },
    { title: '姓名', dataIndex: 'name', key: 'name', width: 140, sortable: true, searchable: true },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 100,
      sortable: true,
      searchable: true,
      render: (role: string) => role === 'admin' ? '管理员' : '操作员'
    },
    {
      title: '创建人',
      dataIndex: 'created_user_name',
      key: 'created_user_name',
      width: 160,
      sortable: true,
      searchable: true,
      render: (name: string, record: any) => {
        if (!name) return '系统';
        const code = record.created_user_code;
        return code ? `${name}（${code}）` : name;
      }
    },
    {
      title: '最后登录',
      dataIndex: 'last_login_at',
      key: 'last_login_at',
      width: 170,
      sortable: true,
      searchable: true,
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 220,
      sortable: false,
      searchable: false,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEditUser(record)}>
            编辑
          </Button>
          <Popconfirm
            title="确定重置密码？"
            description="密码将重置为 12346"
            onConfirm={() => handleResetPassword(record.id)}
          >
            <Button size="small" icon={<LockOutlined />}>
              重置密码
            </Button>
          </Popconfirm>
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
  ], [handleEditUser, handleDeleteUser, handleResetPassword]);

  const { columns: enhancedUserColumns, filteredData: filteredUsers } = useTableEnhance(baseUserColumns, users);

  return (
    <div>
      <h2 style={{ marginBottom: 24 }}>用户管理</h2>

      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleAddUser}>新增用户</Button>
      </div>

      <Table
        columns={enhancedUserColumns}
        dataSource={filteredUsers}
        rowKey="id"
        loading={loading}
        pagination={{
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`
        }}
        scroll={{ x: 1000 }}
      />

      {userModalOpen && (
        <UserModal
          user={editingUser}
          onCancel={() => setUserModalOpen(false)}
          onSubmit={handleUserSubmit}
        />
      )}
    </div>
  );
}

function UserModal({ user, onCancel, onSubmit }: { user: any; onCancel: () => void; onSubmit: () => void }) {
  const [form] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      if (user) {
        await userApi.update(user.id, values);
        message.success('更新成功');
      } else {
        await userApi.create(values);
        message.success(values.password ? '创建成功' : '创建成功，初始密码：123456');
      }
      onSubmit();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={user ? '编辑用户' : '新增用户'}
      open={true}
      onCancel={onCancel}
      footer={null}
      width={500}
    >
      <UserForm user={user} onSubmit={handleSubmit} onCancel={onCancel} loading={loading} />
    </Modal>
  );
}

function UserForm({ user, onSubmit, onCancel, loading }: { user: any; onSubmit: (values: any) => void; onCancel: () => void; loading: boolean }) {
  const { Form } = require('antd');

  return (
    <Form
      initialValues={user || {}}
      onFinish={onSubmit}
      layout="vertical"
    >
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
      {!user && (
        <Form.Item
          name="password"
          label="密码"
          tooltip="留空则默认使用 123456"
        >
          <Input.Password placeholder="留空则默认 123456" />
        </Form.Item>
      )}
      {user && (
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
      <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
        <Space>
          <Button onClick={onCancel}>取消</Button>
          <Button type="primary" htmlType="submit" loading={loading}>确定</Button>
        </Space>
      </Form.Item>
    </Form>
  );
}
