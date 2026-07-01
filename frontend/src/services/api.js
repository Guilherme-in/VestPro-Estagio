import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Injeta token JWT automaticamente
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// Redireciona para login em caso de 401
api.interceptors.response.use(
    (res) => res,
    (err) => {
        if (err.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(err);
    }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
    login: (data) => api.post('/auth/login', data),
    me: () => api.get('/auth/me'),
    registerAdmin: (data) => api.post('/auth/register', data),
};

// ─── Users / Funcionários ─────────────────────────────────────────────────────
export const usersAPI = {
    getAll: () => api.get('/users/'),
    getById: (id) => api.get(`/users/${id}`),
    create: (data) => api.post('/users/', data),
    update: (id, data) => api.put(`/users/${id}`, data),
    delete: (id) => api.delete(`/users/${id}`),
};

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoriesAPI = {
    getAll: (params) => api.get('/categories/', { params }),
    getById: (id) => api.get(`/categories/${id}`),
    create: (data) => api.post('/categories/', data),
    update: (id, data) => api.put(`/categories/${id}`, data),
    delete: (id) => api.delete(`/categories/${id}`),
};

// ─── Products ─────────────────────────────────────────────────────────────────
export const productsAPI = {
    getAll: (params) => api.get('/products/', { params }),
    getById: (id) => api.get(`/products/${id}`),
    create: (data) => api.post('/products/', data),
    update: (id, data) => api.put(`/products/${id}`, data),
    delete: (id) => api.delete(`/products/${id}`),
    uploadImage: (id, formData) =>
        api.post(`/products/${id}/image`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

// ─── Suppliers ────────────────────────────────────────────────────────────────
export const suppliersAPI = {
    getAll: () => api.get('/suppliers/'),
    getById: (id) => api.get(`/suppliers/${id}`),
    create: (data) => api.post('/suppliers/', data),
    update: (id, data) => api.put(`/suppliers/${id}`, data),
    delete: (id) => api.delete(`/suppliers/${id}`),
};

// ─── Customers ────────────────────────────────────────────────────────────────
export const customersAPI = {
    getAll: () => api.get('/customers/'),
    getById: (id) => api.get(`/customers/${id}`),
    create: (data) => api.post('/customers/', data),
    update: (id, data) => api.put(`/customers/${id}`, data),
    delete: (id) => api.delete(`/customers/${id}`),
};

// ─── Movements ────────────────────────────────────────────────────────────────
export const movementsAPI = {
    getAll: (params) => api.get('/movements/', { params }),
    getById: (id) => api.get(`/movements/${id}`),
    create: (data) => api.post('/movements/', data),
};

// ─── Sales ────────────────────────────────────────────────────────────────────
export const salesAPI = {
    getAll: (params) => api.get('/sales/', { params }),
    getById: (id) => api.get(`/sales/${id}`),
    create: (data) => api.post('/sales/', data),
    delete: (id) => api.delete(`/sales/${id}`),
};

// ─── Reports ──────────────────────────────────────────────────────────────────
export const reportsAPI = {
    getStockReport: () => api.get('/reports/stock'),
    getSalesReport: (startDate, endDate) =>
        api.get('/reports/sales', { params: { start_date: startDate, end_date: endDate } }),
    getTopSuppliers: () => api.get('/reports/top-suppliers'),
    getTopProducts: () => api.get('/reports/top-products'),
    getFinancialReport: (year) => api.get('/reports/financial', { params: year ? { year } : {} }),
    getDevolutionReport: (startDate, endDate) =>
        api.get('/reports/devolutions', { params: { start_date: startDate, end_date: endDate } }),
    getExchangeRates: () => api.get('/reports/exchange-rates'),
    exportStockPDF: () => api.get('/reports/stock/pdf', { responseType: 'blob' }),
    exportSalesPDF: (startDate, endDate) =>
        api.get('/reports/sales/pdf', { params: { start_date: startDate, end_date: endDate }, responseType: 'blob' }),
    exportTopPDF: () => api.get('/reports/top/pdf', { responseType: 'blob' }),
    exportFinancialPDF: (year) => api.get('/reports/financial/pdf', { params: { year }, responseType: 'blob' }),
    exportDevolutionPDF: (startDate, endDate) =>
        api.get('/reports/devolutions/pdf', { params: { start_date: startDate, end_date: endDate }, responseType: 'blob' }),
};

// ─── Caixa ────────────────────────────────────────────────────────────────────
export const caixaAPI = {
    getHoje: () => api.get('/caixa/hoje'),
    getStatus: () => api.get('/caixa/status'),
    getHistorico: (dias = 7) => api.get('/caixa/historico', { params: { dias } }),
    getResumoPagamentos: (startDate, endDate) =>
        api.get('/caixa/resumo-pagamentos', { params: { start_date: startDate, end_date: endDate } }),
    create: (data) => api.post('/caixa/', data),
};

// ─── Audit ────────────────────────────────────────────────────────────────────
export const auditAPI = {
    getAll: (params) => api.get('/audit/', { params }),
};

// ─── Tenant / Perfil ──────────────────────────────────────────────────────────
export const tenantAPI = {
    getMe: () => api.get('/tenant/me'),
    updateMe: (data) => api.put('/tenant/me', data),
    getStats: () => api.get('/tenant/stats'),
    updateProfile: (data) => api.put('/tenant/profile', data),
};

export default api;
