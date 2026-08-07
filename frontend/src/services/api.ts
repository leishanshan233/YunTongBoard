import request from './request';

export const productionLineApi = {
  getAll: () => request.get('/production-lines'),
  getById: (id: number) => request.get(`/production-lines/${id}`),
  create: (data: { code: string; name: string; sort_order?: number }) =>
    request.post('/production-lines', data),
  update: (id: number, data: { code: string; name: string; sort_order?: number }) =>
    request.put(`/production-lines/${id}`, data),
  delete: (id: number) => request.delete(`/production-lines/${id}`)
};

export const tankApi = {
  getAll: (params?: { production_line_id?: number | string }) =>
    request.get('/tanks', { params }),
  getById: (id: number) => request.get(`/tanks/${id}`),
  getEmpty: (params?: { production_line_id?: number | string }) =>
    request.get('/tanks/empty', { params }),
  getStats: (params?: { production_line_id?: number | string }) =>
    request.get('/tanks/stats', { params }),
  getLayout: (params?: { production_line_id?: number | string }) =>
    request.get('/tanks/layout', { params }),
  updateLayout: (data: { columns: number; rows: number; production_line_id?: number | null }) =>
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
  delete: (id: number) => request.delete(`/users/${id}`)
};

export const logApi = {
  getList: (params?: any) => request.get('/logs', { params }),
  getActions: () => request.get('/logs/actions')
};

export const systemApi = {
  health: () => request.get('/health'),
  getConfig: (key: string, params?: { production_line_id?: number | string }) =>
    request.get(`/system/config/${key}`, { params }),
  getAllConfigs: () => request.get('/system/config'),
  updateConfig: (key: string, data: { value: string; description?: string; production_line_id?: number | null }) =>
    request.put(`/system/config/${key}`, data)
};
