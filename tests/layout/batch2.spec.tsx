// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  user: { id: 'u1' } as any,
  profile: { full_name: 'John Doe', avatar_url: null, profile_photo_url: null, average_rating: 4.2 } as any,
  signOut: vi.fn().mockResolvedValue(undefined),
  isAdmin: false,
  navigate: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mocks.user,
    profile: mocks.profile,
    signOut: mocks.signOut,
    isAdmin: mocks.isAdmin,
  }),
}));

vi.mock('../../src/contexts/RealtimeContext', () => ({
  useRealtime: () => ({}),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
  };
});

vi.mock('../../src/components/shared/Logo', () => ({
  __esModule: true,
  default: () => React.createElement('div', { 'data-testid': 'logo' }, 'Logo'),
}));

vi.mock('../../src/components/notifications/NotificationsBell', () => ({
  NotificationsBell: ({ onClick }: any) =>
    React.createElement('button', { 'data-testid': 'notifications-bell', onClick }, 'Bell'),
}));

vi.mock('../../src/components/notifications/NotificationsPanel', () => ({
  NotificationsPanel: ({ isOpen, onClose }: any) =>
    isOpen ? React.createElement('div', { 'data-testid': 'notifications-panel' },
      React.createElement('button', { onClick: onClose }, 'Close')
    ) : null,
}));

vi.mock('../../src/components/shared/ClickableUserProfile', () => ({
  __esModule: true,
  default: ({ user, additionalInfo }: any) =>
    React.createElement('div', { 'data-testid': 'user-profile' },
      React.createElement('span', null, user.full_name),
      additionalInfo && React.createElement('span', null, additionalInfo),
    ),
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Menu: s('Menu'), X: s('X'), MessageSquare: s('MessageSquare'),
    Settings: s('Settings'), Shield: s('Shield'),
  };
});

import Navbar from '../../src/components/layout/Navbar';

const renderNavbar = () => render(<MemoryRouter><Navbar /></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'u1' };
  mocks.profile = { full_name: 'John Doe', avatar_url: null, profile_photo_url: null, average_rating: 4.2 };
  mocks.signOut = vi.fn().mockResolvedValue(undefined);
  mocks.isAdmin = false;
});
afterEach(cleanup);

/* ═══════════════════════════════════════
   Basic rendering
   ═══════════════════════════════════════ */
describe('Navbar – basics', () => {
  it('renders logo', () => {
    renderNavbar();
    expect(screen.getByTestId('logo')).toBeTruthy();
  });

  it('renders navigation links', () => {
    renderNavbar();
    expect(screen.getByText('Find a Ride')).toBeTruthy();
    expect(screen.getByText('Offer a Ride')).toBeTruthy();
    expect(screen.getByText('How It Works')).toBeTruthy();
    expect(screen.getByText('Safety')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   Logged in user
   ═══════════════════════════════════════ */
describe('Navbar – authenticated', () => {
  it('shows Sign Out button', () => {
    renderNavbar();
    expect(screen.getByText('Sign Out')).toBeTruthy();
  });

  it('shows user profile', () => {
    renderNavbar();
    expect(screen.getByTestId('user-profile')).toBeTruthy();
    expect(screen.getByText('John Doe')).toBeTruthy();
  });

  it('shows rating in profile info', () => {
    renderNavbar();
    expect(screen.getByText('⭐ 4.2')).toBeTruthy();
  });

  it('shows notifications bell', () => {
    renderNavbar();
    expect(screen.getByTestId('notifications-bell')).toBeTruthy();
  });

  it('hides sign in / get started', () => {
    renderNavbar();
    expect(screen.queryByText('Sign In')).toBeNull();
    expect(screen.queryByText('Get Started')).toBeNull();
  });

  it('hides admin button when not admin', () => {
    renderNavbar();
    expect(screen.queryByTestId('icon-Shield')).toBeNull();
  });
});

/* ═══════════════════════════════════════
   Guest user
   ═══════════════════════════════════════ */
describe('Navbar – guest', () => {
  beforeEach(() => {
    mocks.user = null;
    mocks.profile = null;
  });

  it('shows Sign In link', () => {
    renderNavbar();
    expect(screen.getByText('Sign In')).toBeTruthy();
  });

  it('shows Get Started link', () => {
    renderNavbar();
    expect(screen.getByText('Get Started')).toBeTruthy();
  });

  it('hides Sign Out', () => {
    renderNavbar();
    expect(screen.queryByText('Sign Out')).toBeNull();
  });
});

/* ═══════════════════════════════════════
   Admin
   ═══════════════════════════════════════ */
describe('Navbar – admin', () => {
  it('shows admin shield button', () => {
    mocks.isAdmin = true;
    renderNavbar();
    // Shield icon is rendered for admin panel button
    const shieldIcons = document.querySelectorAll('[data-testid="icon-Shield"]');
    expect(shieldIcons.length).toBeGreaterThanOrEqual(1);
  });
});

/* ═══════════════════════════════════════
   Mobile menu
   ═══════════════════════════════════════ */
describe('Navbar – mobile menu', () => {
  it('opens mobile menu on hamburger click', () => {
    renderNavbar();
    const menuIcon = document.querySelector('[data-testid="icon-Menu"]')!;
    fireEvent.click(menuIcon.closest('button')!);
    // Mobile menu should render links
    const findRideLinks = screen.getAllByText('Find a Ride');
    expect(findRideLinks.length).toBeGreaterThanOrEqual(2); // desktop + mobile
  });

  it('shows Sign Out in mobile menu when logged in', () => {
    renderNavbar();
    const menuIcon = document.querySelector('[data-testid="icon-Menu"]')!;
    fireEvent.click(menuIcon.closest('button')!);
    const signOutBtns = screen.getAllByText('Sign Out');
    expect(signOutBtns.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Sign In in mobile menu when guest', () => {
    mocks.user = null;
    mocks.profile = null;
    renderNavbar();
    const menuIcon = document.querySelector('[data-testid="icon-Menu"]')!;
    fireEvent.click(menuIcon.closest('button')!);
    const signInLinks = screen.getAllByText('Sign In');
    expect(signInLinks.length).toBeGreaterThanOrEqual(2);
  });

  it('shows Admin Panel in mobile menu for admin', () => {
    mocks.isAdmin = true;
    renderNavbar();
    const menuIcon = document.querySelector('[data-testid="icon-Menu"]')!;
    fireEvent.click(menuIcon.closest('button')!);
    expect(screen.getByText('Admin Panel')).toBeTruthy();
  });
});
