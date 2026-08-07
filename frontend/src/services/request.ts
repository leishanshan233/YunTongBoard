import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '/api';

const request = axios.create({
  baseURL: API_BASE,
  timeout: 30000
});

request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

request.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data.success === false) {
      return Promise.reject(new Error(data.message));
    }
    return data;
  },
  (error) => {
    const status = error.response?.status;

    if (status === 401) {
      // Token 失效：清除登录态并刷新当前页。
      // 三端登录均由组件状态控制（非独立路由），刷新后会自动回到各自的登录界面。
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // 避免在登录请求本身 401 时反复刷新
      if (!error.config?.url?.includes('/users/login')) {
        window.location.reload();
      }
      return Promise.reject(new Error('登录已过期，请重新登录'));
    }

    // 其他错误：提取后端返回的真实 message（500/400/403 等）
    const backendMessage = error.response?.data?.message;
    if (backendMessage) {
      return Promise.reject(new Error(backendMessage));
    }

    // 网络错误等无响应的情况
    return Promise.reject(new Error(error.message || '网络请求失败'));
  }
);

export default request;
