import { create } from 'zustand';

const useAuthStore = create((set) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  setUser: (user, token) =>
    set({ user, token, error: null }),

  logout: () =>
    set({ user: null, token: null, error: null }),

  setLoading: (isLoading) =>
    set({ isLoading }),

  setError: (error) =>
    set({ error }),

  clearError: () =>
    set({ error: null }),

  isAuthenticated: () => {
    const state = useAuthStore.getState();
    return !!state.token;
  },

  hasRole: (role) => {
    const state = useAuthStore.getState();
    return state.user?.role === role;
  },
}));

export default useAuthStore;
