/**
 * V1 App Routes
 *
 * Only the routes needed for the private beta.
 * ~30 routes: auth, core rides, messaging, community, profile, settings, admin (5), legal, public.
 */

import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/layout/Layout';
import { PublicRoute, ProtectedRoute, RequireProfileComplete, AdminRoute, LoadingScreen } from './guards';
import { ENABLE_DEFERRED_FEATURES } from '../config/featureFlags';
import { getDeferredRoutes } from './deferredRoutes';

// ---------------------------------------------------------------------------
// Lazy-loaded page components
// ---------------------------------------------------------------------------

// Public SEO / marketing
const LandingPage = lazy(() => import('../pages/public/LandingPage'));
const AboutPage = lazy(() => import('../pages/public/AboutPage'));
const ContactPage = lazy(() => import('../pages/public/ContactPage'));
const FAQPage = lazy(() => import('../pages/public/FAQPage'));
const CookiesPolicy = lazy(() => import('../pages/public/CookiesPolicy'));
const SafetyInfo = lazy(() => import('../pages/public/SafetyInfo'));
const HowItWorks = lazy(() => import('../pages/public/HowItWorks'));
const Communities = lazy(() => import('../pages/public/Communities'));

// Auth
const SignIn = lazy(() => import('../pages/auth/SignIn'));
const SignUp = lazy(() => import('../pages/auth/SignUp'));
const VerifyOtp = lazy(() => import('../pages/auth/VerifyOtp'));
const VerifyEmail = lazy(() => import('../pages/auth/VerifyEmail'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('../pages/auth/ResetPassword'));

// Core protected pages
const Home = lazy(() => import('../pages/Home'));
const FindRides = lazy(() => import('../pages/FindRides'));
const PostRide = lazy(() => import('../pages/PostRide'));
const RequestRide = lazy(() => import('../pages/RequestRide'));
const MyRides = lazy(() => import('../pages/MyRides'));
const Messages = lazy(() => import('../pages/Messages'));
const Community = lazy(() => import('../pages/Community'));
const CommunityPost = lazy(() => import('../pages/CommunityPost'));
const Profile = lazy(() => import('../pages/Profile'));
const ProfileOnboarding = lazy(() => import('../pages/ProfileOnboarding'));
const PublicProfile = lazy(() => import('../pages/PublicProfile'));
const SecuritySettings = lazy(() => import('../pages/SecuritySettings'));
const Settings = lazy(() => import('../pages/Settings'));
const RideDetails = lazy(() => import('../pages/RideDetails'));
const BookingDetails = lazy(() => import('../pages/BookingDetails'));
const Notifications = lazy(() => import('../pages/Notifications'));
const HelpHub = lazy(() => import('../pages/HelpHub'));
const Unauthorized = lazy(() => import('../pages/Unauthorized'));

// Legal
const TermsOfService = lazy(() => import('../pages/TermsOfService'));
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy'));

// Status
const StatusPage = lazy(() => import('../pages/Status'));

// Admin — V1 core (5 pages)
const AdminDashboard = lazy(() => import('../pages/admin/AdminDashboard'));
const UserManagement = lazy(() => import('../pages/admin/UserManagement'));
const BugReports = lazy(() => import('../pages/admin/BugReports'));
const BetaManagement = lazy(() => import('../pages/admin/BetaManagement'));
const RidesManagement = lazy(() => import('../pages/admin/RidesManagement'));

// ---------------------------------------------------------------------------
// HomeRoute — shows landing page for unauthenticated, dashboard for authenticated
// ---------------------------------------------------------------------------

function HomeRoute() {
  const { user, loading, isEmailVerified, isProfileComplete } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LandingPage />;
  if (!isEmailVerified) return <Navigate to="/verify-email" replace />;
  if (!isProfileComplete) return <Navigate to="/onboarding/profile" replace />;

  return (
    <Layout>
      <Home />
    </Layout>
  );
}

// ---------------------------------------------------------------------------
// V1 Routes
// ---------------------------------------------------------------------------

export default function AppRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        {/* ── Public pages ───────────────────────────────────── */}
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/faq" element={<FAQPage />} />
        <Route path="/cookies" element={<CookiesPolicy />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/safety-info" element={<SafetyInfo />} />
        <Route path="/communities" element={<Communities />} />

        {/* ── Auth ────────────────────────────────────────────── */}
        <Route path="/signin" element={<PublicRoute><SignIn /></PublicRoute>} />
        <Route path="/signup" element={<PublicRoute><SignUp /></PublicRoute>} />
        <Route path="/verify-otp" element={<PublicRoute><VerifyOtp /></PublicRoute>} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ── Home (dual: landing / dashboard) ─────────────── */}
        <Route path="/" element={<HomeRoute />} />

        {/* ── Core protected ─────────────────────────────────── */}
        <Route path="/find-rides" element={<ProtectedRoute><Layout><FindRides /></Layout></ProtectedRoute>} />
        <Route path="/post-ride" element={<RequireProfileComplete><Layout><PostRide /></Layout></RequireProfileComplete>} />
        <Route path="/request-ride" element={<RequireProfileComplete><Layout><RequestRide /></Layout></RequireProfileComplete>} />
        <Route path="/my-rides" element={<ProtectedRoute><Layout><MyRides /></Layout></ProtectedRoute>} />
        <Route path="/messages" element={<ProtectedRoute><Layout><Messages /></Layout></ProtectedRoute>} />
        <Route path="/rides/:rideId" element={<ProtectedRoute><Layout><RideDetails /></Layout></ProtectedRoute>} />
        <Route path="/bookings/:bookingId" element={<ProtectedRoute><Layout><BookingDetails /></Layout></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute><Layout><Notifications /></Layout></ProtectedRoute>} />
        <Route path="/help" element={<ProtectedRoute><Layout><HelpHub /></Layout></ProtectedRoute>} />

        {/* ── Community (basic) ─────────────────────────────── */}
        <Route path="/community" element={<ProtectedRoute><Layout><Community /></Layout></ProtectedRoute>} />
        <Route path="/community/:postId" element={<ProtectedRoute><Layout><CommunityPost /></Layout></ProtectedRoute>} />

        {/* ── Profile & Settings ──────────────────────────── */}
        <Route path="/profile" element={<ProtectedRoute><Layout><Profile /></Layout></ProtectedRoute>} />
        <Route path="/onboarding/profile" element={<ProtectedRoute><ProfileOnboarding /></ProtectedRoute>} />
        <Route path="/user/:userId" element={<ProtectedRoute><Layout><PublicProfile /></Layout></ProtectedRoute>} />
        <Route path="/security" element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />

        {/* ── Legal ───────────────────────────────────────── */}
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />

        {/* ── Admin (V1 core — 5 pages) ──────────────────── */}
        <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/users" element={<AdminRoute><UserManagement /></AdminRoute>} />
        <Route path="/admin/bugs" element={<AdminRoute><BugReports /></AdminRoute>} />
        <Route path="/admin/beta" element={<AdminRoute><BetaManagement /></AdminRoute>} />
        <Route path="/admin/rides" element={<AdminRoute><RidesManagement /></AdminRoute>} />

        {/* ── Misc ────────────────────────────────────────── */}
        <Route path="/unauthorized" element={<ProtectedRoute><Layout><Unauthorized /></Layout></ProtectedRoute>} />
        <Route path="/status" element={<StatusPage />} />

        {/* ── Deferred routes (Phase 2+, behind feature flag) ─ */}
        {ENABLE_DEFERRED_FEATURES && getDeferredRoutes()}

        {/* ── 404 catch-all ───────────────────────────────── */}
        <Route path="*" element={
          <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Page not found</h2>
              <p className="text-gray-600 mb-6">The page you are looking for does not exist or has been moved.</p>
              <a href="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Go to Home
              </a>
            </div>
          </div>
        } />
      </Routes>
    </Suspense>
  );
}
