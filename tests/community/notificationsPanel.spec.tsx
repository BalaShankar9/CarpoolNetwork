// @vitest-environment jsdom
/**
 * Enterprise-grade tests for NotificationsPanel component
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockNavigate = vi.hoisted(() => vi.fn());
const mockMarkAsRead = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockMarkAllAsRead = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockUseNotifications = vi.hoisted(() => vi.fn().mockReturnValue({
  notifications: [],
  unreadCount: 0,
  loading: false,
  markAsRead: mockMarkAsRead,
  markAllAsRead: mockMarkAllAsRead,
  refresh: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ to, children, ...props }: any) => <a href={to} {...props}>{children}</a>,
}));

vi.mock('../../src/hooks/useNotifications', () => ({
  useNotifications: mockUseNotifications,
}));

vi.mock('../../src/services/notificationsService', () => ({
  formatNotification: vi.fn((notification: any) => ({
    title: `Title: ${notification.type}`,
    description: `Description for ${notification.type}`,
  })),
}));

vi.mock('lucide-react', async () => {
  const actual = await vi.importActual<any>('lucide-react');
  // Return all actual icons — they render fine in jsdom
  return actual;
});

import { NotificationsPanel } from '../../src/components/notifications/NotificationsPanel';

// ---------------------------------------------------------------------------
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); });

// =========================================================================
describe('NotificationsPanel', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(
      <NotificationsPanel isOpen={false} onClose={() => {}} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders the panel when isOpen is true', () => {
    render(<NotificationsPanel isOpen={true} onClose={() => {}} />);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      loading: true,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      refresh: vi.fn(),
    });

    render(<NotificationsPanel isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows empty state when no notifications', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [],
      unreadCount: 0,
      loading: false,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      refresh: vi.fn(),
    });

    render(<NotificationsPanel isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/no notifications/i)).toBeInTheDocument();
  });

  it('renders notification items', () => {
    const notifications = [
      { id: 'n1', type: 'FRIEND_REQUEST', data: { sender_name: 'Bob' }, created_at: '2026-01-15T10:00:00Z', read_at: null, user_id: 'u1' },
      { id: 'n2', type: 'NEW_MESSAGE', data: { sender_name: 'Charlie' }, created_at: '2026-01-15T09:00:00Z', read_at: '2026-01-15T09:30:00Z', user_id: 'u1' },
    ];

    mockUseNotifications.mockReturnValue({
      notifications,
      unreadCount: 1,
      loading: false,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      refresh: vi.fn(),
    });

    render(<NotificationsPanel isOpen={true} onClose={() => {}} />);
    const items = screen.getAllByTestId('notification-item');
    expect(items.length).toBe(2);
  });

  it('shows "Mark all read" button when there are unread notifications', () => {
    const notifications = [
      { id: 'n1', type: 'FRIEND_REQUEST', data: {}, created_at: '2026-01-15T10:00:00Z', read_at: null, user_id: 'u1' },
    ];

    mockUseNotifications.mockReturnValue({
      notifications,
      unreadCount: 1,
      loading: false,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      refresh: vi.fn(),
    });

    render(<NotificationsPanel isOpen={true} onClose={() => {}} />);
    expect(screen.getByTestId('panel-mark-all-read')).toBeInTheDocument();
  });

  it('calls markAllAsRead when "Mark all read" is clicked', async () => {
    const notifications = [
      { id: 'n1', type: 'FRIEND_REQUEST', data: {}, created_at: '2026-01-15T10:00:00Z', read_at: null, user_id: 'u1' },
    ];

    mockUseNotifications.mockReturnValue({
      notifications,
      unreadCount: 1,
      loading: false,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      refresh: vi.fn(),
    });

    render(<NotificationsPanel isOpen={true} onClose={() => {}} />);
    fireEvent.click(screen.getByTestId('panel-mark-all-read'));

    await waitFor(() => {
      expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1);
    });
  });

  it('calls markAsRead and navigates on notification click', async () => {
    const notifications = [
      { id: 'n1', type: 'FRIEND_REQUEST', data: { sender_name: 'Bob' }, created_at: '2026-01-15T10:00:00Z', read_at: null, user_id: 'u1' },
    ];
    const onClose = vi.fn();

    mockUseNotifications.mockReturnValue({
      notifications,
      unreadCount: 1,
      loading: false,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      refresh: vi.fn(),
    });

    render(<NotificationsPanel isOpen={true} onClose={onClose} />);
    const item = screen.getByTestId('notification-item');
    fireEvent.click(item);

    await waitFor(() => {
      expect(mockMarkAsRead).toHaveBeenCalledWith('n1');
    });
  });

  it('does not show "Mark all read" when unreadCount is 0', () => {
    const notifications = [
      { id: 'n1', type: 'FRIEND_REQUEST', data: {}, created_at: '2026-01-15T10:00:00Z', read_at: '2026-01-15T10:01:00Z', user_id: 'u1' },
    ];

    mockUseNotifications.mockReturnValue({
      notifications,
      unreadCount: 0,
      loading: false,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      refresh: vi.fn(),
    });

    render(<NotificationsPanel isOpen={true} onClose={() => {}} />);
    expect(screen.queryByTestId('panel-mark-all-read')).not.toBeInTheDocument();
  });

  it('renders "View all notifications" link', () => {
    mockUseNotifications.mockReturnValue({
      notifications: [
        { id: 'n1', type: 'SYSTEM', data: {}, created_at: '2026-01-15T10:00:00Z', read_at: null, user_id: 'u1' },
      ],
      unreadCount: 1,
      loading: false,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      refresh: vi.fn(),
    });

    render(<NotificationsPanel isOpen={true} onClose={() => {}} />);
    expect(screen.getByText(/view all notifications/i)).toBeInTheDocument();
  });
});
