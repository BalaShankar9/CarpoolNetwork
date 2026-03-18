/**
 * Deferred Routes (Phase 2+)
 *
 * All routes that are out of scope for the V1 private beta.
 * These are only loaded when ENABLE_DEFERRED_FEATURES is true.
 *
 * Categories:
 *   - Social (social hub, friends, leaderboards, challenges, groups)
 *   - Pools, Favorites, Safety Center, Preferences, Analytics (user-facing)
 *   - SEO marketing pages (careers, press, city pages)
 *   - Extended admin (31 pages beyond the core 5)
 *   - PWA features
 */

import { lazy, ReactElement } from 'react';
import { Route, Navigate } from 'react-router-dom';
import { SocialProvider } from '../contexts/SocialContext';
import { PremiumProvider } from '../contexts/PremiumContext';
import Layout from '../components/layout/Layout';
import { ProtectedRoute, AdminRoute } from './guards';

// ---------------------------------------------------------------------------
// Lazy-loaded deferred page components
// ---------------------------------------------------------------------------

// Social
const SocialHub = lazy(() => import('../pages/SocialHub'));
const Friends = lazy(() => import('../pages/Friends'));
const Leaderboards = lazy(() => import('../pages/Leaderboards'));
const Challenges = lazy(() => import('../pages/Challenges'));
const GroupDetail = lazy(() => import('../pages/GroupDetail'));

// Other deferred protected
const Analytics = lazy(() => import('../pages/Analytics'));
const Preferences = lazy(() => import('../pages/Preferences'));
const Favorites = lazy(() => import('../pages/Favorites'));
const Pools = lazy(() => import('../pages/Pools'));
const SafetyCenter = lazy(() => import('../pages/SafetyCenter'));
const Community = lazy(() => import('../pages/Community'));
const CommunityPost = lazy(() => import('../pages/CommunityPost'));

// SEO marketing (deferred)
const CareersPage = lazy(() => import('../pages/public/CareersPage'));
const PressPage = lazy(() => import('../pages/public/PressPage'));
const CityPage = lazy(() => import('../pages/public/CityPage'));

// Extended admin
const UserDetailAdmin = lazy(() => import('../pages/admin/UserDetailAdmin'));
const FeedbackManagement = lazy(() => import('../pages/admin/FeedbackManagement'));
const Diagnostics = lazy(() => import('../pages/admin/Diagnostics'));
const VerificationQueue = lazy(() => import('../pages/admin/VerificationQueue'));
const SafetyReports = lazy(() => import('../pages/admin/SafetyReports'));
const SafetyReportDetail = lazy(() => import('../pages/admin/SafetyReportDetail'));
const SafetyDashboard = lazy(() => import('../pages/admin/SafetyDashboard'));
const AdvancedAnalytics = lazy(() => import('../pages/admin/AdvancedAnalytics'));
const AnalyticsSummary = lazy(() => import('../pages/admin/analytics/AnalyticsSummary'));
const UserAnalytics = lazy(() => import('../pages/admin/analytics/UserAnalytics'));
const RideAnalytics = lazy(() => import('../pages/admin/analytics/RideAnalytics'));
const GeoAnalytics = lazy(() => import('../pages/admin/analytics/GeoAnalytics'));
const OpsHealthAnalytics = lazy(() => import('../pages/admin/analytics/OpsHealthAnalytics'));
const LiveActivityMonitor = lazy(() => import('../pages/admin/LiveActivityMonitor'));
const BulkOperations = lazy(() => import('../pages/admin/BulkOperations'));
const PerformanceMonitor = lazy(() => import('../pages/admin/PerformanceMonitor'));
const AdminManagement = lazy(() => import('../pages/admin/AdminManagement'));
const AuditLog = lazy(() => import('../pages/admin/AuditLog'));
const RideDetailAdmin = lazy(() => import('../pages/admin/RideDetailAdmin'));
const BookingsManagement = lazy(() => import('../pages/admin/BookingsManagement'));
const BookingDetailAdmin = lazy(() => import('../pages/admin/BookingDetailAdmin'));
const MessagesManagement = lazy(() => import('../pages/admin/MessagesManagement'));
const ConversationDetailAdmin = lazy(() => import('../pages/admin/ConversationDetailAdmin'));
const MutedUsersManagement = lazy(() => import('../pages/admin/MutedUsersManagement'));
const CommunityManagement = lazy(() => import('../pages/admin/CommunityManagement'));
const PostDetailAdmin = lazy(() => import('../pages/admin/PostDetailAdmin'));
const ContentWarnings = lazy(() => import('../pages/admin/ContentWarnings'));
const NotificationsManagement = lazy(() => import('../pages/admin/NotificationsManagement'));
const AnnouncementsManagement = lazy(() => import('../pages/admin/AnnouncementsManagement'));
const NotificationTemplates = lazy(() => import('../pages/admin/NotificationTemplates'));
const PlatformSettings = lazy(() => import('../pages/admin/PlatformSettings'));
const SystemHealth = lazy(() => import('../pages/admin/SystemHealth'));
const IncidentQueue = lazy(() => import('../pages/admin/IncidentQueue'));
const PlatformHealthScore = lazy(() => import('../pages/admin/PlatformHealthScore'));
const IncidentAnalytics = lazy(() => import('../pages/admin/IncidentAnalytics'));
const StatusPageManager = lazy(() => import('../pages/admin/StatusPageManager'));

// ---------------------------------------------------------------------------
// Deferred Route elements — returns an array of <Route> elements
// ---------------------------------------------------------------------------

/**
 * Returns an array of <Route> elements for deferred features.
 * These MUST be placed inside a <Routes> wrapper (handled by AppRoutes).
 * Suspense is handled by the parent — no wrapper here.
 */
export function getDeferredRoutes(): ReactElement[] {
  return [
    /* ── Social Hub ──────────────────────────────────── */
    <Route key="d-social" path="/social" element={<ProtectedRoute><Layout><PremiumProvider><SocialProvider><SocialHub /></SocialProvider></PremiumProvider></Layout></ProtectedRoute>} />,
    <Route key="d-social-feed" path="/social/feed" element={<ProtectedRoute><Layout><PremiumProvider><SocialProvider><SocialHub /></SocialProvider></PremiumProvider></Layout></ProtectedRoute>} />,
    <Route key="d-social-friends" path="/social/friends" element={<ProtectedRoute><Layout><Friends /></Layout></ProtectedRoute>} />,
    <Route key="d-social-community" path="/social/community" element={<ProtectedRoute><Layout><Community /></Layout></ProtectedRoute>} />,
    <Route key="d-social-community-post" path="/social/community/:postId" element={<ProtectedRoute><Layout><CommunityPost /></Layout></ProtectedRoute>} />,
    <Route key="d-social-challenges" path="/social/challenges" element={<ProtectedRoute><Layout><Challenges /></Layout></ProtectedRoute>} />,
    <Route key="d-social-leaderboards" path="/social/leaderboards" element={<ProtectedRoute><Layout><Leaderboards /></Layout></ProtectedRoute>} />,
    <Route key="d-social-groups" path="/social/groups/:groupId" element={<ProtectedRoute><Layout><GroupDetail /></Layout></ProtectedRoute>} />,
    <Route key="d-friends-redirect" path="/friends" element={<Navigate to="/social?section=friends" replace />} />,

    /* ── Other deferred protected ────────────────────── */
    <Route key="d-leaderboards" path="/leaderboards" element={<ProtectedRoute><Layout><Leaderboards /></Layout></ProtectedRoute>} />,
    <Route key="d-challenges" path="/challenges" element={<ProtectedRoute><Layout><Challenges /></Layout></ProtectedRoute>} />,
    <Route key="d-analytics" path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />,
    <Route key="d-preferences" path="/preferences" element={<ProtectedRoute><Preferences /></ProtectedRoute>} />,
    <Route key="d-favorites" path="/favorites" element={<ProtectedRoute><Layout><Favorites /></Layout></ProtectedRoute>} />,
    <Route key="d-pools" path="/pools" element={<ProtectedRoute><Layout><Pools /></Layout></ProtectedRoute>} />,
    <Route key="d-safety" path="/safety" element={<ProtectedRoute><Layout><SafetyCenter /></Layout></ProtectedRoute>} />,

    /* ── SEO marketing (deferred) ────────────────────── */
    <Route key="d-careers" path="/careers" element={<CareersPage />} />,
    <Route key="d-press" path="/press" element={<PressPage />} />,
    <Route key="d-city" path="/cities/:city" element={<CityPage />} />,

    /* ── Extended Admin ──────────────────────────────── */
    <Route key="d-admin-user-detail" path="/admin/users/:userId" element={<AdminRoute><UserDetailAdmin /></AdminRoute>} />,
    <Route key="d-admin-feedback" path="/admin/feedback" element={<AdminRoute><FeedbackManagement /></AdminRoute>} />,
    <Route key="d-admin-diagnostics" path="/admin/diagnostics" element={<AdminRoute><Diagnostics /></AdminRoute>} />,
    <Route key="d-admin-verifications" path="/admin/verifications" element={<AdminRoute><VerificationQueue /></AdminRoute>} />,
    <Route key="d-admin-safety" path="/admin/safety" element={<AdminRoute><SafetyReports /></AdminRoute>} />,
    <Route key="d-admin-safety-report" path="/admin/safety/report/:reportId" element={<AdminRoute><SafetyReportDetail /></AdminRoute>} />,
    <Route key="d-admin-safety-dash" path="/admin/safety/dashboard" element={<AdminRoute><SafetyDashboard /></AdminRoute>} />,
    <Route key="d-admin-analytics" path="/admin/analytics" element={<AdminRoute><AdvancedAnalytics /></AdminRoute>} />,
    <Route key="d-admin-analytics-summary" path="/admin/analytics/summary" element={<AdminRoute><AnalyticsSummary /></AdminRoute>} />,
    <Route key="d-admin-analytics-users" path="/admin/analytics/users" element={<AdminRoute><UserAnalytics /></AdminRoute>} />,
    <Route key="d-admin-analytics-rides" path="/admin/analytics/rides" element={<AdminRoute><RideAnalytics /></AdminRoute>} />,
    <Route key="d-admin-analytics-geo" path="/admin/analytics/geo" element={<AdminRoute><GeoAnalytics /></AdminRoute>} />,
    <Route key="d-admin-analytics-ops" path="/admin/analytics/ops" element={<AdminRoute><OpsHealthAnalytics /></AdminRoute>} />,
    <Route key="d-admin-activity" path="/admin/activity" element={<AdminRoute><LiveActivityMonitor /></AdminRoute>} />,
    <Route key="d-admin-bulk" path="/admin/bulk-operations" element={<AdminRoute><BulkOperations /></AdminRoute>} />,
    <Route key="d-admin-perf" path="/admin/performance" element={<AdminRoute><PerformanceMonitor /></AdminRoute>} />,
    <Route key="d-admin-settings" path="/admin/settings" element={<AdminRoute><PlatformSettings /></AdminRoute>} />,
    <Route key="d-admin-health" path="/admin/health" element={<AdminRoute><SystemHealth /></AdminRoute>} />,
    <Route key="d-admin-admins" path="/admin/admins" element={<AdminRoute><AdminManagement /></AdminRoute>} />,
    <Route key="d-admin-audit" path="/admin/audit" element={<AdminRoute><AuditLog /></AdminRoute>} />,
    <Route key="d-admin-ride-detail" path="/admin/rides/:rideId" element={<AdminRoute><RideDetailAdmin /></AdminRoute>} />,
    <Route key="d-admin-bookings" path="/admin/bookings" element={<AdminRoute><BookingsManagement /></AdminRoute>} />,
    <Route key="d-admin-booking-detail" path="/admin/bookings/:bookingId" element={<AdminRoute><BookingDetailAdmin /></AdminRoute>} />,
    <Route key="d-admin-messages" path="/admin/messages" element={<AdminRoute><MessagesManagement /></AdminRoute>} />,
    <Route key="d-admin-muted" path="/admin/messages/muted" element={<AdminRoute><MutedUsersManagement /></AdminRoute>} />,
    <Route key="d-admin-conversation" path="/admin/messages/:id" element={<AdminRoute><ConversationDetailAdmin /></AdminRoute>} />,
    <Route key="d-admin-community" path="/admin/community" element={<AdminRoute><CommunityManagement /></AdminRoute>} />,
    <Route key="d-admin-warnings" path="/admin/community/warnings" element={<AdminRoute><ContentWarnings /></AdminRoute>} />,
    <Route key="d-admin-post-detail" path="/admin/community/:postId" element={<AdminRoute><PostDetailAdmin /></AdminRoute>} />,
    <Route key="d-admin-notifications" path="/admin/notifications" element={<AdminRoute><NotificationsManagement /></AdminRoute>} />,
    <Route key="d-admin-announcements" path="/admin/notifications/announcements" element={<AdminRoute><AnnouncementsManagement /></AdminRoute>} />,
    <Route key="d-admin-templates" path="/admin/notifications/templates" element={<AdminRoute><NotificationTemplates /></AdminRoute>} />,
    <Route key="d-admin-incidents" path="/admin/incidents" element={<AdminRoute><IncidentQueue /></AdminRoute>} />,
    <Route key="d-admin-health-score" path="/admin/health-score" element={<AdminRoute><PlatformHealthScore /></AdminRoute>} />,
    <Route key="d-admin-incident-analytics" path="/admin/incident-analytics" element={<AdminRoute><IncidentAnalytics /></AdminRoute>} />,
    <Route key="d-admin-status-mgr" path="/admin/status-manager" element={<AdminRoute><StatusPageManager /></AdminRoute>} />,
  ];
}
