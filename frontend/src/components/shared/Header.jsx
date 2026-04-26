import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white shadow">
      <nav className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to="/" className="text-2xl font-bold text-primary">
          🎫 TicketRush
        </Link>

        <div className="flex gap-6">
          <Link to="/" className="text-gray-600 hover:text-primary">
            Trang chủ
          </Link>

          {user?.role === 'ADMIN' && (
            <>
              <Link to="/admin/dashboard" className="text-gray-600 hover:text-primary">
                Dashboard
              </Link>
              <Link to="/admin/events" className="text-gray-600 hover:text-primary">
                Quản lý sự kiện
              </Link>
            </>
          )}

          {user && user.role === 'CUSTOMER' && (
            <Link to="/my-tickets" className="text-gray-600 hover:text-primary">
              Vé của tôi
            </Link>
          )}
        </div>

        <div className="flex gap-4">
          {!user ? (
            <>
              <Link to="/login" className="text-gray-600 hover:text-primary">
                Đăng nhập
              </Link>
              <Link to="/register" className="text-gray-600 hover:text-primary">
                Đăng ký
              </Link>
            </>
          ) : (
            <>
              <span className="text-gray-600">{user.fullName}</span>
              <button
                onClick={logout}
                className="text-gray-600 hover:text-primary"
              >
                Đăng xuất
              </button>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
