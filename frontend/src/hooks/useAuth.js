import { useCallback } from 'react';
import useAuthStore from '../store/authStore';
import authService from '../services/auth.service';

export function useAuth() {
  const { user, token, isLoading, error, setUser, logout, setLoading, setError } = useAuthStore();

  const login = useCallback(
    async (email, password) => {
      setLoading(true);
      try {
        const response = await authService.login(email, password);
        const { token, user } = response.data;
        authService.setToken(token, user);
        setUser(user, token);
        return response.data;
      } catch (err) {
        setError(err.response?.data?.message || 'Login failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading, setError]
  );

  const register = useCallback(
    async (payload) => {
      setLoading(true);
      try {
        const response = await authService.register(payload);
        const { token, user } = response.data;
        authService.setToken(token, user);
        setUser(user, token);
        return response.data;
      } catch (err) {
        setError(err.response?.data?.message || 'Registration failed');
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setUser, setLoading, setError]
  );

  const handleLogout = useCallback(() => {
    authService.logout();
    logout();
  }, [logout]);

  return {
    user,
    token,
    isLoading,
    error,
    login,
    register,
    logout: handleLogout,
    isAuthenticated: !!token,
  };
}
