import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 60000,
});

// Attach JWT token to requests if present
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('shelfsight_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercept 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('shelfsight_token');
        localStorage.removeItem('shelfsight_user');
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (data) => api.post('/auth/login', data).then(r => r.data),
  register: (data) => api.post('/auth/register', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
};

export const dashboardAPI = {
  getSummary: () => api.get('/dashboard/summary').then(r => r.data),
};

export const productsAPI = {
  list: (params) => api.get('/products', { params }).then(r => r.data),
  get: (id) => api.get(`/products/${id}`).then(r => r.data),
  create: (data) => api.post('/products', data).then(r => r.data),
  update: (id, data) => api.put(`/products/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/products/${id}`).then(r => r.data),
};

export const shelvesAPI = {
  list: () => api.get('/shelves').then(r => r.data),
  create: (data) => api.post('/shelves', data).then(r => r.data),
};

export const camerasAPI = {
  list: () => api.get('/cameras').then(r => r.data),
  create: (data) => api.post('/cameras', data).then(r => r.data),
  update: (id, data) => api.put(`/cameras/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/cameras/${id}`).then(r => r.data),
  start: (id) => api.post(`/cameras/${id}/start`).then(r => r.data),
  stop: (id) => api.post(`/cameras/${id}/stop`).then(r => r.data),
  status: (id) => api.get(`/cameras/${id}/status`).then(r => r.data),
};

export const inventoryAPI = {
  list: (params) => api.get('/inventory', { params }).then(r => r.data),
  history: (params) => api.get('/inventory/history', { params }).then(r => r.data),
  recordSnapshot: (data) => api.post('/inventory/snapshot', data).then(r => r.data),
};

export const alertsAPI = {
  list: (params) => api.get('/alerts', { params }).then(r => r.data),
  markRead: (id) => api.put(`/alerts/${id}/read`).then(r => r.data),
  markResolved: (id) => api.put(`/alerts/${id}/resolve`).then(r => r.data),
};

export const visionAPI = {
  analyzeImage: (formData) => api.post('/vision/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
  analyzeVideo: (formData) => api.post('/vision/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data),
  registerItem: (data) => api.post('/vision/register-item', data).then(r => r.data),
  loadDemoMedia: () => api.get('/vision/demo-media').then(r => r.data).catch(() => ({ success: false })),
};

export default api;
