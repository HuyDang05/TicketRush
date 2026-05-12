import { BrowserRouter as Router, Routes, Route, Outlet } from 'react-router-dom';
import { Toaster } from 'sonner';
import Header from './components/shared/Header';
import GlobalModal from './components/shared/GlobalModal';
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
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import EventManagerPage from './pages/admin/EventManagerPage';
import EventCreateWizard from './pages/admin/EventCreateWizard';
import EventFormPage from './pages/admin/EventFormPage';
import SeatmapEditorPage from './pages/admin/SeatmapEditorPage';
import PersonalAccountPage from './pages/customer/PersonalAccountPage';
import AdminTicketManagerPage from './pages/admin/AdminTicketManagerPage';

function CustomerLayout() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}

function App() {
  return (
    <Router>
      <Toaster position="top-right" richColors />
      <GlobalModal />
      <Routes>
        {/* Customer + Auth Routes — wrapped in Header/Footer */}
        <Route element={<CustomerLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/events/:id" element={<EventDetailPage />} />
          <Route
            path="/checkout"
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
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <PersonalAccountPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Seat Selection — has its own header, no CustomerLayout */}
        <Route
          path="/events/:id/seats"
          element={
            <ProtectedRoute>
              <SeatSelectionPage />
            </ProtectedRoute>
          }
        />

        

        {/* Auth Routes — no Header/Footer */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />

        {/* Admin Routes — full-screen layout, no Header/Footer */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminDashboardPage />
            </ProtectedRoute>
          }
        />
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
              <EventCreateWizard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/new"
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
              <EventCreateWizard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/events/:id/seatmap"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <SeatmapEditorPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/tickets"
          element={
            <ProtectedRoute allowedRoles={['ADMIN']}>
              <AdminTicketManagerPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
