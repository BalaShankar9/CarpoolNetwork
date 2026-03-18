// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  profile: { full_name: 'Jane Doe', average_rating: 4.5, avatar_url: null, profile_photo_url: null } as any,
  signOut: vi.fn().mockResolvedValue(undefined),
  isAdmin: false,
  user: { id: 'u1' } as any,
  unreadNotifications: 0,
  unreadMessages: 0,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    profile: mocks.profile,
    signOut: mocks.signOut,
    isAdmin: mocks.isAdmin,
    user: mocks.user,
  }),
}));

vi.mock('../../src/contexts/RealtimeContext', () => ({
  useRealtime: () => ({
    unreadNotifications: mocks.unreadNotifications,
    unreadMessages: mocks.unreadMessages,
  }),
}));

vi.mock('../../src/components/shared/Logo', () => ({
  __esModule: true,
  default: ({ size }: any) => React.createElement('div', { 'data-testid': 'logo', 'data-size': size }, 'Logo'),
}));

vi.mock('../../src/components/shared/EnvironmentBanner', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'env-banner' }),
}));

vi.mock('../../src/components/shared/OfflineBanner', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'offline-banner' }),
}));

vi.mock('../../src/components/shared/FeedbackButton', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'feedback-button' }),
}));

vi.mock('../../src/components/shared/ProfilePictureBanner', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'profile-pic-banner' }),
}));

vi.mock('../../src/components/shared/ProfileCompletionBanner', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'profile-completion-banner' }),
}));

vi.mock('../../src/components/shared/ToastContainer', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'toast-container' }),
}));

vi.mock('../../src/components/notifications/NotificationsBell', () => ({
  NotificationsBell: ({ onClick }: any) =>
    React.createElement('button', { 'data-testid': 'notifications-bell', onClick }, 'Bell'),
}));

vi.mock('../../src/components/notifications/NotificationsPanel', () => ({
  NotificationsPanel: ({ isOpen, onClose }: any) =>
    isOpen ? React.createElement('div', { 'data-testid': 'notifications-panel' },
      React.createElement('button', { onClick: onClose }, 'Close Panel')
    ) : null,
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Home: s('Home'), Search: s('Search'), PlusCircle: s('PlusCircle'),
    Calendar: s('Calendar'), MessageSquare: s('MessageSquare'), User: s('User'),
    LogOut: s('LogOut'), LayoutDashboard: s('LayoutDashboard'), UserCheck: s('UserCheck'),
    Bug: s('Bug'), MapPin: s('MapPin'), Settings: s('Settings'), Users: s('Users'),
    Bell: s('Bell'), HelpCircle: s('HelpCircle'),
  };
});

import Layout from '../../src/components/layout/Layout';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile = { full_name: 'Jane Doe', average_rating: 4.5, avatar_url: null, profile_photo_url: null };
  mocks.signOut = vi.fn().mockResolvedValue(undefined);
  mocks.isAdmin = false;
  mocks.user = { id: 'u1' };
  mocks.unreadNotifications = 0;
  mocks.unreadMessages = 0;
});
afterEach(cleanup);

/* ═══════════════════════════════════════
   Header
   ═══════════════════════════════════════ */
describe('Layout – header', () => {
  it('renders logo', () => {
    renderWithRouter(<Layout>content</Layout>);
    expect(screen.getByTestId('logo')).toBeTruthy();
  });

  it('displays user name', () => {
    renderWithRouter(<Layout>content</Layout>);
    expect(screen.getByText('Jane Doe')).toBeTruthy();
  });

  it('displays rating', () => {
    renderWithRouter(<Layout>content</Layout>);
    expect(screen.getByText('Rating 4.5')).toBeTruthy();
  });

  it('shows default name when no full_name', () => {
    mocks.profile = { ...mocks.profile, full_name: '' };
    renderWithRouter(<Layout>content</Layout>);
    expect(screen.getByText('Account')).toBeTruthy();
  });

  it('shows rating 0.0 when no average_rating', () => {
    mocks.profile = { ...mocks.profile, average_rating: null };
    renderWithRouter(<Layout>content</Layout>);
    expect(screen.getByText('Rating 0.0')).toBeTruthy();
  });

  it('has sign out button', () => {
    renderWithRouter(<Layout>content</Layout>);
    expect(screen.getByTestId('sign-out-button')).toBeTruthy();
  });

  it('has notifications bell', () => {
    renderWithRouter(<Layout>content</Layout>);
    expect(screen.getAllByTestId('notifications-bell').length).toBeGreaterThanOrEqual(1);
  });
});

/* ═══════════════════════════════════════
   Navigation items
   ═══════════════════════════════════════ */
describe('Layout – navigation', () => {
  it('renders all nav items', () => {
    renderWithRouter(<Layout>content</Layout>);
    expect(screen.getAllByText('Home').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Find Rides')).toBeTruthy();
    expect(screen.getByText('Post Ride')).toBeTruthy();
    expect(screen.getByText('Request Ride')).toBeTruthy();
    expect(screen.getByText('My Rides')).toBeTruthy();
    expect(screen.getByText('Messages')).toBeTruthy();
    expect(screen.getAllByText('Community').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Help')).toBeTruthy();
    expect(screen.getAllByText('Profile').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Settings')).toBeTruthy();
  });

  it('renders Notifications button in sidebar', () => {
    renderWithRouter(<Layout>content</Layout>);
    expect(screen.getByText('Notifications')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   Admin items
   ═══════════════════════════════════════ */
describe('Layout – admin', () => {
  it('hides admin nav when not admin', () => {
    mocks.isAdmin = false;
    renderWithRouter(<Layout>content</Layout>);
    expect(screen.queryByText('Dashboard')).toBeNull();
    expect(screen.queryByText('Bug Reports')).toBeNull();
  });

  it('shows admin nav when admin', () => {
    mocks.isAdmin = true;
    renderWithRouter(<Layout>content</Layout>);
    expect(screen.getByText('Admin')).toBeTruthy();
    expect(screen.getByText('Dashboard')).toBeTruthy();
    expect(screen.getByText('Users')).toBeTruthy();
    expect(screen.getByText('Bug Reports')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   Badges
   ═══════════════════════════════════════ */
describe('Layout – badges', () => {
  it('shows message badge when unread > 0', () => {
    mocks.unreadMessages = 5;
    renderWithRouter(<Layout>content</Layout>);
    const badges = screen.getAllByTestId('messages-badge');
    expect(badges.length).toBeGreaterThanOrEqual(1);
  });

  it('shows notification badge when unread > 0', () => {
    mocks.unreadNotifications = 3;
    renderWithRouter(<Layout>content</Layout>);
    expect(screen.getByTestId('notification-badge')).toBeTruthy();
  });

  it('hides message badge when unread = 0', () => {
    mocks.unreadMessages = 0;
    renderWithRouter(<Layout>content</Layout>);
    expect(screen.queryByTestId('messages-badge')).toBeNull();
  });

  it('shows 99+ for > 99 unread messages', () => {
    mocks.unreadMessages = 150;
    renderWithRouter(<Layout>content</Layout>);
    const badges = screen.getAllByTestId('messages-badge');
    // The sidebar badge shows 99+, the mobile badge shows 9+
    const sidebarBadge = badges.find(b => b.textContent === '99+');
    expect(sidebarBadge).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   Children
   ═══════════════════════════════════════ */
describe('Layout – content', () => {
  it('renders children', () => {
    renderWithRouter(<Layout><div data-testid="child">Hello</div></Layout>);
    expect(screen.getByTestId('child')).toBeTruthy();
    expect(screen.getByText('Hello')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   Shared components
   ═══════════════════════════════════════ */
describe('Layout – shared banners', () => {
  it('renders EnvironmentBanner', () => {
    renderWithRouter(<Layout>x</Layout>);
    expect(screen.getByTestId('env-banner')).toBeTruthy();
  });

  it('renders OfflineBanner', () => {
    renderWithRouter(<Layout>x</Layout>);
    expect(screen.getByTestId('offline-banner')).toBeTruthy();
  });

  it('renders FeedbackButton', () => {
    renderWithRouter(<Layout>x</Layout>);
    expect(screen.getByTestId('feedback-button')).toBeTruthy();
  });

  it('renders ToastContainer', () => {
    renderWithRouter(<Layout>x</Layout>);
    expect(screen.getByTestId('toast-container')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   Mobile bottom nav
   ═══════════════════════════════════════ */
describe('Layout – mobile nav', () => {
  it('renders mobile nav items', () => {
    renderWithRouter(<Layout>x</Layout>);
    // Mobile nav shows: Home, Find, Community, Chat, Profile
    expect(screen.getByText('Find')).toBeTruthy();
    expect(screen.getByText('Chat')).toBeTruthy();
  });
});
