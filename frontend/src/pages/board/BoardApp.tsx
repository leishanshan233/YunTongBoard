import React, { useState, useEffect, useCallback, useRef } from 'react';
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { tankApi, cardApi, userApi, systemApi, productionLineApi } from '../../services/api';
import { socketService } from '../../services/socket';
import { isAuthenticated, setStoredToken, setStoredUser, getStoredUser, removeStoredToken } from '../../utils/auth';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import './BoardApp.css';

// 从 URL 获取 line 参数
const getLineParam = (): string | null => {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  return params.get('line');
};

// 格式化时长：始终显示 X时X分
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

const BoardApp: React.FC = () => {
  const [loggedIn, setLoggedIn] = useState(isAuthenticated());
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [currentUser, setCurrentUser] = useState(getStoredUser());
  const [tanks, setTanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTank, setSelectedTank] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [countdown, setCountdown] = useState(15);
  const [confirming, setConfirming] = useState(false);
  const [timeoutHours, setTimeoutHours] = useState(4);
  const [todayConfirmed, setTodayConfirmed] = useState(0);
  const [boardLayout, setBoardLayout] = useState({ columns: 4, rows: 3 });
  const [currentLine, setCurrentLine] = useState<any>(null);  // 当前生产线对象
  const [allLines, setAllLines] = useState<any[]>([]);       // 所有生产线（用于 URL 无参数时展示选择）
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 读取当前 line_id：URL?line=X 优先
  const lineId = getLineParam();

  // 加载数据：按当前生产线筛选
  const loadData = useCallback(async () => {
    try {
      const lineQuery = lineId ? { production_line_id: lineId } : undefined;
      const [tanksRes, statsRes, layoutRes]: any = await Promise.all([
        tankApi.getAll(lineQuery),
        tankApi.getStats(lineQuery).catch(() => ({ success: false, data: {} })),
        tankApi.getLayout(lineQuery).catch(() => ({ success: false }))
      ]);
      if (tanksRes.success) {
        setTanks(tanksRes.data || []);
      }
      if (statsRes.success && statsRes.data) {
        setTodayConfirmed(statsRes.data.todayConfirmed || 0);
      }
      if (layoutRes.success && layoutRes.data) {
        setBoardLayout(layoutRes.data);
      }
    } catch (e) {
      console.error('加载失败:', e);
    } finally {
      setLoading(false);
    }
  }, [lineId]);

  // 加载当前生产线名和所有线
  useEffect(() => {
    if (!loggedIn) return;
    (async () => {
      try {
        const res: any = await productionLineApi.getAll();
        if (res.success) {
          const lines = res.data || [];
          setAllLines(lines);
          if (lineId) {
            const found = lines.find((l: any) => String(l.id) === String(lineId));
            setCurrentLine(found || null);
          }
        }
      } catch (e) { /* ignore */ }
    })();
  }, [loggedIn, lineId]);

  // 看板登录
  const handleLogin = async () => {
    if (!code || !password) {
      setLoginError('请输入工号和密码');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res: any = await userApi.login(code, password);
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      setCurrentUser(res.data.user);
      setLoggedIn(true);
      setCode('');
      setPassword('');
    } catch (error: any) {
      setLoginError(error.message || '登录失败');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    removeStoredToken();
    setCurrentUser(null);
    setLoggedIn(false);
  };

  // 实时时钟
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 初始化 + 定时刷新（仅登录后启动）
  useEffect(() => {
    if (!loggedIn) return;
    loadData();
    const timer = setInterval(loadData, 5000);
    return () => clearInterval(timer);
  }, [loggedIn, loadData]);

  // 加载超时配置（按生产线隔离，仅登录后）
  useEffect(() => {
    if (!loggedIn) return;
    const params = lineId ? { production_line_id: lineId } : undefined;
    systemApi.getConfig('timeout_hours', params)
      .then((d: any) => { if (d.success) setTimeoutHours(parseInt(d.data.config_value) || 4); })
      .catch(() => {});
  }, [loggedIn, lineId]);

  // WebSocket（仅登录后启动）
  useEffect(() => {
    if (!loggedIn) return;
    const onUpdate = () => loadData();
    socketService.on('tank_status_update', onUpdate);
    socketService.on('new_card_uploaded', onUpdate);
    socketService.on('card_confirmed', onUpdate);
    return () => {
      socketService.off('tank_status_update', onUpdate);
      socketService.off('new_card_uploaded', onUpdate);
      socketService.off('card_confirmed', onUpdate);
    };
  }, [loggedIn, loadData]);

  // 统计
  const pending = tanks.filter(t => t.current_card_id && !(t.status === 'timeout' || calcWaitSec(t.created_at_ts) > timeoutHours * 3600)).length;
  const timeout = tanks.filter(t => t.status === 'timeout' || (t.current_card_id && calcWaitSec(t.created_at_ts) > timeoutHours * 3600)).length;
  const stats = {
    pending,
    timeout,
    total: tanks.length,
    idle: tanks.length - pending - timeout
  };

  // 构建网格：按行列位置排列料罐
  const gridCells: (any | null)[] = [];
  const totalCells = boardLayout.rows * boardLayout.columns;
  const tankMap = new Map<string, any>();
  tanks.forEach(t => {
    tankMap.set(`${t.row_index}_${t.col_index}`, t);
  });
  for (let i = 0; i < totalCells; i++) {
    const row = Math.floor(i / boardLayout.columns);
    const col = i % boardLayout.columns;
    gridCells.push(tankMap.get(`${row}_${col}`) || null);
  }

  // 点击卡片
  const handleCardClick = (tank: any) => {
    if (!tank.current_card_id) return;
    setSelectedTank(tank);
    setModalVisible(true);
    setCountdown(15);
  };

  // 关闭弹窗
  const closeModal = useCallback(() => {
    setModalVisible(false);
    setSelectedTank(null);
    setCountdown(15);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
  }, []);

  // 倒计时
  useEffect(() => {
    if (!modalVisible) return;
    countdownTimerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          closeModal();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);
    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [modalVisible, closeModal]);

  // 确认入库
  const handleConfirm = async () => {
    if (!selectedTank?.current_card_id) return;
    setConfirming(true);
    try {
      const res: any = await cardApi.confirm(selectedTank.current_card_id);
      if (res.success) {
        socketService.emit('card_confirmed', { tankId: selectedTank.id });
        loadData();
        closeModal();
      } else {
        alert(res.message || '确认入库失败');
      }
    } catch (e: any) {
      alert('操作失败: ' + e.message);
    } finally {
      setConfirming(false);
    }
  };

  // 格式化
  const fmtTime = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  const fmtDate = (d: Date) => {
    const wk = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${wk[d.getDay()]}`;
  };

  // 未登录时显示看板登录界面（深色工业风）—— 必须在 loading 检查之前
  if (!loggedIn) {
    return (
      <div className="board-login-screen">
        <div className="board-login-box">
          <div className="board-login-logo">📦</div>
          <h1 className="board-login-title">运通条码</h1>
          <p className="board-login-subtitle">成品料罐流转卡看板</p>
          <div className="board-login-form">
            <input
              type="text"
              className="board-login-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="请输入工号"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            <input
              type="password"
              className="board-login-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码"
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            />
            {loginError && <div className="board-login-error">{loginError}</div>}
            <button
              className="board-login-btn"
              onClick={handleLogin}
              disabled={loginLoading}
            >
              {loginLoading ? '登录中...' : '登录'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 已登录但未指定 line=X → 显示生产线选择页
  if (loggedIn && !lineId) {
    const hasData = allLines.length > 0;
    return (
      <div className="board-login-screen">
        <div className="board-login-box">
          <div className="board-login-logo">🏭</div>
          <h1 className="board-login-title">选择生产线</h1>
          <p className="board-login-subtitle">请选择要查看的生产线看板</p>
          {!hasData ? (
            <div style={{ color: '#94a3b8', fontSize: 14 }}>生产线加载中…</div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 16,
              width: '100%',
              maxWidth: 800
            }}>
              {allLines.map(line => (
                <a
                  key={line.id}
                  href={`/board?line=${line.id}`}
                  style={{
                    background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2744 100%)',
                    border: '1px solid #2d4a70',
                    borderRadius: 12,
                    padding: '28px 24px',
                    color: '#e2e8f0',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 8
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,179,237,0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  <div style={{ fontSize: 12, color: '#63b3ed', letterSpacing: 2 }}>
                    {line.code}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700 }}>{line.name}</div>
                  <div style={{ marginTop: 8, fontSize: 13, opacity: 0.7 }}>
                    点击进入看板 →
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // 已登录但数据加载中
  if (loading) return <div className="loading-screen">加载中...</div>;

  return (
    <div className="dashboard-container">
      {/* 顶部 */}
      <div className="header-bar">
        <div className="header-left">
          <div className="header-logo">📦</div>
          <div>
            <div className="header-title">成品料罐流转卡看板</div>
            <div className="header-subtitle">{currentLine ? currentLine.name : (lineId ? '生产线加载中…' : '全部生产线')}</div>
          </div>
        </div>

        <div className="stats-bar">
          <div className="stat-badge">
            <span className="stat-dot pending" />
            <span className="stat-label">待入库</span>
            <span className="stat-value">{stats.pending}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-dot timeout" />
            <span className="stat-label">超时预警</span>
            <span className="stat-value">{stats.timeout}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-dot idle" />
            <span className="stat-label">空位</span>
            <span className="stat-value">{stats.idle}</span>
          </div>
          <div className="stat-badge">
            <span className="stat-dot total" />
            <span className="stat-label">今日已入库</span>
            <span className="stat-value">{todayConfirmed}</span>
          </div>
        </div>

        <div className="header-right">
          <div className="header-user" style={{ position: 'relative' }}>
            <div
              style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setUserMenuOpen(v => !v)}
            >
              <span className="header-user-name">{currentUser?.name || ''}</span>
              <span style={{ fontSize: 11, opacity: 0.7 }}>▾</span>
            </div>
            {userMenuOpen && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 998 }} onClick={() => setUserMenuOpen(false)} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 999,
                  background: '#1a2530', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  overflow: 'hidden', minWidth: 160
                }}>
                  {/* 用户信息（与后台一致，不可点击） */}
                  <div style={{ padding: '10px 16px', color: '#a0aec0', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8, cursor: 'default' }}>
                    <UserOutlined style={{ color: '#63b3ed' }} />
                    <span>{currentUser?.name || ''}（{currentUser?.code || ''}）</span>
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />
                  {/* 修改密码 */}
                  <div
                    style={{ padding: '10px 16px', color: '#cbd5e0', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={() => { setUserMenuOpen(false); setPwdModalOpen(true); }}
                  >
                    <SettingOutlined />
                    <span>修改密码</span>
                  </div>
                  {/* 退出登录 */}
                  <div
                    style={{ padding: '10px 16px', color: '#fc8181', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                  >
                    <LogoutOutlined />
                    <span>退出登录</span>
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="clock-display">{fmtTime(currentTime).split(' ')[1]}</div>
          <div className="date-display">{fmtDate(currentTime)}</div>
        </div>
      </div>

      {/* 网格 - 使用动态布局配置 */}
      <div
        className="tank-grid"
        style={{
          gridTemplateColumns: `repeat(${boardLayout.columns}, 1fr)`,
          gridTemplateRows: `repeat(${boardLayout.rows}, 1fr)`
        }}
      >
        {gridCells.map((tank, index) => {
          if (!tank) {
            // 空位
            return (
              <div key={`empty-${index}`} className="tank-card status-idle">
                <div className="empty-state">
                  <div className="empty-state-icon">⛁</div>
                  <div className="empty-state-text">空位</div>
                </div>
              </div>
            );
          }

          const waitSec = tank.current_card_id ? calcWaitSec(tank.created_at_ts) : 0;
          const isTimeout = tank.status === 'timeout' || (tank.current_card_id && waitSec > timeoutHours * 3600);
          const hasCard = !!tank.current_card_id;

          let statusClass = 'status-idle';
          let tagClass = 'status-tag-idle';
          let statusText = '空位';
          if (isTimeout) { statusClass = 'status-timeout'; tagClass = 'status-tag-timeout'; statusText = '超时待入库'; }
          else if (hasCard) { statusClass = 'status-pending'; tagClass = 'status-tag-pending'; statusText = '待入库'; }

          return (
            <div
              key={tank.id}
              className={`tank-card ${statusClass} ${hasCard ? 'has-card' : ''}`}
              onClick={() => handleCardClick(tank)}
            >
              <div className="card-header">
                <span className="card-id">{tank.tank_code}</span>
                <span className={`card-status ${tagClass}`}>{statusText}</span>
                {hasCard && (
                  <span className={`card-wait-time ${isTimeout ? 'warning' : ''}`}>
                    挂卡 {formatDuration(waitSec)}
                  </span>
                )}
              </div>

              <div className="card-body">
                {hasCard ? (
                  <div className="card-preview">
                    <div className="card-image-wrapper">
                      {/* 网格用轻量缩略图，降低 5 秒刷新带宽；无缩略图回退原图 */}
                      {tank.thumbnail_url ? (
                        <img src={tank.thumbnail_url} alt="流转卡" loading="lazy" />
                      ) : tank.image_url ? (
                        <img src={tank.image_url} alt="流转卡" loading="lazy" />
                      ) : (
                        <div className="card-no-image">暂无图片</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="empty-state">
                    <div className="empty-state-icon">⛁</div>
                    <div className="empty-state-text">可上料挂卡</div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 底部 */}
      <div className="footer-bar">
        <div className="footer-left">
          <div className="footer-item"><span className="icon">●</span>点击料罐卡片查看流转卡详情</div>
          <div className="footer-item"><span className="icon">●</span>确认入库完成后，卡片消失，料罐恢复空位</div>
          <div className="footer-item"><span className="icon">●</span>15秒无操作自动关闭弹窗</div>
        </div>
        <div className="footer-right">数据每5秒自动刷新 | 广州数维工场软件有限公司</div>
      </div>

      {/* 确认入库弹窗 - 按设计稿 */}
      {modalVisible && selectedTank && (
        <div className="confirm-modal-mask" onClick={closeModal}>
          <div className="confirm-modal-content" onClick={e => e.stopPropagation()}>
            {/* 弹窗顶部标题栏 */}
            <div className="modal-header">
              <div className="modal-header-left">
                <span className="modal-tank-code">{selectedTank.tank_code}</span>
                <span className={`modal-status-tag ${selectedTank.status === 'timeout' ? 'tag-timeout' : 'tag-pending'}`}>
                  {selectedTank.status === 'timeout' ? '超时待入库' : '待入库'}
                </span>
              </div>
              <div className="modal-header-right">
                <div className="modal-uploader">
                  操作人: <strong>{selectedTank.created_user_name ? `${selectedTank.created_user_name}（工号${selectedTank.created_user_code || '—'}）` : '—'}</strong>
                </div>
                <div className="modal-upload-time">
                  上传时间: {selectedTank.created_at || '—'}
                </div>
              </div>
            </div>

            {/* 弹窗主体：左图右信息 */}
            <div className="modal-body">
              <div className="modal-left">
                <div className="modal-image-container">
                  {selectedTank.image_url ? (
                    <img src={selectedTank.image_url} alt="流转卡" />
                  ) : (
                    <div className="modal-image-placeholder">暂无图片</div>
                  )}
                </div>
              </div>

              <div className="modal-right">
                <div className="modal-confirm-title">确认该料罐已完成入库？</div>
                <div className="modal-desc">
                  确认在本流转卡上完成入库操作后，<br />
                  {selectedTank.tank_code} 将恢复为空闲位，可重新挂卡。
                </div>

                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <span className="label">料罐编号</span>
                    <span className="value">{selectedTank.tank_code}</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="label">看板位置</span>
                    <span className="value">第{(selectedTank.row_index ?? 0) + 1}行 · 第{(selectedTank.col_index ?? 0) + 1}列</span>
                  </div>
                  <div className="modal-info-item">
                    <span className="label">已挂卡时长</span>
                    <span className="value warning">
                      {selectedTank.current_card_id ? formatDuration(calcWaitSec(selectedTank.created_at_ts)) : '—'}
                    </span>
                  </div>
                  <div className="modal-info-item">
                    <span className="label">操作人</span>
                    <span className="value">{selectedTank.created_user_name ? `${selectedTank.created_user_name}（工号${selectedTank.created_user_code || '—'}）` : '—'}</span>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="btn-confirm" onClick={handleConfirm} disabled={confirming}>
                    {confirming ? '确认中...' : '✓ 确认入库完成'}
                  </button>
                  <button className="btn-cancel" onClick={closeModal} disabled={confirming}>
                    取消
                  </button>
                  <div className="modal-countdown"><span className="count">{countdown}</span> 秒后操作自动关闭</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <ChangePasswordModal open={pwdModalOpen} onClose={() => setPwdModalOpen(false)} />
    </div>
  );
};

export default BoardApp;
