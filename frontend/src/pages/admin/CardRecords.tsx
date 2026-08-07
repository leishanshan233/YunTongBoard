import { useEffect, useState } from 'react';
import { Table, DatePicker, Select, Button, Space, Image, Input, message, Tabs } from 'antd';
import { SearchOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons';
import { cardApi, productionLineApi } from '../../services/api';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;

export default function CardRecords() {
  const [data, setData] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    status: undefined as string | undefined,
    start_date: undefined as string | undefined,
    end_date: undefined as string | undefined,
    tank_code: undefined as string | undefined
  });
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20, total: 0 });

  const loadLines = async () => {
    try {
      const res: any = await productionLineApi.getAll();
      setLines(res.data || []);
    } catch (e) {}
  };

  const fetchData = async (page = 1) => {
    setLoading(true);
    try {
      const params: any = {
        page,
        limit: pagination.pageSize,
        ...(selectedLineId === 'all' ? {} : { production_line_id: selectedLineId }),
        ...filters
      };
      const res: any = await cardApi.getList(params);
      setData(res.data.list);
      setPagination(prev => ({ ...prev, current: page, total: res.data.total }));
    } catch (error) {
      message.error('获取流转卡记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLines(); }, []);
  useEffect(() => {
    fetchData(1);
  }, [selectedLineId, lines.length]);

  const handleSearch = () => {
    fetchData(1);
  };

  const handleReset = () => {
    setFilters({ status: undefined, start_date: undefined, end_date: undefined, tank_code: undefined });
    setTimeout(() => fetchData(1), 0);
  };

  // 原图下载
  const handleDownload = (record: any) => {
    if (!record.image_url) {
      message.warning('该记录无图片');
      return;
    }
    const link = document.createElement('a');
    link.href = record.image_url;
    link.download = `流转卡_${record.tank_code || record.id}.jpg`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      title: '序号',
      key: 'index',
      width: 60,
      render: (_: any, __: any, index: number) => (pagination.current - 1) * pagination.pageSize + index + 1
    },
    {
      title: '流转卡',
      dataIndex: 'image_url',
      key: 'image',
      width: 100,
      render: (url: string) => <Image src={url} alt="流转卡" width={60} height={60} style={{ objectFit: 'cover', borderRadius: 4 }} />
    },
    {
      title: '料罐',
      dataIndex: 'tank_code',
      key: 'tank',
      render: (text: string, record: any) => `${record.tank_code || ''} ${record.tank_name || ''}`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; text: string }> = {
          pending: { color: 'orange', text: '待入库' },
          confirmed: { color: 'green', text: '已确认' },
          cancelled: { color: 'default', text: '已取消' }
        };
        const config = statusMap[status];
        return config ? <span style={{ color: config.color }}>{config.text}</span> : status;
      }
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => new Date(time).toLocaleString('zh-CN')
    },
    {
      title: '操作人',
      dataIndex: 'created_user_name',
      key: 'created_user',
      render: (text: string) => text || '-'
    },
    {
      title: '确认人',
      dataIndex: 'confirmer_name',
      key: 'confirmer',
      render: (text: string) => text || '-'
    },
    {
      title: '确认时间',
      dataIndex: 'confirmed_at',
      key: 'confirmed_at',
      render: (time: string) => time ? new Date(time).toLocaleString('zh-CN') : '-'
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Button type="link" size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record)}>
          下载
        </Button>
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <h2 style={{ margin: 0 }}>流转卡记录</h2>
        <Tabs
          tabPosition="top"
          activeKey={String(selectedLineId)}
          onChange={(k) => setSelectedLineId(k === 'all' ? 'all' : Number(k))}
          size="small"
          items={[
            { key: 'all', label: '全部' },
            ...lines.map(l => ({ key: String(l.id), label: l.name }))
          ]}
        />
      </div>
      
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          placeholder="按罐号筛选"
          allowClear
          style={{ width: 150 }}
          value={filters.tank_code}
          onChange={(e) => setFilters(prev => ({ ...prev, tank_code: e.target.value || undefined }))}
        />
        <Select
          placeholder="状态"
          style={{ width: 120 }}
          allowClear
          value={filters.status}
          onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
          options={[
            { value: 'pending', label: '待入库' },
            { value: 'confirmed', label: '已确认' },
            { value: 'cancelled', label: '已取消' }
          ]}
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
        scroll={{ x: 1200 }}
      />
    </div>
  );
}
