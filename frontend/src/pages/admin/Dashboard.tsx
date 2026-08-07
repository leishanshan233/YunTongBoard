import { useEffect, useState } from 'react';
import { Card, Row, Col, Tag, Button, Table, Space, Modal, Image, Badge, Tabs } from 'antd';
import {
  ReloadOutlined,
  PlusOutlined,
  EyeOutlined,
  ClearOutlined,
  EditOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { tankApi, productionLineApi } from '../../services/api';

// 格式化挂卡时长
const formatDuration = (seconds: number) => {
  if (seconds < 0) seconds = 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}时${minutes}分`;
};

// 计算挂卡时长（秒）
const calcWaitSec = (ts: number | string) => {
  if (!ts) return 0;
  const timestamp = typeof ts === 'string' ? parseInt(ts) : ts;
  if (isNaN(timestamp) || timestamp <= 0) return 0;
  return Math.floor((Date.now() - timestamp) / 1000);
};

// 挂卡时间格式化
const formatTime = (time: string) => {
  if (!time) return '-';
  return time.replace('T', ' ');
};

export default function Dashboard() {
  const [stats, setStats] = useState<any>({});
  const [tanks, setTanks] = useState<any[]>([]);
  const [lines, setLines] = useState<any[]>([]);
  const [selectedLineId, setSelectedLineId] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [previewCard, setPreviewCard] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTank, setEditingTank] = useState<any>(null);

  const loadLines = async () => {
    try {
      const res: any = await productionLineApi.getAll();
      setLines(res.data || []);
      if ((res.data || []).length > 0) setSelectedLineId(res.data[0].id);
    } catch (e) {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const lineQuery: any = selectedLineId === 'all' ? {} : { production_line_id: selectedLineId };
      const [statsRes, tanksRes]: any = await Promise.all([
        tankApi.getStats(lineQuery),
        tankApi.getAll(lineQuery)
      ]);
      setStats(statsRes.data || {});
      setTanks(tanksRes.data || []);
    } catch (error) {
      console.error('获取数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLines(); }, []);
  useEffect(() => {
    if (selectedLineId === 'all' && lines.length === 0) return;
    fetchData();
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
  }, [selectedLineId, lines.length]);

  const getFilteredTanks = () => {
    switch (activeFilter) {
      case 'pending':
        return tanks.filter(t => t.current_card_id && t.status !== 'timeout');
      case 'timeout':
        return tanks.filter(t => t.status === 'timeout');
      case 'idle':
        return tanks.filter(t => !t.current_card_id || t.status === 'idle');
      default:
        return tanks;
    }
  };

  const handleForceClear = async (id: number) => {
    Modal.confirm({
      title: '确定强制清空此罐位？',
      content: '将清除当前流转卡并恢复为空罐位，此操作不可撤销。',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await tankApi.forceClear(id);
          fetchData();
        } catch (e: any) {
          Modal.error({ title: '操作失败', content: e.message || '请重试' });
        }
      }
    });
  };

  const handleView = (tank: any) => {
    setPreviewCard(tank);
    setPreviewOpen(true);
  };

  const handleEdit = (tank: any) => {
    setEditingTank(tank);
    setEditOpen(true);
  };

  const columns = [
    { title: '罐号', dataIndex: 'tank_code', key: 'tank_code', width: 90, fixed: 'left' as const },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: any) => {
        if (status === 'timeout' || (record.current_card_id && calcWaitSec(record.created_at_ts) > 4 * 3600)) {
          return <Tag color="red"><WarningOutlined /> 超时</Tag>;
        }
        if (record.current_card_id) {
          return <Tag color="orange">待入库</Tag>;
        }
        return <Tag color="default">空位</Tag>;
      }
    },
    {
      title: '当前流转卡',
      dataIndex: 'image_url',
      key: 'image_url',
      width: 120,
      render: (url: string, record: any) => {
        if (!record.current_card_id) return <span style={{ color: '#bbb' }}>—</span>;
        return url ? (
          <img src={url} alt="流转卡" style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, border: '1px solid #eee' }} />
        ) : (
          <span style={{ color: '#bbb' }}>无图片</span>
        );
      }
    },
    {
      title: '上传人',
      dataIndex: 'created_user_name',
      key: 'created_user_name',
      width: 120,
      render: (text: string, record: any) => {
        if (!record.current_card_id) return <span style={{ color: '#bbb' }}>—</span>;
        return text || '—';
      }
    },
    {
      title: '挂卡时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (time: string, record: any) => {
        if (!record.current_card_id) return <span style={{ color: '#bbb' }}>—</span>;
        return formatTime(time);
      }
    },
    {
      title: '挂卡时长',
      key: 'wait_duration',
      width: 120,
      render: (_: any, record: any) => {
        if (!record.current_card_id) return <span style={{ color: '#bbb' }}>—</span>;
        const secs = calcWaitSec(record.created_at_ts);
        const isTimeout = record.status === 'timeout' || secs > 4 * 3600;
        return (
          <span style={{ color: isTimeout ? '#ff4d4f' : '#fa8c16', fontWeight: isTimeout ? 600 : 400 }}>
            {isTimeout && <WarningOutlined />} {formatDuration(secs)}
          </span>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      fixed: 'right' as const,
      render: (_: any, record: any) => (
        <Space size="small">
          {record.current_card_id ? (
            <Button size="small" icon={<EyeOutlined />} type="link" onClick={() => handleView(record)}>
              查看
            </Button>
          ) : (
            <Button size="small" icon={<EditOutlined />} type="link" onClick={() => handleEdit(record)}>
              编辑
            </Button>
          )}
          {record.current_card_id && (
            <Button size="small" danger icon={<ClearOutlined />} type="link" onClick={() => handleForceClear(record.id)}>
              强制清空
            </Button>
          )}
        </Space>
      )
    }
  ];

  const tabs = [
    { key: 'all', label: `全部 ${tanks.length}` },
    { key: 'pending', label: `待入库 ${tanks.filter(t => t.current_card_id && t.status !== 'timeout').length}` },
    { key: 'timeout', label: `超时 ${tanks.filter(t => t.status === 'timeout').length}` },
    { key: 'idle', label: `空位 ${tanks.filter(t => !t.current_card_id).length}` }
  ];

  return (
    <div>
      {/* 顶部操作栏 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h2 style={{ margin: 0 }}>看板总览 / 料罐状态管理</h2>
          <Tabs
            tabPosition="top"
            activeKey={String(selectedLineId)}
            onChange={(k) => setSelectedLineId(k === 'all' ? 'all' : Number(k))}
            style={{ marginLeft: 8 }}
            size="small"
            items={[
              { key: 'all', label: '全部' },
              ...lines.map(l => ({ key: String(l.id), label: l.name }))
            ]}
          />
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchData}>刷新数据</Button>
          <Button type="primary" icon={<PlusOutlined />}>新增料罐</Button>
        </Space>
      </div>

      {/* 看板缩略图 + 统计 */}
      <Row gutter={16} style={{ marginBottom: 20 }}>
        {/* 看板预览卡片 */}
        <Col span={10}>
          <Card
            bodyStyle={{ padding: 16 }}
            style={{ height: '100%' }}
          >
            <div style={{ display: 'flex', gap: 16 }}>
              {/* 缩略图 */}
              <div
                style={{
                  width: 180,
                  height: 120,
                  background: 'linear-gradient(135deg, #1a252f 0%, #2c3e50 100%)',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gridTemplateRows: 'repeat(3, 1fr)', gap: 3, width: '85%', height: '75%' }}>
                  {Array.from({ length: 12 }).map((_, i) => {
                    const tank = tanks[i];
                    const hasCard = tank?.current_card_id;
                    const isTimeout = tank?.status === 'timeout';
                    return (
                      <div
                        key={i}
                        style={{
                          background: isTimeout ? '#ff4d4f' : hasCard ? '#fa8c16' : '#4a5568',
                          borderRadius: 2,
                          opacity: 0.85
                        }}
                      />
                    );
                  })}
                </div>
              </div>
              {/* 信息 */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
                  一号包装线 · 成品料罐看板
                </div>
                <div style={{ color: '#666', fontSize: 13, lineHeight: 1.8 }}>
                  <div>当前布局：4列 × 3行（共12个料罐位）</div>
                  <div>最后更新：{new Date().toLocaleString('zh-CN')}</div>
                  <div>数据源：实时同步</div>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        {/* 统计卡片 */}
        <Col span={14}>
          <Row gutter={12}>
            <Col span={6}>
              <Card bodyStyle={{ padding: 12, textAlign: 'center' }}>
                <div style={{ color: '#fa8c16', fontSize: 13, marginBottom: 4 }}>待入库</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#fa8c16' }}>
                  {tanks.filter(t => t.current_card_id && t.status !== 'timeout').length}
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card bodyStyle={{ padding: 12, textAlign: 'center' }}>
                <div style={{ color: '#ff4d4f', fontSize: 13, marginBottom: 4 }}>超时预警</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#ff4d4f' }}>
                  {tanks.filter(t => t.status === 'timeout').length}
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card bodyStyle={{ padding: 12, textAlign: 'center' }}>
                <div style={{ color: '#8c8c8c', fontSize: 13, marginBottom: 4 }}>空罐位</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#8c8c8c' }}>
                  {tanks.filter(t => !t.current_card_id).length}
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Card bodyStyle={{ padding: 12, textAlign: 'center' }}>
                <div style={{ color: '#52c41a', fontSize: 13, marginBottom: 4 }}>今日已入库</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#52c41a' }}>
                  {stats.todayConfirmed || 0}
                </div>
              </Card>
            </Col>
          </Row>
        </Col>
      </Row>

      {/* 料罐列表 */}
      <Card
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 16, fontWeight: 600 }}>料罐列表（共 {tanks.length} 个）</span>
          </div>
        }
        extra={
          <Space>
            {tabs.map(tab => (
              <Button
                key={tab.key}
                type={activeFilter === tab.key ? 'primary' : 'default'}
                size="small"
                onClick={() => setActiveFilter(tab.key)}
              >
                {tab.label}
              </Button>
            ))}
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={getFilteredTanks()}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 1100 }}
          rowClassName={(record: any) => record.status === 'timeout' ? 'row-timeout' : ''}
        />
      </Card>

      {/* 查看大图弹窗 */}
      <Modal
        title="流转卡详情"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={[
          <Button key="clear" danger icon={<ClearOutlined />} onClick={() => {
            if (previewCard) {
              handleForceClear(previewCard.id);
              setPreviewOpen(false);
            }
          }}>
            强制清空
          </Button>,
          <Button key="close" onClick={() => setPreviewOpen(false)}>关闭</Button>
        ]}
        width={560}
      >
        {previewCard && (
          <div style={{ textAlign: 'center' }}>
            <Image src={previewCard.image_url} alt="流转卡" style={{ maxHeight: 380 }} />
            <div style={{ marginTop: 16, textAlign: 'left', padding: '12px 16px', background: '#f5f5f5', borderRadius: 6 }}>
              <div style={{ marginBottom: 8 }}><strong>料罐编号：</strong>{previewCard.tank_code}</div>
              <div style={{ marginBottom: 8 }}><strong>状态：</strong>
                {previewCard.status === 'timeout' ? <Tag color="red">超时</Tag> : <Tag color="orange">待入库</Tag>}
              </div>
              <div style={{ marginBottom: 8 }}><strong>上传人：</strong>{previewCard.created_user_name || '—'}</div>
              <div style={{ marginBottom: 8 }}><strong>挂卡时间：</strong>{formatTime(previewCard.created_at)}</div>
              <div><strong>挂卡时长：</strong>
                <span style={{ color: previewCard.status === 'timeout' ? '#ff4d4f' : '#fa8c16', fontWeight: 600 }}>
                  {formatDuration(calcWaitSec(previewCard.created_at_ts))}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* 编辑弹窗 */}
      <Modal
        title="编辑料罐"
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        footer={null}
        width={400}
      >
        {editingTank && (
          <EditTankForm
            tank={editingTank}
            onCancel={() => setEditOpen(false)}
            onSuccess={() => {
              setEditOpen(false);
              fetchData();
            }}
          />
        )}
      </Modal>

      <style>{`
        .row-timeout td {
          background-color: #fff1f0 !important;
        }
        .row-timeout:hover td {
          background-color: #ffccc7 !important;
        }
      `}</style>
    </div>
  );
}

// 编辑料罐子组件
function EditTankForm({ tank, onCancel, onSuccess }: any) {
  const [code, setCode] = useState(tank.tank_code);
  const [name, setName] = useState(tank.tank_name || '');
  const [rowIdx, setRowIdx] = useState(tank.row_index);
  const [colIdx, setColIdx] = useState(tank.col_index);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await tankApi.update(tank.id, {
        tank_code: code,
        tank_name: name,
        row_index: rowIdx,
        col_index: colIdx
      });
      onSuccess();
    } catch (e: any) {
      Modal.error({ title: '保存失败', content: e.message || '请重试' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, color: '#333' }}>罐号</label>
        <input
          style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: 6 }}
          value={code}
          onChange={e => setCode(e.target.value)}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, color: '#333' }}>名称</label>
        <input
          style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: 6 }}
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="如 1号罐"
        />
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 4, color: '#333' }}>行位置</label>
          <input
            type="number"
            min={0}
            max={10}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: 6 }}
            value={rowIdx}
            onChange={e => setRowIdx(parseInt(e.target.value) || 0)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 4, color: '#333' }}>列位置</label>
          <input
            type="number"
            min={0}
            max={10}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: 6 }}
            value={colIdx}
            onChange={e => setColIdx(parseInt(e.target.value) || 0)}
          />
        </div>
      </div>
      <div style={{ textAlign: 'right', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>取消</Button>
        <Button type="primary" loading={submitting} onClick={handleSubmit}>保存</Button>
      </div>
    </div>
  );
}
