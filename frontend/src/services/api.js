// Purpose: Client API wrapper goi backend va gom cac endpoint theo domain.
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
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
export const refreshSessionRef = { fn: null };

let refreshPromise = null;

const refreshAccessToken = async () => {
  if (!refreshPromise) {
    refreshPromise = refreshClient
      .post('/auth/refresh')
      .then((response) => {
        const { token, user } = response.data || {};
        if (!token) {
          throw new Error('Refresh response did not include an access token');
        }
        localStorage.setItem('token', token);
        if (user) localStorage.setItem('user', JSON.stringify(user));
        if (refreshSessionRef.fn) refreshSessionRef.fn(user, token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isAuthRequest = originalRequest?.url?.includes('/auth/');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthRequest) {
      originalRequest._retry = true;

      try {
        const token = await refreshAccessToken();
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        if (logoutRef.fn) logoutRef.fn();
        return Promise.reject(refreshError);
      }
    }

    if (error.response?.status === 401 && logoutRef.fn && !isAuthRequest) {
      logoutRef.fn();
    }
    return Promise.reject(error);
  }
);

export default api;
