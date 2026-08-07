import { useState, useEffect } from 'react';
import {
  Card, Button, Table, Space, Modal, Form, Input, InputNumber,
  Popconfirm, message, Tag
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { productionLineApi, tankApi } from '../../services/api';

interface ProductionLine {
  id: number;
  code: string;
  name: string;
  sort_order: number;
  tank_count?: number;
}

export default function ProductionLineManagement() {
  const [lines, setLines] = useState<ProductionLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ProductionLine | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const res: any = await productionLineApi.getAll();
      const list: ProductionLine[] = res.data || [];
      // 计算每个生产线的料罐数
      const tanksRes: any = await tankApi.getAll();
      const allTanks = tanksRes.data || [];
      list.forEach(line => {
        line.tank_count = allTanks.filter((t: any) => t.production_line_id === line.id).length;
      });
      setLines(list);
    } catch (e: any) {
      message.error(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = () => {
    setEditing(null);
    form.setFieldsValue({ code: '', name: '', sort_order: 0 });
    setModalOpen(true);
  };

  const handleEdit = (line: ProductionLine) => {
    setEditing(line);
    form.setFieldsValue({ code: line.code, name: line.name, sort_order: line.sort_order });
    setModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await productionLineApi.delete(id);
      message.success('删除成功');
      fetchData();
    } catch (e: any) {
      message.error(e.message || '删除失败');
    }
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setSubmitting(true);
    try {
      if (editing) {
        await productionLineApi.update(editing.id, values);
        message.success('更新成功');
      } else {
        await productionLineApi.create(values);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchData();
    } catch (e: any) {
      message.error(e.message || '保存失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: '序号',
      key: 'idx',
      width: 70,
      render: (_: any, __: any, i: number) => i + 1
    },
    { title: '生产线编码', dataIndex: 'code', key: 'code', width: 140 },
    { title: '生产线名称', dataIndex: 'name', key: 'name', width: 200 },
    {
      title: '料罐数',
      key: 'tank_count',
      width: 100,
      render: (_: any, record: ProductionLine) => (
        <Tag color="blue">{record.tank_count ?? 0}</Tag>
      )
    },
    { title: '排序', dataIndex: 'sort_order', key: 'sort_order', width: 90 },
    {
      title: '操作',
      key: 'actions',
      width: 220,
      render: (_: any, record: ProductionLine) => (
        <Space>
          <Button size="small" type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          <Popconfirm
            title={`确认删除生产线「${record.name}」？`}
            description={(record.tank_count ?? 0) > 0
              ? `该线还有 ${record.tank_count} 个料罐，请先迁移料罐`
              : '删除后不可恢复'}
            onConfirm={() => handleDelete(record.id)}
            okButtonProps={{ danger: true }}
          >
            <Button size="small" type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Card
        title="生产线管理"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              新增生产线
            </Button>
          </Space>
        }
      >
        <Table
          rowKey="id"
          loading={loading}
          dataSource={lines}
          columns={columns}
          pagination={false}
        />
      </Card>

      <Modal
        title={editing ? '编辑生产线' : '新增生产线'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={handleSubmit}
        confirmLoading={submitting}
        destroyOnClose
        maskClosable={false}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 8 }}>
          <Form.Item
            label="生产线编码"
            name="code"
            rules={[
              { required: true, message: '请输入编码' },
              { max: 50, message: '最多50个字符' }
            ]}
          >
            <Input placeholder="例如 LINE-02" />
          </Form.Item>
          <Form.Item
            label="生产线名称"
            name="name"
            rules={[
              { required: true, message: '请输入名称' },
              { max: 100, message: '最多100个字符' }
            ]}
          >
            <Input placeholder="例如 2号线" />
          </Form.Item>
          <Form.Item label="排序（越小越靠前）" name="sort_order">
            <InputNumber min={0} precision={0} style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
