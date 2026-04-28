import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function ProtectedRoute({ children, requiredRole = null }) {
  const { user, token } = useAuthStore();
  const location = useLocation();

  if (!token || !user) {
    // pass original location so LoginPage can redirect back after auth
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
