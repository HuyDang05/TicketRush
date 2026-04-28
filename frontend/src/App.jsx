import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/shared/Header';
import Footer from './components/shared/Footer';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Pages
import HomePage from './pages/customer/HomePage';
import EventDetailPage from './pages/customer/EventDetailPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import MyTicketsPage from './pages/customer/MyTicketsPage';
import SeatSelectionPage from './pages/customer/SeatSelectionPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import EventManagerPage from './pages/admin/EventManagerPage';
import EventFormPage from './pages/admin/EventFormPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* Customer + Auth Routes — wrapped in Header/Footer */}
        <Route path="/*" element={
          <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/event/:id" element={<EventDetailPage />} />
                <Route
                  path="/event/:id/seats"
                  element={
                    <ProtectedRoute>
                      <SeatSelectionPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/checkout/:seatId"
                  element={
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/my-tickets"
                  element={
                    <ProtectedRoute>
                      <MyTicketsPage />
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        } />

        {/* Admin Routes — full-screen, no Header/Footer */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <EventManagerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/create"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <EventFormPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/:id/edit"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <EventFormPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
