import { useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import useAuthStore from '../../store/authStore';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { user, token } = useAuthStore();

  const wrongRole = token && user && requiredRole && user.role !== requiredRole;

  useEffect(() => {
    if (wrongRole) toast.error('Bạn không có quyền truy cập trang này.');
  }, [wrongRole]);

  if (!token || !user) return <Navigate to="/login" replace />;
  if (wrongRole) return <Navigate to="/" replace />;

  return children;
}
