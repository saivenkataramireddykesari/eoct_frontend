import axios from 'axios';

const API_URL = 'https://eoct-backend.onrender.com/api';

// https://eoct-backend.onrender.com

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
  getOrders: (status?: string, skip: number = 0, limit: number = 20) => api.get('/orders', { params: { status, skip, limit } }),
  getOrder: (id: number) => api.get(`/orders/${id}`),
  createOrder: (data: any) => api.post('/orders', data),
  updateOrder: (id: number, data: any) => api.put(`/orders/${id}`, data),
  approveOrder: (id: number, data: any) => api.put(`/orders/${id}/approve`, data),
  canApproveOrder: (id: number) => api.get(`/orders/${id}/can-approve`),
  updateMilestone: (milestoneId: number, data: any) =>
    api.put(`/milestones/${milestoneId}`, data),
  getMilestoneHistory: (milestoneId: number) => api.get(`/milestones/${milestoneId}/history`),
};

// Product APIs
export const productAPI = {
  getProducts: (skip: number = 0, limit: number = 20) => api.get('/products', { params: { skip, limit } }),
  getProductsByCountry: (country: string) => api.get('/products/by-country', { params: { country } }),
  createProduct: (data: any) => api.post('/products', data),
  getProduct: (sku: string) => api.get(`/products/${sku}`),
  updatePmCode: (sku: string, primaryPmCode: string, secondaryPmCode: string, leafPmCode: string) => api.patch(`/products/${sku}/pm-code`, { primary_pm_code: primaryPmCode, secondary_pm_code: secondaryPmCode, leaf_pm_code: leafPmCode }),
  getPmRequests: () => api.get('/products/pm-requests'),
  requestPmCode: (sku: string) => api.post(`/products/${sku}/pm-requests`),
  submitPmCode: (requestId: number, primaryPmCode: string, secondaryPmCode: string, leafPmCode: string, remarks?: string) => api.post(`/products/pm-requests/${requestId}/submit`, { primary_pm_code: primaryPmCode, secondary_pm_code: secondaryPmCode, leaf_pm_code: leafPmCode, remarks }),
  decidePmCode: (requestId: number, decision: 'ACCEPT' | 'REJECT', remarks?: string) => api.post(`/products/pm-requests/${requestId}/decide`, { decision, remarks }),
};

// Customer APIs
export interface Customer {
  id: number;
  customer_name: string;
  country: string;
  payment_terms: string | null;
  agreement_status: string;
  agreement_validity: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  order_type?: string; // New field
  default_artwork_status?: string; // New field
  order_count?: number;
  category?: string;
}


export const customerAPI = {
  getCustomers: (skip: number = 0, limit: number = 20) => api.get<Customer[]>('/customers', { params: { skip, limit } }),
  getCustomersByCountry: (country: string, skip: number = 0, limit: number = 20) => api.get<Customer[]>('/customers', { params: { country, skip, limit } }),
  createCustomer: (data: any) => api.post<Customer>('/customers', data),
  getCustomer: (id: number) => api.get<Customer>(`/customers/${id}`),
  getProductsForCustomer: (customerId: number) => api.get<any[]>(`/customers/${customerId}/products`),
};

// Registration APIs
export const registrationAPI = {
  getRegistrations: (skip: number = 0, limit: number = 20) => api.get('/registrations', { params: { skip, limit } }),
  getCountries: () => api.get('/countries'),
  getRegistrationsBySku: (sku: string) => api.get('/registrations/by-sku', { params: { sku } }),
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
  getAuditLogs: (orderId?: number, skip: number = 0, limit: number = 20) => api.get('/audit-logs', { params: { order_id: orderId, skip, limit } }),
};


export default api;
