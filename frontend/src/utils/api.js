import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 60000
});

// Interceptor to add JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('shelfsight_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If unauthorized and not already on login/register, clear token and redirect
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('shelfsight_token');
        localStorage.removeItem('shelfsight_user');
        window.location.href = '/login';
      }
    }
    const message = error.response?.data?.error || error.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (username, email, password) => api.post('/auth/register', { username, email, password }),
  getMe: () => api.get('/auth/me')
};

export const productsApi = {
  list: (params) => api.get('/products', { params }),
  get: (id) => api.get(`/products/${id}`),
  create: (formData) => api.post('/products', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, formData) => api.put(`/products/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/products/${id}`)
};

export const shelvesApi = {
  list: () => api.get('/shelves'),
  create: (data) => api.post('/shelves', data),
  update: (id, data) => api.put(`/shelves/${id}`, data),
  delete: (id) => api.delete(`/shelves/${id}`)
};

export const camerasApi = {
  list: () => api.get('/cameras'),
  get: (id) => api.get(`/cameras/${id}`),
  create: (data) => api.post('/cameras', data),
  update: (id, data) => api.put(`/cameras/${id}`, data),
  delete: (id) => api.delete(`/cameras/${id}`),
  start: (id) => api.post(`/cameras/${id}/start`),
  stop: (id) => api.post(`/cameras/${id}/stop`),
  status: (id) => api.get(`/cameras/${id}/status`)
};

export const inventoryApi = {
  list: (params) => api.get('/inventory', { params }),
  history: (params) => api.get('/inventory/history', { params }),
  recordSnapshot: (data) => api.post('/inventory/snapshot', data)
};

export const alertsApi = {
  list: (params) => api.get('/alerts', { params }),
  markRead: (id) => api.put(`/alerts/${id}/read`),
  resolve: (id) => api.put(`/alerts/${id}/resolve`)
};

export const dashboardApi = {
  getSummary: () => api.get('/dashboard/summary')
};

export const visionApi = {
  analyzeImage: (formData) => api.post('/vision/image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  analyzeVideo: (formData) => api.post('/vision/video', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export default api;
