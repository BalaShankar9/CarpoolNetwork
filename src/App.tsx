import { Suspense, lazy, ReactNode } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { RealtimeProvider } from './contexts/RealtimeContext';
import { PremiumProvider } from './contexts/PremiumContext';
import Layout from './components/layout/Layout';
import { AppErrorBoundary } from './components/shared/ProductionErrorBoundary';
import { LoadingProvider } from './components/shared/LoadingStateManager';
import { InstallPrompt, UpdatePrompt, OfflineIndicator } from './components/pwa';

const Router = Capacitor.isNativePlatform() ? HashRouter : BrowserRouter;

const SignIn = lazy(() => import('./pages/auth/SignIn'));
const SignUp = lazy(() => import('./pages/auth/SignUp'));
const VerifyOtp = lazy(() => import('./pages/auth/VerifyOtp'));
const VerifyEmail = lazy(() => import('./pages/auth/VerifyEmail'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Home = lazy(() => import('./pages/Home'));
const FindRides = lazy(() => import('./pages/FindRides'));
const PostRide = lazy(() => import('./pages/PostRide'));
const RequestRide = lazy(() => import('./pages/RequestRide'));
const MyRides = lazy(() => import('./pages/MyRides'));
const Messages = lazy(() => import('./pages/Messages'));
const Community = lazy(() => import('./pages/Community'));
const CommunityPost = lazy(() => import('./pages/CommunityPost'));
const Profile = lazy(() => import('./pages/Profile'));
const ProfileOnboarding = lazy(() => import('./pages/ProfileOnboarding'));
const PublicProfile = lazy(() => import('./pages/PublicProfile'));
const SecuritySettings = lazy(() => import('./pages/SecuritySettings'));
const Analytics = lazy(() => import('./pages/Analytics'));
const RideDetails = lazy(() => import('./pages/RideDetails'));
const BookingDetails = lazy(() => import('./pages/BookingDetails'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const Preferences = lazy(() => import('./pages/Preferences'));
const BetaManagement = lazy(() => import('./pages/admin/BetaManagement'));
const FeedbackManagement = lazy(() => import('./pages/admin/FeedbackManagement'));
const Diagnostics = lazy(() => import('./pages/admin/Diagnostics'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const BugReports = lazy(() => import('./pages/admin/BugReports'));
const VerificationQueue = lazy(() => import('./pages/admin/VerificationQueue'));
const SafetyReports = lazy(() => import('./pages/admin/SafetyReports'));
const SafetyReportDetail = lazy(() => import('./pages/admin/SafetyReportDetail'));
const SafetyDashboard = lazy(() => import('./pages/admin/SafetyDashboard'));
const AdvancedAnalytics = lazy(() => import('./pages/admin/AdvancedAnalytics'));
const LiveActivityMonitor = lazy(() => import('./pages/admin/LiveActivityMonitor'));
const BulkOperations = lazy(() => import('./pages/admin/BulkOperations'));
const PerformanceMonitor = lazy(() => import('./pages/admin/PerformanceMonitor'));
const Leaderboards = lazy(() => import('./pages/Leaderboards'));
const Challenges = lazy(() => import('./pages/Challenges'));
const Settings = lazy(() => import('./pages/Settings'));
const Friends = lazy(() => import('./pages/Friends'));
const GroupDetail = lazy(() => import('./pages/GroupDetail'));
const HelpHub = lazy(() => import('./pages/HelpHub'));
const Notifications = lazy(() => import('./pages/Notifications'));
const SafetyCenter = lazy(() => import('./pages/SafetyCenter'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Pools = lazy(() => import('./pages/Pools'));
const AdminManagement = lazy(() => import('./pages/admin/AdminManagement'));
const AuditLog = lazy(() => import('./pages/admin/AuditLog'));
const RidesManagement = lazy(() => import('./pages/admin/RidesManagement'));
const RideDetailAdmin = lazy(() => import('./pages/admin/RideDetailAdmin'));
const BookingsManagement = lazy(() => import('./pages/admin/BookingsManagement'));
const BookingDetailAdmin = lazy(() => import('./pages/admin/BookingDetailAdmin'));
const MessagesManagement = lazy(() => import('./pages/admin/MessagesManagement'));
const ConversationDetailAdmin = lazy(() => import('./pages/admin/ConversationDetailAdmin'));
const MutedUsersManagement = lazy(() => import('./pages/admin/MutedUsersManagement'));
const CommunityManagement = lazy(() => import('./pages/admin/CommunityManagement'));
const PostDetailAdmin = lazy(() => import('./pages/admin/PostDetailAdmin'));
const ContentWarnings = lazy(() => import('./pages/admin/ContentWarnings'));
const NotificationsManagement = lazy(() => import('./pages/admin/NotificationsManagement'));
const AnnouncementsManagement = lazy(() => import('./pages/admin/AnnouncementsManagement'));
const NotificationTemplates = lazy(() => import('./pages/admin/NotificationTemplates'));
const UserDetailAdmin = lazy(() => import('./pages/admin/UserDetailAdmin'));
const PlatformSettings = lazy(() => import('./pages/admin/PlatformSettings'));
const SystemHealth = lazy(() => import('./pages/admin/SystemHealth'));

const LoadingScreen = () => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600">Loading...</p>
    </div>
  </div>
);

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading, isEmailVerified } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  // Require email verification to access protected routes
  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  return <>{children}</>;
}

function RequireProfileComplete({ children }: { children: ReactNode }) {
  const { user, loading, isEmailVerified, isProfileComplete } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <Navigate to="/signin" replace />;
  }

  if (!isEmailVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!isProfileComplete) {
    return <Navigate to="/onboarding/profile" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AppContent() {
  return (
    <Suspense fallback={<LoadingScreen />}>
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
          <RequireProfileComplete>
            <Layout>
              <PostRide />
            </Layout>
          </RequireProfileComplete>
        } />
        <Route path="/request-ride" element={
          <RequireProfileComplete>
            <Layout>
              <RequestRide />
            </Layout>
          </RequireProfileComplete>
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
        <Route path="/community" element={
          <ProtectedRoute>
            <Layout>
              <Community />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/community/:postId" element={
          <ProtectedRoute>
            <Layout>
              <CommunityPost />
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
        <Route path="/onboarding/profile" element={
          <ProtectedRoute>
            <ProfileOnboarding />
          </ProtectedRoute>
        } />
        <Route path="/user/:userId" element={
          <ProtectedRoute>
            <Layout>
              <PublicProfile />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/security" element={
          <ProtectedRoute>
            <SecuritySettings />
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/preferences" element={
          <ProtectedRoute>
            <Preferences />
          </ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        } />
        <Route path="/leaderboards" element={
          <ProtectedRoute>
            <Leaderboards />
          </ProtectedRoute>
        } />
        <Route path="/challenges" element={
          <ProtectedRoute>
            <Challenges />
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
        <Route path="/friends" element={
          <ProtectedRoute>
            <Layout>
              <Friends />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/social/groups/:groupId" element={
          <ProtectedRoute>
            <Layout>
              <GroupDetail />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/notifications" element={
          <ProtectedRoute>
            <Layout>
              <Notifications />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/safety" element={
          <ProtectedRoute>
            <Layout>
              <SafetyCenter />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/favorites" element={
          <ProtectedRoute>
            <Layout>
              <Favorites />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/pools" element={
          <ProtectedRoute>
            <Layout>
              <Pools />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/help" element={
          <ProtectedRoute>
            <Layout>
              <HelpHub />
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
        <Route path="/admin/users/:userId" element={
          <ProtectedRoute>
            <UserDetailAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/bugs" element={
          <ProtectedRoute>
            <BugReports />
          </ProtectedRoute>
        } />
        <Route path="/admin/verifications" element={
          <ProtectedRoute>
            <VerificationQueue />
          </ProtectedRoute>
        } />
        <Route path="/admin/safety" element={
          <ProtectedRoute>
            <SafetyReports />
          </ProtectedRoute>
        } />
        <Route path="/admin/safety/report/:reportId" element={
          <ProtectedRoute>
            <SafetyReportDetail />
          </ProtectedRoute>
        } />
        <Route path="/admin/safety/dashboard" element={
          <ProtectedRoute>
            <SafetyDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/analytics" element={
          <ProtectedRoute>
            <AdvancedAnalytics />
          </ProtectedRoute>
        } />
        <Route path="/admin/activity" element={
          <ProtectedRoute>
            <LiveActivityMonitor />
          </ProtectedRoute>
        } />
        <Route path="/admin/bulk-operations" element={
          <ProtectedRoute>
            <BulkOperations />
          </ProtectedRoute>
        } />
        <Route path="/admin/performance" element={
          <ProtectedRoute>
            <PerformanceMonitor />
          </ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute>
            <PlatformSettings />
          </ProtectedRoute>
        } />
        <Route path="/admin/health" element={
          <ProtectedRoute>
            <SystemHealth />
          </ProtectedRoute>
        } />
        <Route path="/admin/admins" element={
          <ProtectedRoute>
            <AdminManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/audit" element={
          <ProtectedRoute>
            <AuditLog />
          </ProtectedRoute>
        } />
        <Route path="/admin/rides" element={
          <ProtectedRoute>
            <RidesManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/rides/:rideId" element={
          <ProtectedRoute>
            <RideDetailAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/bookings" element={
          <ProtectedRoute>
            <BookingsManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/bookings/:bookingId" element={
          <ProtectedRoute>
            <BookingDetailAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/messages" element={
          <ProtectedRoute>
            <MessagesManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/messages/muted" element={
          <ProtectedRoute>
            <MutedUsersManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/messages/:id" element={
          <ProtectedRoute>
            <ConversationDetailAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/community" element={
          <ProtectedRoute>
            <CommunityManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/community/warnings" element={
          <ProtectedRoute>
            <ContentWarnings />
          </ProtectedRoute>
        } />
        <Route path="/admin/community/:postId" element={
          <ProtectedRoute>
            <PostDetailAdmin />
          </ProtectedRoute>
        } />
        <Route path="/admin/notifications" element={
          <ProtectedRoute>
            <NotificationsManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/notifications/announcements" element={
          <ProtectedRoute>
            <AnnouncementsManagement />
          </ProtectedRoute>
        } />
        <Route path="/admin/notifications/templates" element={
          <ProtectedRoute>
            <NotificationTemplates />
          </ProtectedRoute>
        } />
      </Routes>
    </Suspense>
  );
}

function App() {
  return (
    <LoadingProvider>
      <AuthProvider>
        <PremiumProvider>
          <RealtimeProvider>
            <Router>
              <AppErrorBoundary>
                <AppContent />
                {/* PWA Components */}
                <InstallPrompt />
                <UpdatePrompt />
                <OfflineIndicator />
              </AppErrorBoundary>
            </Router>
          </RealtimeProvider>
        </PremiumProvider>
      </AuthProvider>
    </LoadingProvider>
  );
}

export default App;
