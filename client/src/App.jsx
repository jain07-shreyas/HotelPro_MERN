import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import VerifyBanner from './components/VerifyBanner';
import ProtectedRoute from './components/ProtectedRoute';

// Each page is loaded on demand (code splitting), so the first visit downloads far less JavaScript
const HomePage = lazy(() => import('./pages/HomePage'));
const RoomsPage = lazy(() => import('./pages/RoomsPage'));
const RoomDetailPage = lazy(() => import('./pages/RoomDetailPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const CheckoutPage = lazy(() => import('./pages/CheckoutPage'));
const MyBookingsPage = lazy(() => import('./pages/MyBookingsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ServicesPage = lazy(() => import('./pages/ServicesPage'));
const SupportPage = lazy(() => import('./pages/SupportPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const VerifyEmailPage = lazy(() => import('./pages/VerifyEmailPage'));

const PageSpinner = () => (
  <div className="flex justify-center py-28">
    <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
  </div>
);

const guarded = (el, roles) => <ProtectedRoute roles={roles}>{el}</ProtectedRoute>;

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="min-h-screen flex flex-col bg-slate-50">
          <Navbar />
          <VerifyBanner />
          <main className="flex-1">
            <Suspense fallback={<PageSpinner />}>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/rooms" element={<RoomsPage />} />
                <Route path="/rooms/:id" element={<RoomDetailPage />} />
                <Route path="/checkout/:bookingId" element={guarded(<CheckoutPage />)} />
                <Route path="/my-bookings" element={guarded(<MyBookingsPage />)} />
                <Route path="/profile" element={guarded(<ProfilePage />)} />
                <Route path="/notifications" element={guarded(<NotificationsPage />)} />
                <Route path="/services" element={guarded(<ServicesPage />)} />
                <Route path="/support" element={guarded(<SupportPage />)} />
                <Route path="/admin" element={guarded(<AdminPage />, ['staff', 'manager', 'admin'])} />
                <Route path="/login" element={<AuthPage mode="login" />} />
                <Route path="/register" element={<AuthPage mode="register" />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
                <Route path="/verify-email/:token" element={<VerifyEmailPage />} />
                <Route path="*" element={<p className="text-center py-28 text-slate-600">Page not found</p>} />
              </Routes>
            </Suspense>
          </main>
          <Footer />
        </div>
      </AuthProvider>
    </Router>
  );
}
