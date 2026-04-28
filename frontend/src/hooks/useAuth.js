import useAuthStore from '../store/authStore';

export function useAuth() {
  const { user, token, isAuthenticated, login, logout } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isAdmin: user?.role === 'ADMIN',
    login,
    logout,
  };
}
