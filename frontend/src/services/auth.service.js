import api from './api';

const authService = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),

  register: (payload) =>
    api.post('/auth/register', payload),

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Local logout should still complete if the server session is already gone.
    }
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  setToken: (token, user) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
};

export default authService;
