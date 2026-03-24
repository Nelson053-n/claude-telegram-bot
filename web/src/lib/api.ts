import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_BASE,
});

// Add token to all requests
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;

// Auth API
export const authAPI = {
  loginWithTelegram: (telegramId: number, username?: string) =>
    client.post('/auth/telegram', { telegramId, username }),
  refreshToken: (token: string) =>
    client.post('/auth/refresh', { token }),
};

// Generations API
export const generationsAPI = {
  create: (prompt: string, tokensRequired?: number) =>
    client.post('/generations', { prompt, tokensRequired }),
  get: (id: number) =>
    client.get(`/generations/${id}`),
  list: (limit?: number, offset?: number) =>
    client.get('/generations', { params: { limit, offset } }),
};

// Payments API
export const paymentsAPI = {
  createIntent: (amount: number, tokensAmount?: number) =>
    client.post('/payments/create-intent', { amount, tokensAmount }),
  confirm: (paymentIntentId: string) =>
    client.post('/payments/confirm', { paymentIntentId }),
  history: () =>
    client.get('/payments/history'),
};

// Users API
export const usersAPI = {
  getProfile: () =>
    client.get('/users/me'),
  updateProfile: (email: string) =>
    client.put('/users/me', { email }),
  getStats: () =>
    client.get('/users/stats'),
};
