// @vitest-environment jsdom
/**
 * Enterprise-grade tests for NotificationsBell component
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockUseRealtime = vi.hoisted(() => vi.fn().mockReturnValue({
  notifications: [],
  unreadNotifications: 0,
  loading: false,
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  refreshNotifications: vi.fn(),
}));

vi.mock('../../src/contexts/RealtimeContext', () => ({
  useRealtime: mockUseRealtime,
}));

import { NotificationsBell } from '../../src/components/notifications/NotificationsBell';

// ---------------------------------------------------------------------------
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); });

// =========================================================================
describe('NotificationsBell', () => {
  it('renders the bell button', () => {
    render(<NotificationsBell onClick={() => {}} />);
    expect(screen.getByRole('button', { name: /notifications/i })).toBeInTheDocument();
  });

  it('does not show badge when unread count is 0', () => {
    mockUseRealtime.mockReturnValue({
      notifications: [],
      unreadNotifications: 0,
      loading: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      refreshNotifications: vi.fn(),
    });

    render(<NotificationsBell onClick={() => {}} />);
    expect(screen.queryByTestId('notification-badge')).not.toBeInTheDocument();
  });

  it('shows badge with count when unread > 0', () => {
    mockUseRealtime.mockReturnValue({
      notifications: [],
      unreadNotifications: 5,
      loading: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      refreshNotifications: vi.fn(),
    });

    render(<NotificationsBell onClick={() => {}} />);
    const badge = screen.getByTestId('notification-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('5');
  });

  it('shows 99+ when unread exceeds 99', () => {
    mockUseRealtime.mockReturnValue({
      notifications: [],
      unreadNotifications: 150,
      loading: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      refreshNotifications: vi.fn(),
    });

    render(<NotificationsBell onClick={() => {}} />);
    const badge = screen.getByTestId('notification-badge');
    expect(badge).toHaveTextContent('99+');
  });

  it('calls onClick when button is clicked', () => {
    const handleClick = vi.fn();
    render(<NotificationsBell onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button', { name: /notifications/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows badge for exactly 1 unread notification', () => {
    mockUseRealtime.mockReturnValue({
      notifications: [],
      unreadNotifications: 1,
      loading: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      refreshNotifications: vi.fn(),
    });

    render(<NotificationsBell onClick={() => {}} />);
    const badge = screen.getByTestId('notification-badge');
    expect(badge).toHaveTextContent('1');
  });

  it('shows badge for exactly 99 unread notifications', () => {
    mockUseRealtime.mockReturnValue({
      notifications: [],
      unreadNotifications: 99,
      loading: false,
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
      refreshNotifications: vi.fn(),
    });

    render(<NotificationsBell onClick={() => {}} />);
    const badge = screen.getByTestId('notification-badge');
    expect(badge).toHaveTextContent('99');
  });
});
