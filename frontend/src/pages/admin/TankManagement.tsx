import { useEffect, useState, useMemo } from 'react';
import { Table, Button, Space, Modal, Tag, message, Image, Segmented, Select } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EyeOutlined, ClearOutlined, SearchOutlined, AppstoreOutlined, UnorderedListOutlined, SaveOutlined, SwapOutlined } from '@ant-design/icons';
import { tankApi, cardApi } from '../../services/api';
import { useTableEnhance } from '../../utils/tableEnhance';

const calcWaitSec = (ts: number | string) => {
  if (!ts) return 0;
  const timestamp = typeof ts === 'string' ? parseInt(ts) : ts;
  if (isNaN(timestamp) || timestamp <= 0) return 0;
  return Math.floor((Date.now() - timestamp) / 1000);
};

const formatDuration = (seconds: number) => {
  if (seconds < 0) seconds = 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}时${minutes}分`;
};

const formatTime = (time: string) => {
  if (!time) return '-';
  return time.replace('T', ' ');
};

export default function TankManagement() {
  const [tanks, setTanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTank, setEditingTank] = useState<any>(null);
  const [previewCard, setPreviewCard] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [layout, setLayout] = useState({ columns: 4, rows: 3 });
  const [draggingTankId, setDraggingTankId] = useState<number | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [moveModalOpen, setMoveModalOpen] = useState(false);
  const [movingTank, setMovingTank] = useState<any>(null);
  const [targetTankId, setTargetTankId] = useState<number | null>(null);
  const [moving, setMoving] = useState(false);

  const fetchTanks = async () => {
    setLoading(true);
    try {
      const res: any = await tankApi.getAll();
      setTanks(res.data || []);
    } catch (error) {
      message.error('获取料罐列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchLayout = async () => {
    try {
      const res: any = await tankApi.getLayout();
      setLayout(res.data || { columns: 4, rows: 3 });
    } catch (error) {
      // 使用默认值
    }
  };

  useEffect(() => {
    fetchTanks();
    fetchLayout();
  }, []);

  // 拖拽开始
  const handleDragStart = (e: React.DragEvent, tankId: number) => {
    setDraggingTankId(tankId);
    e.dataTransfer.effectAllowed = 'move';
  };

  // 拖拽到某个位置
  const handleDragOver = (e: React.DragEvent, rowIndex: number, colIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // 放置（调整位置）
  const handleDrop = async (e: React.DragEvent, targetRow: number, targetCol: number) => {
    e.preventDefault();
    if (!draggingTankId) return;

    // 找到目标位置已有的料罐
    const targetTank = tanks.find(t => t.row_index === targetRow && t.col_index === targetCol);
    
    // 更新拖拽的料罐位置
    const updatedTanks = tanks.map(t => {
      if (t.id === draggingTankId) {
        return { ...t, row_index: targetRow, col_index: targetCol };
      }
      // 如果目标位置有料罐，交换位置
      if (targetTank && t.id === targetTank.id) {
        const sourceTank = tanks.find(t => t.id === draggingTankId);
        return { ...t, row_index: sourceTank!.row_index, col_index: sourceTank!.col_index };
      }
      return t;
    });

    setTanks(updatedTanks);
    setHasChanges(true);
    setDraggingTankId(null);
  };

  // 保存拖拽调整
  const handleSaveLayout = async () => {
    try {
      setLoading(true);
      // 批量更新料罐位置
      const updates = tanks.map(t => ({
        id: t.id,
        row_index: t.row_index,
        col_index: t.col_index
      }));
      await tankApi.batchUpdateLayout(updates);
      message.success('位置保存成功');
      setHasChanges(false);
    } catch (error: any) {
      message.error(error.message || '保存失败');
      fetchTanks(); // 刷新
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingTank(null);
    setModalOpen(true);
  };

  const handleEdit = (tank: any) => {
    setEditingTank(tank);
    setModalOpen(true);
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingTank) {
        await tankApi.update(editingTank.id, data);
        message.success('更新成功');
      } else {
        await tankApi.create(data);
        message.success('创建成功');
      }
      setModalOpen(false);
      fetchTanks();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  const handleDelete = async (id: number) => {
    Modal.confirm({
      title: '确定删除此料罐？',
      content: '删除后不可恢复，且需要料罐为空罐位状态才能删除。',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await tankApi.delete(id);
          message.success('删除成功');
          fetchTanks();
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      }
    });
  };

  const handleForceClear = async (id: number) => {
    Modal.confirm({
      title: '确定强制清空此罐位？',
      content: '将清除当前流转卡并恢复为空罐位，此操作不可撤销。',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await tankApi.forceClear(id);
          message.success('强制清空成功');
          fetchTanks();
        } catch (error: any) {
          message.error(error.message || '操作失败');
        }
      }
    });
  };

  // 打开"移动流转卡"弹窗
  const handleMoveCard = (tank: any) => {
    setMovingTank(tank);
    setTargetTankId(null);
    setMoveModalOpen(true);
  };

  // 确认移动
  const handleMoveSubmit = async () => {
    if (!movingTank?.current_card_id) {
      message.error('该罐位无流转卡');
      return;
    }
    if (!targetTankId) {
      message.error('请选择目标料罐');
      return;
    }
    setMoving(true);
    try {
      await cardApi.move(movingTank.current_card_id, targetTankId);
      message.success('流转卡移动成功');
      setMoveModalOpen(false);
      setMovingTank(null);
      setTargetTankId(null);
      fetchTanks();
    } catch (error: any) {
      message.error(error.message || '移动失败');
    } finally {
      setMoving(false);
    }
  };

  // 可作为移动目标的料罐：空位且不是当前罐
  const moveTargetOptions = useMemo(() => {
    if (!movingTank) return [];
    return tanks
      .filter(t => t.id !== movingTank.id && !t.current_card_id && t.status === 'idle')
      .map(t => ({
        value: t.id,
        label: `${t.tank_code}${t.tank_name ? `（${t.tank_name}）` : ''} · 第${t.row_index + 1}行第${t.col_index + 1}列`
      }));
  }, [tanks, movingTank]);

  const filteredTanks = tanks.filter(t => {
    if (!searchText) return true;
    const keyword = searchText.toLowerCase();
    return (
      t.tank_code?.toLowerCase().includes(keyword) ||
      t.tank_name?.toLowerCase().includes(keyword)
    );
  });

  const baseColumns = useMemo(() => [
    { title: '罐号', dataIndex: 'tank_code', key: 'tank_code', width: 100, fixed: 'left' as const, sortable: true, searchable: true },
    { title: '名称', dataIndex: 'tank_name', key: 'tank_name', width: 100, sortable: true, searchable: true, render: (v: string) => v || '-' },
    {
      title: '位置',
      key: 'position',
      width: 120,
      sortable: true,
      searchable: false,
      render: (_: any, record: any) => `第${record.row_index + 1}行 第${record.col_index + 1}列`
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      sortable: true,
      searchable: true,
      render: (status: string, record: any) => {
        if (status === 'timeout' || (record.current_card_id && calcWaitSec(record.created_at_ts) > 4 * 3600)) {
          return <Tag color="red">超时</Tag>;
        }
        if (record.current_card_id) {
          return <Tag color="orange">待入库</Tag>;
        }
        return <Tag color="default">空位</Tag>;
      }
    },
    {
      title: '当前流转卡',
      key: 'current_card',
      width: 80,
      resizable: false,
      sortable: false,
      searchable: false,
      render: (_: any, record: any) => record.current_card_id ? (
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => { setPreviewCard(record); setPreviewOpen(true); }}>
          查看
        </Button>
      ) : <span style={{ color: '#bbb' }}>—</span>
    },
    {
      title: '操作',
      key: 'action',
      width: 280,
      fixed: 'right' as const,
      resizable: false,
      sortable: false,
      searchable: false,
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.current_card_id && (
            <Button size="small" icon={<SwapOutlined />} onClick={() => handleMoveCard(record)}>
              移动
            </Button>
          )}
          {record.current_card_id && (
            <Button size="small" danger icon={<ClearOutlined />} onClick={() => handleForceClear(record.id)}>
              强制清空
            </Button>
          )}
          {!record.current_card_id && (
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            >
              删除
            </Button>
          )}
        </Space>
      )
    }
  ], [handleEdit, handleForceClear, handleDelete, handleMoveCard]);

  const { columns: enhancedColumns, filteredData } = useTableEnhance(baseColumns, filteredTanks);

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>料罐管理</h2>
        <Space>
          <input
            placeholder="搜索罐号/名称"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            style={{ padding: '6px 12px', border: '1px solid #d9d9d9', borderRadius: 6, width: 200 }}
          />
          <Segmented
            value={viewMode}
            onChange={(value) => setViewMode(value as 'list' | 'grid')}
            options={[
              { label: <><UnorderedListOutlined /> 列表</>, value: 'list' },
              { label: <><AppstoreOutlined /> 网格</>, value: 'grid' },
            ]}
          />
          {viewMode === 'grid' && hasChanges && (
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveLayout}>
              保存位置
            </Button>
          )}
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增料罐
          </Button>
        </Space>
      </div>

      {viewMode === 'list' ? (
        <Table
          columns={enhancedColumns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          pagination={{
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条`
          }}
          scroll={{ x: 1000 }}
          rowClassName={(record: any) => record.status === 'timeout' ? 'row-timeout' : ''}
        />
      ) : (
        // 网格视图 - 支持拖拽
        <div style={{ padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
          <div style={{ marginBottom: 12, color: '#666', fontSize: 13 }}>
            💡 拖拽料罐卡片可调整位置，修改后点击"保存位置"
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${layout.columns}, 1fr)`,
              gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
              gap: 8,
              minHeight: 400
            }}
          >
            {Array.from({ length: layout.rows * layout.columns }).map((_, index) => {
              const rowIndex = Math.floor(index / layout.columns);
              const colIndex = index % layout.columns;
              const tank = tanks.find(t => t.row_index === rowIndex && t.col_index === colIndex);
              
              return (
                <div
                  key={index}
                  onDragOver={(e) => handleDragOver(e, rowIndex, colIndex)}
                  onDrop={(e) => handleDrop(e, rowIndex, colIndex)}
                  style={{
                    background: tank ? '#fff' : 'rgba(255,255,255,0.5)',
                    border: tank ? '2px solid ' + (tank.status === 'timeout' ? '#ff4d4f' : tank.current_card_id ? '#fa8c16' : '#d9d9d9') : '2px dashed #d9d9d9',
                    borderRadius: 8,
                    padding: 12,
                    minHeight: 80,
                    display: 'flex',
                    flexDirection: 'column',
                    cursor: tank ? 'grab' : 'default',
                    opacity: draggingTankId && tank?.id === draggingTankId ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  {tank ? (
                    <div
                      draggable
                      onDragStart={(e) => handleDragStart(e, tank.id)}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
                    >
                      <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>
                        {tank.tank_code}
                      </div>
                      <div style={{ color: '#666', fontSize: 12, marginBottom: 4 }}>
                        {tank.tank_name || '-'}
                      </div>
                      <div style={{ marginTop: 'auto', display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {tank.status === 'timeout' && <Tag color="red">超时</Tag>}
                        {tank.current_card_id && <Tag color="orange">待入库</Tag>}
                        {!tank.current_card_id && tank.status === 'idle' && <Tag>空位</Tag>}
                        <Button size="small" type="link" icon={<EditOutlined />} onClick={() => handleEdit(tank)}>编辑</Button>
                        {tank.current_card_id && (
                          <>
                            <Button size="small" type="link" icon={<SwapOutlined />} onClick={() => handleMoveCard(tank)}>移动</Button>
                            <Button size="small" type="link" danger icon={<ClearOutlined />} onClick={() => handleForceClear(tank.id)}>清空</Button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: '#bbb', fontSize: 12, textAlign: 'center', lineHeight: '100%' }}>
                      空位
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <TankFormModal
        open={modalOpen}
        tank={editingTank}
        onCancel={() => setModalOpen(false)}
        onSubmit={handleSubmit}
      />

      {/* 流转卡预览 */}
      <Modal
        title="流转卡详情"
        open={previewOpen}
        onCancel={() => setPreviewOpen(false)}
        footer={[
          <Button key="move" icon={<SwapOutlined />} onClick={() => {
            if (previewCard) {
              setMoveModalOpen(true);
              setMovingTank(previewCard);
              setTargetTankId(null);
              setPreviewOpen(false);
            }
          }}>移动到其他罐</Button>,
          <Button key="clear" danger icon={<ClearOutlined />} onClick={() => {
            if (previewCard) {
              handleForceClear(previewCard.id);
              setPreviewOpen(false);
            }
          }}>强制清空</Button>,
          <Button key="close" onClick={() => setPreviewOpen(false)}>关闭</Button>
        ]}
        width={560}
      >
        {previewCard && (
          <div style={{ textAlign: 'center' }}>
            {previewCard.image_url ? (
              <Image src={previewCard.image_url} alt="流转卡" style={{ maxHeight: 360 }} />
            ) : (
              <div style={{ padding: 40, background: '#f5f5f5', borderRadius: 8, color: '#999' }}>暂无图片</div>
            )}
            <div style={{ marginTop: 16, textAlign: 'left', padding: '12px 16px', background: '#f5f5f5', borderRadius: 6 }}>
              <div style={{ marginBottom: 8 }}><strong>料罐编号：</strong>{previewCard.tank_code}</div>
              <div style={{ marginBottom: 8 }}><strong>上传人：</strong>
                {previewCard.created_user_name
                  ? previewCard.created_user_code
                    ? `${previewCard.created_user_name}（${previewCard.created_user_code}）`
                    : previewCard.created_user_name
                  : '—'}
              </div>
              <div style={{ marginBottom: 8 }}><strong>挂卡时间：</strong>{formatTime(previewCard.created_at)}</div>
              <div><strong>挂卡时长：</strong>{formatDuration(calcWaitSec(previewCard.created_at_ts))}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* 移动流转卡弹窗 */}
      <Modal
        title="移动流转卡"
        open={moveModalOpen}
        onCancel={() => { setMoveModalOpen(false); setMovingTank(null); setTargetTankId(null); }}
        footer={[
          <Button key="cancel" onClick={() => { setMoveModalOpen(false); setMovingTank(null); setTargetTankId(null); }}>取消</Button>,
          <Button key="submit" type="primary" loading={moving} onClick={handleMoveSubmit}>
            确认移动
          </Button>
        ]}
        width={440}
      >
        {movingTank && (
          <div>
            <div style={{ marginBottom: 12, padding: '10px 14px', background: '#f5f5f5', borderRadius: 6 }}>
              <div style={{ marginBottom: 4 }}><strong>源料罐：</strong>{movingTank.tank_code}{movingTank.tank_name ? `（${movingTank.tank_name}）` : ''}</div>
              <div><strong>流转卡ID：</strong>{movingTank.current_card_id}</div>
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={{ display: 'block', marginBottom: 6, color: '#333' }}>选择目标料罐 <span style={{ color: '#ff4d4f' }}>*</span></label>
              <Select
                style={{ width: '100%' }}
                placeholder="请选择空闲罐位"
                value={targetTankId}
                onChange={(v) => setTargetTankId(v)}
                options={moveTargetOptions}
                notFoundContent="无可用空位"
                showSearch
                optionFilterProp="label"
              />
            </div>
            <div style={{ color: '#999', fontSize: 12 }}>
              💡 仅可选择空闲状态的料罐。移动后源罐位将变为空位，目标罐位变为待入库。
            </div>
          </div>
        )}
      </Modal>

      <style>{`
        .row-timeout td { background-color: #fff1f0 !important; }
        .row-timeout:hover td { background-color: #ffccc7 !important; }
      `}</style>
    </div>
  );
}

function TankFormModal({ open, tank, onCancel, onSubmit }: any) {
  const [code, setCode] = useState(tank?.tank_code || '');
  const [name, setName] = useState(tank?.tank_name || '');
  const [rowIdx, setRowIdx] = useState((tank?.row_index ?? 0) + 1);
  const [colIdx, setColIdx] = useState((tank?.col_index ?? 0) + 1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setCode(tank?.tank_code || '');
      setName(tank?.tank_name || '');
      setRowIdx((tank?.row_index ?? 0) + 1);
      setColIdx((tank?.col_index ?? 0) + 1);
    }
  }, [open, tank]);

  const handleSubmit = async () => {
    if (!code.trim()) {
      message.error('请输入罐号');
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        tank_code: code.trim(),
        tank_name: name.trim(),
        row_index: rowIdx - 1,
        col_index: colIdx - 1
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={tank ? '编辑料罐' : '新增料罐'}
      open={open}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel}>取消</Button>,
        <Button key="submit" type="primary" loading={submitting} onClick={handleSubmit}>
          {tank ? '保存' : '创建'}
        </Button>
      ]}
      width={420}
    >
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 4, color: '#333' }}>罐号 <span style={{ color: '#ff4d4f' }}>*</span></label>
        <input
          style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: 6 }}
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="如 T-01"
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
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 4, color: '#333' }}>行位置</label>
          <input
            type="number" min={0} max={10}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: 6 }}
            value={rowIdx}
            onChange={e => setRowIdx(parseInt(e.target.value) || 0)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', marginBottom: 4, color: '#333' }}>列位置</label>
          <input
            type="number" min={0} max={10}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: 6 }}
            value={colIdx}
            onChange={e => setColIdx(parseInt(e.target.value) || 0)}
          />
        </div>
      </div>
    </Modal>
  );
}
