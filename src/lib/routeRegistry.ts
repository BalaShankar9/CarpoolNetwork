/**
 * Route Registry for SEO Audit Crawler
 *
 * This file exports all application routes to ensure the crawler
 * can discover pages even if they're not linked in the navigation.
 *
 * Routes are categorized by access level and SEO priority.
 */

export interface RouteEntry {
  path: string;
  name: string;
  access: 'public' | 'auth' | 'protected' | 'admin';
  seoIndexable: boolean;
  priority: 'high' | 'medium' | 'low';
  dynamic?: boolean;
  dynamicExamples?: string[];
}

/**
 * Public SEO Pages - Indexed by search engines
 */
export const publicRoutes: RouteEntry[] = [
  { path: '/', name: 'Landing Page', access: 'public', seoIndexable: true, priority: 'high' },
  { path: '/how-it-works', name: 'How It Works', access: 'public', seoIndexable: true, priority: 'high' },
  { path: '/safety-info', name: 'Safety Information', access: 'public', seoIndexable: true, priority: 'high' },
  { path: '/communities', name: 'Communities Directory', access: 'public', seoIndexable: true, priority: 'high' },
  { path: '/terms', name: 'Terms of Service', access: 'public', seoIndexable: true, priority: 'medium' },
  { path: '/privacy', name: 'Privacy Policy', access: 'public', seoIndexable: true, priority: 'medium' },
];

/**
 * City Pages - Dynamic but pre-defined cities
 */
export const cityRoutes: RouteEntry[] = [
  {
    path: '/cities/:city',
    name: 'City Page',
    access: 'public',
    seoIndexable: true,
    priority: 'high',
    dynamic: true,
    dynamicExamples: [
      '/cities/cardiff',
      '/cities/sheffield',
      '/cities/bristol',
      '/cities/manchester',
    ]
  },
];

/**
 * Auth Routes - Public but not indexed
 */
export const authRoutes: RouteEntry[] = [
  { path: '/signin', name: 'Sign In', access: 'auth', seoIndexable: false, priority: 'low' },
  { path: '/signup', name: 'Sign Up', access: 'auth', seoIndexable: false, priority: 'low' },
  { path: '/verify-otp', name: 'Verify OTP', access: 'auth', seoIndexable: false, priority: 'low' },
  { path: '/verify-email', name: 'Verify Email', access: 'auth', seoIndexable: false, priority: 'low' },
  { path: '/forgot-password', name: 'Forgot Password', access: 'auth', seoIndexable: false, priority: 'low' },
  { path: '/reset-password', name: 'Reset Password', access: 'auth', seoIndexable: false, priority: 'low' },
];

/**
 * Protected Routes - Require authentication
 */
export const protectedRoutes: RouteEntry[] = [
  { path: '/find-rides', name: 'Find Rides', access: 'protected', seoIndexable: false, priority: 'medium' },
  { path: '/my-rides', name: 'My Rides', access: 'protected', seoIndexable: false, priority: 'medium' },
  { path: '/messages', name: 'Messages', access: 'protected', seoIndexable: false, priority: 'medium' },
  { path: '/community', name: 'Community', access: 'protected', seoIndexable: false, priority: 'medium' },
  { path: '/profile', name: 'Profile', access: 'protected', seoIndexable: false, priority: 'medium' },
  { path: '/settings', name: 'Settings', access: 'protected', seoIndexable: false, priority: 'low' },
  { path: '/preferences', name: 'Preferences', access: 'protected', seoIndexable: false, priority: 'low' },
  { path: '/analytics', name: 'Analytics', access: 'protected', seoIndexable: false, priority: 'low' },
  { path: '/leaderboards', name: 'Leaderboards', access: 'protected', seoIndexable: false, priority: 'low' },
  { path: '/challenges', name: 'Challenges', access: 'protected', seoIndexable: false, priority: 'low' },
  { path: '/friends', name: 'Friends', access: 'protected', seoIndexable: false, priority: 'low' },
  { path: '/notifications', name: 'Notifications', access: 'protected', seoIndexable: false, priority: 'low' },
  { path: '/safety', name: 'Safety Center', access: 'protected', seoIndexable: false, priority: 'low' },
  { path: '/favorites', name: 'Favorites', access: 'protected', seoIndexable: false, priority: 'low' },
  { path: '/pools', name: 'Pools', access: 'protected', seoIndexable: false, priority: 'low' },
  { path: '/help', name: 'Help Hub', access: 'protected', seoIndexable: false, priority: 'low' },
  { path: '/onboarding/profile', name: 'Profile Onboarding', access: 'protected', seoIndexable: false, priority: 'low' },
  { path: '/unauthorized', name: 'Unauthorized', access: 'protected', seoIndexable: false, priority: 'low' },
];

/**
 * Protected Dynamic Routes - Require authentication + dynamic IDs
 */
export const protectedDynamicRoutes: RouteEntry[] = [
  { path: '/community/:postId', name: 'Community Post', access: 'protected', seoIndexable: false, priority: 'low', dynamic: true },
  { path: '/rides/:rideId', name: 'Ride Details', access: 'protected', seoIndexable: false, priority: 'low', dynamic: true },
  { path: '/bookings/:bookingId', name: 'Booking Details', access: 'protected', seoIndexable: false, priority: 'low', dynamic: true },
  { path: '/user/:userId', name: 'Public Profile', access: 'protected', seoIndexable: false, priority: 'low', dynamic: true },
  { path: '/social/groups/:groupId', name: 'Group Detail', access: 'protected', seoIndexable: false, priority: 'low', dynamic: true },
];

/**
 * Admin Routes - Require admin role
 */
export const adminRoutes: RouteEntry[] = [
  { path: '/admin', name: 'Admin Dashboard', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/users', name: 'User Management', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/bugs', name: 'Bug Reports', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/verifications', name: 'Verification Queue', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/safety', name: 'Safety Reports', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/safety/dashboard', name: 'Safety Dashboard', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/analytics', name: 'Advanced Analytics', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/analytics/summary', name: 'Analytics Summary', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/analytics/users', name: 'User Analytics', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/analytics/rides', name: 'Ride Analytics', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/analytics/geo', name: 'Geo Analytics', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/analytics/ops', name: 'Ops Health Analytics', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/activity', name: 'Live Activity Monitor', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/bulk-operations', name: 'Bulk Operations', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/performance', name: 'Performance Monitor', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/settings', name: 'Platform Settings', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/health', name: 'System Health', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/admins', name: 'Admin Management', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/audit', name: 'Audit Log', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/rides', name: 'Rides Management', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/bookings', name: 'Bookings Management', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/messages', name: 'Messages Management', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/messages/muted', name: 'Muted Users Management', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/community', name: 'Community Management', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/community/warnings', name: 'Content Warnings', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/notifications', name: 'Notifications Management', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/notifications/announcements', name: 'Announcements Management', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/notifications/templates', name: 'Notification Templates', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/beta', name: 'Beta Management', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/feedback', name: 'Feedback Management', access: 'admin', seoIndexable: false, priority: 'low' },
  { path: '/admin/diagnostics', name: 'Diagnostics', access: 'admin', seoIndexable: false, priority: 'low' },
];

/**
 * Admin Dynamic Routes
 */
export const adminDynamicRoutes: RouteEntry[] = [
  { path: '/admin/users/:userId', name: 'User Detail Admin', access: 'admin', seoIndexable: false, priority: 'low', dynamic: true },
  { path: '/admin/safety/report/:reportId', name: 'Safety Report Detail', access: 'admin', seoIndexable: false, priority: 'low', dynamic: true },
  { path: '/admin/rides/:rideId', name: 'Ride Detail Admin', access: 'admin', seoIndexable: false, priority: 'low', dynamic: true },
  { path: '/admin/bookings/:bookingId', name: 'Booking Detail Admin', access: 'admin', seoIndexable: false, priority: 'low', dynamic: true },
  { path: '/admin/messages/:id', name: 'Conversation Detail Admin', access: 'admin', seoIndexable: false, priority: 'low', dynamic: true },
  { path: '/admin/community/:postId', name: 'Post Detail Admin', access: 'admin', seoIndexable: false, priority: 'low', dynamic: true },
];

/**
 * Get all routes as a flat array
 */
export function getAllRoutes(): RouteEntry[] {
  return [
    ...publicRoutes,
    ...cityRoutes,
    ...authRoutes,
    ...protectedRoutes,
    ...protectedDynamicRoutes,
    ...adminRoutes,
    ...adminDynamicRoutes,
  ];
}

/**
 * Get routes by access level
 */
export function getRoutesByAccess(access: RouteEntry['access']): RouteEntry[] {
  return getAllRoutes().filter(route => route.access === access);
}

/**
 * Get SEO-indexable routes only
 */
export function getSeoIndexableRoutes(): RouteEntry[] {
  return getAllRoutes().filter(route => route.seoIndexable);
}

/**
 * Get all concrete paths (expanding dynamic routes with examples)
 */
export function getAllConcretePaths(access?: RouteEntry['access']): string[] {
  const routes = access ? getRoutesByAccess(access) : getAllRoutes();
  const paths: string[] = [];

  for (const route of routes) {
    if (route.dynamic && route.dynamicExamples) {
      paths.push(...route.dynamicExamples);
    } else if (!route.dynamic) {
      paths.push(route.path);
    }
  }

  return paths;
}

/**
 * Get paths for crawler seeding based on auth level
 */
export function getCrawlerSeedPaths(options: {
  includePublic?: boolean;
  includeAuth?: boolean;
  includeProtected?: boolean;
  includeAdmin?: boolean;
} = {}): string[] {
  const {
    includePublic = true,
    includeAuth = false,
    includeProtected = false,
    includeAdmin = false
  } = options;

  const paths: string[] = [];

  if (includePublic) {
    paths.push(...getAllConcretePaths('public'));
  }
  if (includeAuth) {
    paths.push(...getAllConcretePaths('auth'));
  }
  if (includeProtected) {
    paths.push(...getAllConcretePaths('protected'));
  }
  if (includeAdmin) {
    paths.push(...getAllConcretePaths('admin'));
  }

  return [...new Set(paths)]; // Deduplicate
}

export default {
  publicRoutes,
  cityRoutes,
  authRoutes,
  protectedRoutes,
  protectedDynamicRoutes,
  adminRoutes,
  adminDynamicRoutes,
  getAllRoutes,
  getRoutesByAccess,
  getSeoIndexableRoutes,
  getAllConcretePaths,
  getCrawlerSeedPaths,
};
