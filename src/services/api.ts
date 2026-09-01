import axios from 'axios';
import { Customer, Country, Token, User, DashboardData, Order, Product, Registration, Milestone, Alert, AuditLog, PMCodeRequest, CanApproveResponse, BulkTargetDateItem, MilestoneHistoryResponse, ProductSearchItem, ProductSearchResponse, OrderApproval, SearchSuggestion, SearchSuggestionsResponse, FullSearchResultItem, FullSearchResponse } from "../shared-types";
import { IOrderCreate } from "../types";

const API_URL = 'https://eoct-backend.onrender.com/api';



const api = axios.create({
  baseURL: API_URL,
  timeout: 30000, // Set timeout to 30 seconds (increased from 10s)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    console.log("Axios Request:", config);
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error("Axios Request Error:", error);
    return Promise.reject(error);
  }
);

// Response Interceptor
api.interceptors.response.use(
  (response) => {
    console.log("Axios Response:", response);
    return response;
  },
  (error) => {
    console.error("Axios Response Error:", error.response || error);
    return Promise.reject(error);
  }
);


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
  getOrders: (status?: string, productType?: string, skip: number = 0, limit: number = 20) => api.get('/orders', { params: { status, product_type: productType, skip, limit } }),
  getOrder: (id: number) => api.get(`/orders/${id}`),
  createOrder: (data: IOrderCreate) => api.post('/orders', data),
  updateOrder: (id: number, data: any) => api.put(`/orders/${id}`, data),
  approveOrder: (id: number, data: any) => api.put(`/orders/${id}/approve`, data),
  canApproveOrder: (id: number) => api.get(`/orders/${id}/can-approve`),
  updateMilestone: (milestoneId: number, data: any) =>
    api.put(`/milestones/${milestoneId}`, data),
  setBulkTargetDates: (orderId: number, milestones: any[]) =>
    api.put(`/orders/${orderId}/milestones/bulk-target-dates`, { milestones }),
  getMilestoneHistory: (milestoneId: number) => api.get(`/milestones/${milestoneId}/history`),
};

// Product APIs
export const productAPI = {
  getProducts: (skip: number = 0, limit: number = 20, scmUserType?: string) => api.get('/products', { params: { skip, limit, scm_user_type: scmUserType } }),
  getProductDetail: (id: number) => api.get(`/products/detail/${id}`),
  getProductsByCountry: (countryName: string) => api.get<ProductSearchItem[]>(`/skus/${countryName}`),
  createProduct: (data: any) => api.post('/products', data),
  getProductBySku: (sku: string) => api.get(`/products/sku/${sku}`), // New endpoint for fetching by SKU
  updateProduct: (id: number, data: {
    product_name?: string;
    country_id?: number;
    customer?: string;
    pack_size?: string;
    standard_batch_size?: number;
    moq?: number;
    primary_pm_code?: string;
    secondary_pm_code?: string;
    leaf_pm_code?: string;
    current_artwork_version?: string;
    artwork_status?: string;
    is_active?: boolean;
    category?: string;
    price?: number;
  }) => api.put(`/products/${id}`, data),
  getProductsFiltered: (country?: string, customerId?: string) => {
    const params: any = {};
    if (country) params.country = country;
    if (customerId) params.customer_id = customerId;
    return api.get('/products/filtered', { params });
  },
  updatePmCode: (sku: string, primaryPmCode: string, secondaryPmCode: string, leafPmCode: string) => api.patch(`/products/${sku}/pm-code`, { primary_pm_code: primaryPmCode, secondary_pm_code: secondaryPmCode, leaf_pm_code: leafPmCode }),
  getPmRequests: () => api.get('/products/pm-requests'),
  requestPmCode: (sku: string) => api.post(`/products/${sku}/pm-requests`),
  decidePmCode: (requestId: number, decision: 'ACCEPT' | 'REJECT', remarks?: string, primaryPmCode?: string, secondaryPmCode?: string, leafPmCode?: string, artworkStatus?: string) => api.post(`/products/pm-requests/${requestId}/decide`, { decision, remarks, primary_pm_code: primaryPmCode, secondary_pm_code: secondaryPmCode, leaf_pm_code: leafPmCode, artwork_status: artworkStatus }),
  submitArtworkPmCode: (requestId: number, primaryPmCode: string, secondaryPmCode: string, leafPmCode: string, remarks?: string) => api.post(`/products/pm-requests/${requestId}/submit-artwork`, { primary_pm_code: primaryPmCode, secondary_pm_code: secondaryPmCode, leaf_pm_code: leafPmCode, remarks }),
  getCountries: () => api.get<Country[]>('/countries'),
  searchProducts: (query: string) => api.get<ProductSearchResponse>(`/products/search`, { params: { query } }),
  getLastSku: () => api.get(`/products/last-sku`),
  checkDuplicate: (country_id: number, customer: string, pack_size: string) =>
    api.get(`/products/check-duplicate`, { params: { country_id, customer, pack_size } }),
};


export const customerAPI = {
  getCustomers: (
    country?: string,
    productSku?: string,
    productName?: string,
    skip: number = 0,
    limit: number = 20
  ) => {
    const params: any = { skip, limit };
    if (country) params.country = country;
    if (productSku) params.product_sku = productSku;
    if (productName) params.product_name = productName;
    return api.get<Customer[]>('/customers', { params });
  },
  getCustomersByCountry: (countryId: number) => api.get<Customer[]>(`/customers/by-country/${countryId}`),
  createCustomer: (data: any) => api.post<Customer>('/customers', data),
  updateCustomer: (id: number, data: any) => api.put<Customer>(`/customers/${id}`, data),
  getCustomer: (id: number) => api.get<Customer>(`/customers/${id}`),
  getProductsForCustomer: (customerId: number) => api.get<any[]>(`/customers/${customerId}/products`),
};

// Registration APIs
export const registrationAPI = {
  getRegistrations: (skip: number = 0, limit: number = 20) => api.get('/registrations', { params: { skip, limit } }),
  getCountries: () => api.get<Country[]>('/countries'),
  getRegistrationsBySku: (sku: string) => api.get('/registrations/by-sku', { params: { sku } }),
  getRegistrationByCountryAndSku: (countryId: number | string, sku: string) => api.get('/registrations/by-country-sku', { params: { country_id: countryId, sku } }),
  createRegistration: (data: any) => api.post('/registrations', data),
  updateRegistration: (id: number, data: any) => api.put(`/registrations/${id}`, data),
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

// Search APIs
export const searchAPI = {
  getSuggestions: (query: string) => api.get<SearchSuggestionsResponse>('/search/suggestions', { params: { query } }),
  fullSearch: (query: string) => api.get<FullSearchResponse>('/search/full', { params: { query } }),
};

export const formatErrorMessage = (err: any, fallback: string = 'An error occurred'): string => {
  if (!err) return fallback;
  const detail = err.response?.data?.detail || err.detail || err.message;
  if (!detail) return fallback;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => typeof d === 'string' ? d : (d.msg || JSON.stringify(d))).join(', ');
  }
  if (typeof detail === 'object') {
    return detail.msg || JSON.stringify(detail);
  }
  return String(detail);
};

export default api;
