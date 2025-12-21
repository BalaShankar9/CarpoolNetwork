import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, useAuth } from './contexts/AuthContext';

const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;
import { RealtimeProvider } from './contexts/RealtimeContext';
import SignIn from './pages/auth/SignIn';
import SignUp from './pages/auth/SignUp';
import VerifyOtp from './pages/auth/VerifyOtp';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import Home from './pages/Home';
import FindRides from './pages/FindRides';
import PostRide from './pages/PostRide';
import RequestRide from './pages/RequestRide';
import MyRides from './pages/MyRides';
import Messages from './pages/Messages';
import Profile from './pages/Profile';
import SecuritySettings from './pages/SecuritySettings';
import RideDetails from './pages/RideDetails';
import BookingDetails from './pages/BookingDetails';
import TermsOfService from './pages/TermsOfService';
import PrivacyPolicy from './pages/PrivacyPolicy';
import Preferences from './pages/Preferences';
import BetaManagement from './pages/admin/BetaManagement';
import FeedbackManagement from './pages/admin/FeedbackManagement';
import Diagnostics from './pages/admin/Diagnostics';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import BugReports from './pages/admin/BugReports';
import Layout from './components/layout/Layout';


function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  return (
    <Router>
      <Routes>
        <Route path="/signin" element={
          <PublicRoute>
            <SignIn />
          </PublicRoute>
        } />
        <Route path="/signup" element={
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        } />
        <Route path="/verify-otp" element={
          <PublicRoute>
            <VerifyOtp />
          </PublicRoute>
        } />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        } />
        <Route path="/reset-password" element={
          <ResetPassword />
        } />
        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <Home />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/find-rides" element={
          <ProtectedRoute>
            <Layout>
              <FindRides />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/post-ride" element={
          <ProtectedRoute>
            <Layout>
              <PostRide />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/request-ride" element={
          <ProtectedRoute>
            <Layout>
              <RequestRide />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/my-rides" element={
          <ProtectedRoute>
            <Layout>
              <MyRides />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/messages" element={
          <ProtectedRoute>
            <Layout>
              <Messages />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/security" element={
          <ProtectedRoute>
            <SecuritySettings />
          </ProtectedRoute>
        } />
        <Route path="/preferences" element={
          <ProtectedRoute>
            <Preferences />
          </ProtectedRoute>
        } />
        <Route path="/rides/:rideId" element={
          <ProtectedRoute>
            <Layout>
              <RideDetails />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/bookings/:bookingId" element={
          <ProtectedRoute>
            <Layout>
              <BookingDetails />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/admin/beta" element={
          <ProtectedRoute>
            <BetaManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/feedback" element={
          <ProtectedRoute>
            <FeedbackManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/diagnostics" element={
          <ProtectedRoute>
            <Diagnostics />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/users" element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/bugs" element={
          <ProtectedRoute>
            <BugReports />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <RealtimeProvider>
        <AppContent />
      </RealtimeProvider>
    </AuthProvider>
  );
}

export default App;
