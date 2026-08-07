import { useEffect, useState } from 'react';
import { Table, Select, DatePicker, Space, Button, message } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { logApi } from '../../services/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function OperationLogs() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actions, setActions] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    action: undefined as string | undefined,
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 50, total: 0 });

  const fetchActions = async () => {
    try {
      const res: any = await logApi.getActions();
      setActions(res.data);
    } catch (error) {
      console.error('获取操作类型失败:', error);
    }
  };

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: pagination.pageSize,
        ...filters
      };
      const res: any = await logApi.getList(params);
      setData(res.data.list);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
    } catch (error) {
      message.error('获取操作日志失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
    fetchData(1);
  }, []);

  const handleSearch = () => {
    fetchData(1);
  };

  const handleReset = () => {
    setFilters({ action: undefined, start_date: undefined, end_date: undefined });
    setTimeout(() => fetchData(1), 0);
  };

  const getActionLabel = (action: string) => {
    const labelMap: Record<string, string> = {
      upload: '上传流转卡',
      confirm: '确认入库',
      cancel: '取消流转卡',
      force_clear: '强制清空',
      create: '创建',
      update: '更新',
      delete: '删除'
    };
    return labelMap[action] || action;
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1
    },
    {
      title: '操作人',
      dataIndex: 'created_user_name',
      key: 'created_user',
      render: (text: string) => text || '-'
    },
    {
      title: '操作类型',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => getActionLabel(action)
    },
    { title: '料罐ID', dataIndex: 'tank_id', key: 'tank_id', render: (id: number) => id || '-' },
    { title: '流转卡ID', dataIndex: 'card_id', key: 'card_id', render: (id: number) => id || '-' },
    { title: 'IP地址', dataIndex: 'ip_address', key: 'ip_address' },
    {
      title: '操作时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    }
  ];

  return (
    <div>
      <h2 style={{ marginBottom: 16 }}>操作日志</h2>
      
      <Space style={{ marginBottom: 16 }} wrap>
        <Select
          placeholder="操作类型"
          style={{ width: 150 }}
          allowClear
          value={filters.action}
          onChange={(value) => setFilters(prev => ({ ...prev, action: value }))}
          options={actions.map(a => ({ value: a, label: getActionLabel(a) }))}
        />
        <RangePicker
          value={filters.start_date ? [dayjs(filters.start_date), dayjs(filters.end_date)] : null}
          onChange={(dates) => {
            setFilters(prev => ({
              ...prev,
              start_date: dates?.[0]?.format('YYYY-MM-DD'),
              end_date: dates?.[1]?.format('YYYY-MM-DD')
            }));
          }}
        />
        <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>
          搜索
        </Button>
        <Button icon={<ReloadOutlined />} onClick={handleReset}>
          重置
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={data}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`
        }}
        onChange={(page) => fetchData(page.current || 1)}
      />
    </div>
  );
}
