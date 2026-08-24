import { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Toast, ActionSheet } from 'antd-mobile';
import { UserOutlined, SettingOutlined, LogoutOutlined } from '@ant-design/icons';
import { tankApi, cardApi, userApi } from '../../services/api';
import { setStoredToken, setStoredUser, isAuthenticated, getStoredUser, removeStoredToken } from '../../utils/auth';
import ChangePasswordModal from '../../components/ChangePasswordModal';
import './PdaApp.css';

interface Tank {
  id: number;
  tank_code: string;
  tank_name: string;
  status: string;
  current_card_id: number | null;
}

interface PendingUpload {
  id: string;
  tank_id: number;
  tank_code: string;
  photo_data_url: string;
  created_at: number;
}

const PENDING_KEY = 'pda_pending_uploads';

export default function PdaApp() {
  const [page, setPage] = useState<'login' | 'home'>('login');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(getStoredUser());

  const [tanks, setTanks] = useState<Tank[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [selectedTank, setSelectedTank] = useState<Tank | null>(null);
  const [showOnlyEmpty, setShowOnlyEmpty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const [pwdModalOpen, setPwdModalOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showCamera, setShowCamera] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      setPage('home');
      fetchAllTanks();
      loadPendingUploads();
    }
  }, []);

  const handleLogin = async () => {
    if (!code || !password) {
      Toast.show('请输入工号和密码');
      return;
    }
    setLoginLoading(true);
    try {
      const res: any = await userApi.login(code, password);
      setStoredToken(res.data.token);
      setStoredUser(res.data.user);
      setCurrentUser(res.data.user);
      Toast.show('登录成功');
      setPage('home');
      fetchAllTanks();
      loadPendingUploads();
    } catch (error: any) {
      Toast.show(error.message || '登录失败');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    removeStoredToken();
    setCurrentUser(null);
    setPage('login');
    cleanupPhoto();
  };

  const fetchAllTanks = async () => {
    try {
      const res: any = await tankApi.getAll();
      setTanks(res.data || []);
    } catch (error) {
      console.error('获取罐位失败:', error);
    }
  };

  const loadPendingUploads = () => {
    try {
      const data = localStorage.getItem(PENDING_KEY);
      if (data) setPendingUploads(JSON.parse(data));
    } catch (e) { /* ignore */ }
  };

  const savePendingUploads = (list: PendingUpload[]) => {
    setPendingUploads(list);
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(list));
    } catch (e) {
      Toast.show('暂存失败：存储空间不足');
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (error: any) {
      const msg = error?.name === 'NotAllowedError'
        ? '摄像头权限被拒绝，请在浏览器设置中允许'
        : '无法访问摄像头，请使用相册选择';
      Toast.show(msg);
    }
  };

  // 等 <video> 元素渲染后再绑定流并播放
  useEffect(() => {
    if (showCamera && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [showCamera]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
  };

  const cleanupPhoto = useCallback(() => {
    if (photo) URL.revokeObjectURL(photo);
    setPhoto(null);
    setPhotoFile(null);
  }, [photo]);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      Toast.show('摄像头未就绪，请稍候');
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        const url = URL.createObjectURL(blob);
        setPhoto(url);
        setPhotoFile(file);
        stopCamera();
      } else {
        Toast.show('拍照失败，请重试');
      }
    }, 'image/jpeg', 0.8);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhoto(url);
      setPhotoFile(file);
    }
  };

  const handleTankSelect = (tank: Tank) => {
    if (tank.status !== 'idle') return;
    if (selectedTank?.id === tank.id) {
      setSelectedTank(null);
    } else {
      setSelectedTank(tank);
    }
  };

  const retryPendingUpload = async (pu: PendingUpload) => {
    setUploading(true);
    try {
      const fetchRes = await fetch(pu.photo_data_url);
      const blob = await fetchRes.blob();
      const file = new File([blob], `pending_${pu.id}.jpg`, { type: 'image/jpeg' });

      const formData = new FormData();
      formData.append('image', file);
      formData.append('tank_id', String(pu.tank_id));
      await cardApi.upload(formData);

      const remaining = pendingUploads.filter(p => p.id !== pu.id);
      savePendingUploads(remaining);
      Toast.show('暂存上传成功');
      fetchAllTanks();
    } catch (error: any) {
      Toast.show(error.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  // 网络恢复时自动补传所有暂存（静默重试，逐条上传，失败的保留）
  const retryAllPending = useCallback(async () => {
    if (pendingUploads.length === 0 || uploading) return;
    let successCount = 0;
    let remaining = [...pendingUploads];
    setUploading(true);
    try {
      for (const pu of pendingUploads) {
        try {
          const fetchRes = await fetch(pu.photo_data_url);
          const blob = await fetchRes.blob();
          const file = new File([blob], `pending_${pu.id}.jpg`, { type: 'image/jpeg' });
          const formData = new FormData();
          formData.append('image', file);
          formData.append('tank_id', String(pu.tank_id));
          await cardApi.upload(formData);
          remaining = remaining.filter(p => p.id !== pu.id);
          successCount++;
        } catch (e) {
          // 单条失败跳过，继续下一条
        }
      }
      if (successCount > 0) {
        savePendingUploads(remaining);
        fetchAllTanks();
        Toast.show(`已自动补传 ${successCount} 张`);
      }
    } finally {
      setUploading(false);
    }
  }, [pendingUploads, uploading]);

  const handleUpload = async () => {
    if (!photoFile) {
      Toast.show('请先拍照或选择图片');
      return;
    }
    if (!selectedTank) {
      Toast.show('请选择空罐位');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', photoFile);
      formData.append('tank_id', String(selectedTank.id));
      await cardApi.upload(formData);
      Toast.show('上传成功');
      resetForm();
      fetchAllTanks();
    } catch (error: any) {
      if (error.message?.includes('Network') || error.message?.includes('Failed to fetch')) {
        Toast.show('网络异常，已暂存待恢复');
        const reader = new FileReader();
        reader.onload = () => {
          const pending: PendingUpload = {
            id: `pu_${Date.now()}`,
            tank_id: selectedTank.id,
            tank_code: selectedTank.tank_code,
            photo_data_url: reader.result as string,
            created_at: Date.now()
          };
          savePendingUploads([...pendingUploads, pending]);
        };
        reader.readAsDataURL(photoFile);
      } else {
        Toast.show(error.message || '上传失败');
      }
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    cleanupPhoto();
    setSelectedTank(null);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      if (photo) URL.revokeObjectURL(photo);
    };
  }, []);

  // 断网自动补传：监听网络恢复事件 + 每 30 秒定时重试（有暂存时）
  useEffect(() => {
    const handleOnline = () => {
      retryAllPending();
    };
    window.addEventListener('online', handleOnline);

    // 有暂存数据时定时尝试补传（弱网/恢复后自动补上）
    const timer = setInterval(() => {
      if (navigator.onLine && pendingUploads.length > 0) {
        retryAllPending();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      clearInterval(timer);
    };
  }, [retryAllPending, pendingUploads.length]);

  const filteredTanks = showOnlyEmpty ? tanks.filter(t => t.status === 'idle') : tanks;

  const getStatusText = (tank: Tank) => {
    if (tank.status === 'timeout') return '超时';
    if (tank.status === 'pending') return '待入库';
    return '';
  };

  const getTankClass = (tank: Tank) => {
    if (tank.status !== 'idle') return 'occupied';
    if (selectedTank?.id === tank.id) return 'selected';
    return 'empty';
  };

  if (page === 'login') {
    return (
      <div className="pda-login">
        <div className="login-box">
          <div className="login-logo">📦 运通条码</div>
          <div className="login-title">流转卡上传系统</div>
          <div className="login-form">
            <div className="form-item">
              <label>工号</label>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} placeholder="请输入工号" />
            </div>
            <div className="form-item">
              <label>密码</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="请输入密码" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
            </div>
            <Button color="primary" loading={loginLoading} onClick={handleLogin} block className="login-btn">登录</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pda-container">
      {/* 顶部栏 */}
      <header className="pda-header">
        <div className="header-title">流转卡上传</div>
        <div className="header-user" onClick={() => setUserMenuOpen(true)}>
          <span>{currentUser?.name || ''}</span>
          <span className="header-logout">▾</span>
        </div>
      </header>

      <ActionSheet
        visible={userMenuOpen}
        extra={
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#333', fontSize: 15, fontWeight: 500 }}>
            <UserOutlined style={{ color: '#1890ff', fontSize: 16 }} />
            <span>{currentUser?.name || ''}（工号 {currentUser?.code || ''}）</span>
          </div>
        }
        actions={[
          {
            text: <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><SettingOutlined /> 修改密码</span>,
            key: 'password'
          },
          {
            text: <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}><LogoutOutlined /> 退出登录</span>,
            key: 'logout',
            danger: true
          }
        ]}
        onAction={(action) => {
          if (action.key === 'password') setPwdModalOpen(true);
          if (action.key === 'logout') handleLogout();
          setUserMenuOpen(false);
        }}
        onClose={() => setUserMenuOpen(false)}
      />

      <ChangePasswordModal open={pwdModalOpen} onClose={() => setPwdModalOpen(false)} />

      {/* 主内容 */}
      <main className="pda-main">
        {/* ① 拍照区 */}
        <section className="section photo-section">
          <div className="section-label">① 拍摄纸质流转卡</div>
          <div className="photo-area">
            {showCamera ? (
              <div className="camera-container">
                <video ref={videoRef} autoPlay playsInline className="camera-preview" />
                <button className="capture-btn" onClick={capturePhoto}>拍照</button>
                <button className="cancel-camera" onClick={stopCamera}>取消</button>
              </div>
            ) : photo ? (
              <div className="photo-preview">
                <img src={photo} alt="流转卡" />
                <button className="retake-btn" onClick={() => { cleanupPhoto(); }}>点击重新拍摄</button>
              </div>
            ) : (
              <div className="photo-placeholder">
                <div className="photo-tip">请对准纸质流转卡<br />确保字迹清晰</div>
                <div className="photo-actions">
                  <button className="photo-btn primary" onClick={startCamera}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M9 2L7.17 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2h-3.17L15 2H9zm3 15c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"/>
                      <circle cx="12" cy="12" r="3.2"/>
                    </svg>
                    <span>拍摄流转卡</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                  />
                  <button className="photo-btn secondary" onClick={() => fileInputRef.current?.click()}>
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                    </svg>
                    <span>相册选择</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ② 选罐区 */}
        <section className="section tank-section">
          <div className="section-header">
            <div className="section-label">② 选择目标料罐</div>
            <button
              className={`filter-btn ${showOnlyEmpty ? 'active' : ''}`}
              onClick={() => setShowOnlyEmpty(!showOnlyEmpty)}
            >
              {showOnlyEmpty ? '✓ 仅显示空罐位' : '仅显示空罐位'}
            </button>
          </div>

          <div className="tank-grid">
            {filteredTanks.map(tank => {
              const statusText = getStatusText(tank);
              const isOccupied = tank.status !== 'idle';
              const isSelected = selectedTank?.id === tank.id;

              return (
                <div
                  key={tank.id}
                  className={`tank-cell ${getTankClass(tank)}`}
                  onClick={() => handleTankSelect(tank)}
                >
                  <div className="tank-code">{tank.tank_code}</div>
                  {isOccupied ? (
                    <div className="tank-overlay">
                      <div className="overlay-text">已占用</div>
                      <div className="overlay-sub">{statusText}</div>
                    </div>
                  ) : (
                    <div className="tank-empty-label">{isSelected ? '✓ 已选' : '空罐位'}</div>
                  )}
                  {isSelected && <div className="tank-check-badge">✓</div>}
                </div>
              );
            })}
          </div>
        </section>

        {/* 待恢复上传 */}
        {pendingUploads.length > 0 && (
          <section className="section pending-section">
            <div className="section-label">📤 暂存待恢复 ({pendingUploads.length})</div>
            <div className="pending-list">
              {pendingUploads.map(pu => (
                <div key={pu.id} className="pending-item">
                  <div className="pending-info">
                    <span className="pending-tank">{pu.tank_code}</span>
                    <span className="pending-time">{new Date(pu.created_at).toLocaleTimeString()}</span>
                  </div>
                  <button
                    className="retry-btn"
                    disabled={uploading}
                    onClick={() => retryPendingUpload(pu)}
                  >
                    恢复
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      {/* 底部操作 */}
      <footer className="pda-footer">
        <button
          className="submit-btn"
          disabled={!photo || !selectedTank || uploading}
          onClick={handleUpload}
        >
          {uploading ? '上传中...' : '✓ 上传至看板'}
        </button>
        <button className="clear-btn" onClick={resetForm} disabled={uploading}>
          清空
        </button>
      </footer>
    </div>
  );
}
