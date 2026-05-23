// Purpose: Client API wrapper goi backend va gom cac endpoint theo domain.
import api from './api';

const userService = {
  getMe: () => api.get('/users/me'),
  updateProfile: (data) => api.patch('/users/me', data),
  changePassword: (data) => api.patch('/users/me/password', data),
  deleteAccount: () => api.delete('/users/me'),
};

export default userService;