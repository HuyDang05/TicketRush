import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Token comes from localStorage so there is no circular dep with authStore
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On 401, clear auth state and redirect to login
// logoutRef is populated by main.jsx after store is initialized to avoid circular deps
export const logoutRef = { fn: null };

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && logoutRef.fn) {
      logoutRef.fn();
    }
    return Promise.reject(error);
  }
);

export default api;
