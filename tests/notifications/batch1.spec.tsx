// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  unreadNotifications: 0,
  notifications: [] as any[],
  unreadCount: 0,
  loading: false,
  markAsRead: vi.fn().mockResolvedValue(undefined),
  markAllAsRead: vi.fn().mockResolvedValue(undefined),
  refreshNotifications: vi.fn(),
  navigate: vi.fn(),
}));

vi.mock('../../src/contexts/RealtimeContext', () => ({
  useRealtime: () => ({
    unreadNotifications: mocks.unreadNotifications,
    notifications: mocks.notifications,
    loading: mocks.loading,
    markAsRead: mocks.markAsRead,
    markAllAsRead: mocks.markAllAsRead,
    refreshNotifications: mocks.refreshNotifications,
  }),
}));

vi.mock('../../src/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: mocks.notifications,
    unreadCount: mocks.unreadCount,
    loading: mocks.loading,
    markAsRead: mocks.markAsRead,
    markAllAsRead: mocks.markAllAsRead,
    refresh: mocks.refreshNotifications,
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../../src/services/notificationsService', () => ({
  formatNotification: (n: any) => ({
    title: n.data?.title || 'Test Title',
    description: n.data?.description || 'Test description',
  }),
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Bell: s('Bell'), X: s('X'), CheckCircle2: s('CheckCircle2'),
    MessageCircle: s('MessageCircle'), UserPlus: s('UserPlus'),
    MessageSquare: s('MessageSquare'), AlertTriangle: s('AlertTriangle'),
    Car: s('Car'), Calendar: s('Calendar'), Star: s('Star'),
    Shield: s('Shield'),
  };
});

import { NotificationsBell } from '../../src/components/notifications/NotificationsBell';
import { NotificationsPanel } from '../../src/components/notifications/NotificationsPanel';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.unreadNotifications = 0;
  mocks.notifications = [];
  mocks.unreadCount = 0;
  mocks.loading = false;
});
afterEach(cleanup);

/* ═══════════════════════════════════════
   NotificationsBell
   ═══════════════════════════════════════ */
describe('NotificationsBell', () => {
  it('renders bell icon', () => {
    render(<NotificationsBell onClick={vi.fn()} />);
    expect(document.querySelector('[data-testid="icon-Bell"]')).toBeTruthy();
  });

  it('has Notifications aria-label', () => {
    render(<NotificationsBell onClick={vi.fn()} />);
    expect(screen.getByLabelText('Notifications')).toBeTruthy();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<NotificationsBell onClick={onClick} />);
    fireEvent.click(screen.getByLabelText('Notifications'));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('shows no badge when unread is 0', () => {
    mocks.unreadNotifications = 0;
    render(<NotificationsBell onClick={vi.fn()} />);
    expect(document.querySelector('[data-testid="notification-badge"]')).toBeFalsy();
  });

  it('shows badge with count when unread > 0', () => {
    mocks.unreadNotifications = 5;
    render(<NotificationsBell onClick={vi.fn()} />);
    const badge = document.querySelector('[data-testid="notification-badge"]');
    expect(badge).toBeTruthy();
    expect(badge!.textContent).toBe('5');
  });

  it('shows 99+ when unread > 99', () => {
    mocks.unreadNotifications = 150;
    render(<NotificationsBell onClick={vi.fn()} />);
    const badge = document.querySelector('[data-testid="notification-badge"]');
    expect(badge!.textContent).toBe('99+');
  });

  it('shows exact count at 99', () => {
    mocks.unreadNotifications = 99;
    render(<NotificationsBell onClick={vi.fn()} />);
    const badge = document.querySelector('[data-testid="notification-badge"]');
    expect(badge!.textContent).toBe('99');
  });
});

/* ═══════════════════════════════════════
   NotificationsPanel — closed state
   ═══════════════════════════════════════ */
describe('NotificationsPanel (closed)', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<NotificationsPanel isOpen={false} onClose={vi.fn()} />);
    expect(container.innerHTML).toBe('');
  });
});

/* ═══════════════════════════════════════
   NotificationsPanel — open state
   ═══════════════════════════════════════ */
describe('NotificationsPanel (open)', () => {
  it('shows Notifications heading', () => {
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Notifications')).toBeTruthy();
  });

  it('shows loading state', () => {
    mocks.loading = true;
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Loading...')).toBeTruthy();
  });

  it('shows empty state when no notifications', () => {
    mocks.notifications = [];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('No notifications')).toBeTruthy();
  });

  it('shows View all notifications link', () => {
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('View all notifications')).toBeTruthy();
  });

  it('navigates to /notifications when View all clicked', () => {
    const onClose = vi.fn();
    render(<NotificationsPanel isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('View all notifications'));
    expect(mocks.navigate).toHaveBeenCalledWith('/notifications');
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when X button clicked', () => {
    const onClose = vi.fn();
    render(<NotificationsPanel isOpen={true} onClose={onClose} />);
    // X button has the X icon inside
    const xIcon = document.querySelector('[data-testid="icon-X"]')!;
    fireEvent.click(xIcon.closest('button')!);
    expect(onClose).toHaveBeenCalled();
  });

  it('renders notification items', () => {
    mocks.notifications = [
      { id: 'n1', type: 'NEW_MESSAGE', data: { title: 'New Message', description: 'Hello' }, read_at: null, created_at: '2024-06-15T12:00:00Z' },
      { id: 'n2', type: 'FRIEND_REQUEST', data: { title: 'Friend Request', description: 'From Alice' }, read_at: '2024-06-15T12:00:00Z', created_at: '2024-06-14T12:00:00Z' },
    ];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    const items = document.querySelectorAll('[data-testid="notification-item"]');
    expect(items.length).toBe(2);
  });

  it('shows title and description from formatNotification', () => {
    mocks.notifications = [
      { id: 'n1', type: 'NEW_MESSAGE', data: { title: 'New Message', description: 'Hello world' }, read_at: null, created_at: '2024-06-15T12:00:00Z' },
    ];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('New Message')).toBeTruthy();
    expect(screen.getByText('Hello world')).toBeTruthy();
  });

  it('shows unread indicator dot for unread notifications', () => {
    mocks.notifications = [
      { id: 'n1', type: 'NEW_MESSAGE', data: { title: 'T', description: 'D' }, read_at: null, created_at: '2024-06-15T12:00:00Z' },
    ];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(document.querySelector('.bg-blue-500.rounded-full')).toBeTruthy();
  });

  it('does not show dot for read notifications', () => {
    mocks.notifications = [
      { id: 'n1', type: 'NEW_MESSAGE', data: { title: 'T', description: 'D' }, read_at: '2024-06-15T12:00:00Z', created_at: '2024-06-14T12:00:00Z' },
    ];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(document.querySelector('.bg-blue-500.rounded-full')).toBeFalsy();
  });

  it('applies blue background to unread items', () => {
    mocks.notifications = [
      { id: 'n1', type: 'NEW_MESSAGE', data: { title: 'T', description: 'D' }, read_at: null, created_at: '2024-06-15T12:00:00Z' },
    ];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    const item = document.querySelector('[data-testid="notification-item"]')!;
    expect(item.className).toContain('bg-blue-50');
  });

  it('shows Mark all read button when unread > 0', () => {
    mocks.unreadCount = 3;
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('Mark all read')).toBeTruthy();
  });

  it('does not show Mark all read when unread = 0', () => {
    mocks.unreadCount = 0;
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(screen.queryByText('Mark all read')).toBeFalsy();
  });

  it('calls markAllAsRead when Mark all read clicked', () => {
    mocks.unreadCount = 2;
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Mark all read'));
    expect(mocks.markAllAsRead).toHaveBeenCalled();
  });

  it('calls markAsRead when notification clicked', async () => {
    mocks.notifications = [
      { id: 'n1', type: 'NEW_MESSAGE', data: { title: 'T', description: 'D', conversation_id: 'c1' }, read_at: null, created_at: '2024-06-15T12:00:00Z' },
    ];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(document.querySelector('[data-testid="notification-item"]')!);
    await waitFor(() => {
      expect(mocks.markAsRead).toHaveBeenCalledWith('n1');
    });
  });

  it('navigates to messages for NEW_MESSAGE notification', async () => {
    const onClose = vi.fn();
    mocks.notifications = [
      { id: 'n1', type: 'NEW_MESSAGE', data: { title: 'T', description: 'D', conversation_id: 'c1' }, read_at: null, created_at: '2024-06-15T12:00:00Z' },
    ];
    render(<NotificationsPanel isOpen={true} onClose={onClose} />);
    fireEvent.click(document.querySelector('[data-testid="notification-item"]')!);
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/messages?c=c1', { state: { conversationId: 'c1' } });
    });
  });

  it('navigates to friends for FRIEND_REQUEST', async () => {
    const onClose = vi.fn();
    mocks.notifications = [
      { id: 'n1', type: 'FRIEND_REQUEST', data: { title: 'T', description: 'D' }, read_at: '2024-06-15', created_at: '2024-06-15T12:00:00Z' },
    ];
    render(<NotificationsPanel isOpen={true} onClose={onClose} />);
    fireEvent.click(document.querySelector('[data-testid="notification-item"]')!);
    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith('/social/friends', { state: undefined });
    });
  });

  it('shows individual mark-read button for unread notifications', () => {
    mocks.notifications = [
      { id: 'n1', type: 'NEW_MESSAGE', data: { title: 'T', description: 'D' }, read_at: null, created_at: '2024-06-15T12:00:00Z' },
    ];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(document.querySelector('[data-testid="panel-mark-read-button"]')).toBeTruthy();
  });

  it('calls markAsRead from individual mark-read button without navigating', async () => {
    mocks.notifications = [
      { id: 'n1', type: 'SYSTEM', data: { title: 'T', description: 'D' }, read_at: null, created_at: '2024-06-15T12:00:00Z' },
    ];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    fireEvent.click(document.querySelector('[data-testid="panel-mark-read-button"]')!);
    await waitFor(() => {
      expect(mocks.markAsRead).toHaveBeenCalledWith('n1');
    });
  });

  it('shows notification date', () => {
    mocks.notifications = [
      { id: 'n1', type: 'SYSTEM', data: { title: 'T', description: 'D' }, read_at: null, created_at: '2024-06-15T12:00:00Z' },
    ];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    // Date should be rendered via toLocaleDateString
    expect(screen.getByText(/6\/15\/2024|15\/06\/2024|2024/)).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   NotificationsPanel — icons per type
   ═══════════════════════════════════════ */
describe('NotificationsPanel – notification icons', () => {
  const makeNotif = (type: string) => ({
    id: `n-${type}`,
    type,
    data: { title: type, description: 'desc' },
    read_at: '2024-06-15',
    created_at: '2024-06-15T12:00:00Z',
  });

  it('shows MessageCircle for NEW_MESSAGE', () => {
    mocks.notifications = [makeNotif('NEW_MESSAGE')];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(document.querySelector('[data-testid="icon-MessageCircle"]')).toBeTruthy();
  });

  it('shows UserPlus for FRIEND_REQUEST', () => {
    mocks.notifications = [makeNotif('FRIEND_REQUEST')];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(document.querySelector('[data-testid="icon-UserPlus"]')).toBeTruthy();
  });

  it('shows Car for RIDE_MATCH', () => {
    mocks.notifications = [makeNotif('RIDE_MATCH')];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(document.querySelector('[data-testid="icon-Car"]')).toBeTruthy();
  });

  it('shows Calendar for BOOKING_REQUEST', () => {
    mocks.notifications = [makeNotif('BOOKING_REQUEST')];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(document.querySelector('[data-testid="icon-Calendar"]')).toBeTruthy();
  });

  it('shows Star for REVIEW', () => {
    mocks.notifications = [makeNotif('REVIEW')];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(document.querySelector('[data-testid="icon-Star"]')).toBeTruthy();
  });

  it('shows Shield for SAFETY_ALERT', () => {
    mocks.notifications = [makeNotif('SAFETY_ALERT')];
    render(<NotificationsPanel isOpen={true} onClose={vi.fn()} />);
    expect(document.querySelector('[data-testid="icon-Shield"]')).toBeTruthy();
  });
});
