import axios from 'axios';

const API_URL = 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth APIs
export const authAPI = {
  login: (employee_id: string, password: string) =>
    api.post('/auth/login', { employee_id, password }),
  getMe: () => api.get('/auth/me'),
};

// Dashboard APIs
export const dashboardAPI = {
  getDashboard: () => api.get('/dashboard'),
};

// Order APIs
export const orderAPI = {
  getOrders: (status?: string) => api.get('/orders', { params: { status } }),
  getOrder: (id: number) => api.get(`/orders/${id}`),
  createOrder: (data: any) => api.post('/orders', data),
  updateOrder: (id: number, data: any) => api.put(`/orders/${id}`, data),
  approveOrder: (id: number, data: any) => api.put(`/orders/${id}/approve`, data),
  canApproveOrder: (id: number) => api.get(`/orders/${id}/can-approve`),
  updateMilestone: (orderId: number, milestoneName: string, data: any) =>
    api.put(`/orders/${orderId}/milestone/${milestoneName}`, data),
};

// Product APIs
export const productAPI = {
  getProducts: () => api.get('/products'),
  getProductsByCountry: (country: string) => api.get('/products/by-country', { params: { country } }),
  createProduct: (data: any) => api.post('/products', data),
  getProduct: (sku: string) => api.get(`/products/${sku}`),
  updatePmCode: (sku: string, pmCode: string) => api.patch(`/products/${sku}/pm-code`, { pm_code: pmCode }),
  getPmRequests: () => api.get('/products/pm-requests'),
  requestPmCode: (sku: string) => api.post(`/products/${sku}/pm-requests`),
  submitPmCode: (requestId: number, pmCode: string, remarks?: string) => api.post(`/products/pm-requests/${requestId}/submit`, { pm_code: pmCode, remarks }),
  decidePmCode: (requestId: number, decision: 'ACCEPT' | 'REJECT', remarks?: string) => api.post(`/products/pm-requests/${requestId}/decide`, { decision, remarks }),
};

// Customer APIs
export const customerAPI = {
  getCustomers: () => api.get('/customers'),
  getCustomersByCountry: (country: string) => api.get(`/customers?country=${country}`),
  createCustomer: (data: any) => api.post('/customers', data),
  getCustomer: (id: number) => api.get(`/customers/${id}`),
  getProductsForCustomer: (customerId: number) => api.get(`/customers/${customerId}/products`),
};

// Registration APIs
export const registrationAPI = {
  getRegistrations: () => api.get('/registrations'),
  createRegistration: (data: any) => api.post('/registrations', data),
  uploadCertificate: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/registrations/${id}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Alert APIs
export const alertAPI = {
  getAlerts: () => api.get('/alerts'),
  markAsRead: (id: number) => api.put(`/alerts/${id}/read`),
};

// Audit Log APIs
export const auditAPI = {
  getAuditLogs: (orderId?: number) => api.get('/audit-logs', { params: { order_id: orderId } }),
};

export default api;
