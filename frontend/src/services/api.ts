import request from './request';

export const tankApi = {
  getAll: () => request.get('/tanks'),
  getById: (id: number) => request.get(`/tanks/${id}`),
  getEmpty: () => request.get('/tanks/empty'),
  getStats: () => request.get('/tanks/stats'),
  getLayout: () => request.get('/tanks/layout'),
  updateLayout: (data: { columns: number; rows: number }) =>
    request.post('/tanks/layout', data),
  batchUpdateLayout: (updates: Array<{ id: number; row_index: number; col_index: number }>) =>
    request.put('/tanks/batch-position', { updates }),
  create: (data: any) => request.post('/tanks', data),
  update: (id: number, data: any) => request.put(`/tanks/${id}`, data),
  delete: (id: number) => request.delete(`/tanks/${id}`),
  forceClear: (id: number) => request.post(`/tanks/${id}/clear`)
};

export const cardApi = {
  upload: (formData: FormData) => request.post('/cards/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getList: (params?: any) => request.get('/cards', { params }),
  getById: (id: number) => request.get(`/cards/${id}`),
  confirm: (id: number) => request.post(`/cards/${id}/confirm`),
  cancel: (id: number) => request.delete(`/cards/${id}`),
  move: (id: number, targetTankId: number) =>
    request.post(`/cards/${id}/move`, { target_tank_id: targetTankId }),
  getHistory: (params?: any) => request.get('/cards/history', { params })
};

export const userApi = {
  login: (code: string, password: string) => request.post('/users/login', { code, password }),
  getCurrent: () => request.get('/users/me'),
  changePassword: (old_password: string, new_password: string) =>
    request.put('/users/me/password', { old_password, new_password }),
  getList: () => request.get('/users'),
  create: (data: any) => request.post('/users', data),
  update: (id: number, data: any) => request.put(`/users/${id}`, data),
  delete: (id: number) => request.delete(`/users/${id}`),
  resetPassword: (id: number) => request.post(`/users/${id}/reset-password`)
};

export const logApi = {
  getList: (params?: any) => request.get('/logs', { params }),
  getActions: () => request.get('/logs/actions')
};

export const systemApi = {
  health: () => request.get('/health'),
  getConfig: (key: string) => request.get(`/system/config/${key}`),
  getAllConfigs: () => request.get('/system/config'),
  updateConfig: (key: string, data: { value: string; description?: string }) =>
    request.put(`/system/config/${key}`, data)
};
