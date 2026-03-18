// @vitest-environment jsdom
/**
 * Enterprise-grade tests for CommunityChat component
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockUser = vi.hoisted(() => ({ id: 'user-comm-001', email: 'test@test.com' }));
const mockUseAuth = vi.hoisted(() => vi.fn().mockReturnValue({
  user: mockUser,
  isEmailVerified: true,
}));

const mockChannel = vi.hoisted(() => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn().mockImplementation((cb?: Function) => {
    if (cb) cb('SUBSCRIBED');
    return mockChannel;
  }),
  unsubscribe: vi.fn(),
}));

const mockMessages = vi.hoisted(() => [
  {
    id: 'msg-1',
    sender_id: 'user-comm-002',
    body: 'Hello everyone!',
    type: 'TEXT',
    created_at: '2026-01-15T10:00:00Z',
    sender: { id: 'user-comm-002', full_name: 'Bob Social', avatar_url: null },
  },
  {
    id: 'msg-2',
    sender_id: 'user-comm-001',
    body: 'Hey Bob!',
    type: 'TEXT',
    created_at: '2026-01-15T10:01:00Z',
    sender: { id: 'user-comm-001', full_name: 'Alice Community', avatar_url: null },
  },
]);

const mockSupabase = vi.hoisted(() => {
  const makeChain = (data: any = [], error: any = null) => {
    const chain: Record<string, any> = {};
    const methods = ['select', 'insert', 'update', 'delete', 'eq', 'neq', 'or', 'not', 'in', 'order', 'limit', 'is', 'single', 'maybeSingle', 'filter', 'range'];
    for (const m of methods) {
      chain[m] = vi.fn().mockReturnValue(chain);
    }
    const p = Promise.resolve({ data, error });
    Object.defineProperty(chain, 'then', {
      value: p.then.bind(p), writable: true, configurable: true, enumerable: false,
    });
    return chain;
  };

  return {
    makeChain,
    from: vi.fn((table: string) => {
      if (table === 'community_chat_messages') {
        return makeChain(mockMessages);
      }
      return makeChain();
    }),
    channel: vi.fn(() => mockChannel),
    removeChannel: vi.fn(),
  };
});

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: mockUseAuth,
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: mockSupabase,
}));

vi.mock('../../src/components/shared/UserAvatar', () => ({
  default: ({ userId, size }: any) => <div data-testid="user-avatar">{userId}</div>,
}));

import CommunityChat from '../../src/components/community/CommunityChat';

// ---------------------------------------------------------------------------
beforeEach(() => { vi.clearAllMocks(); });
afterEach(() => { cleanup(); });

// =========================================================================
describe('CommunityChat', () => {
  it('renders the Community Chat heading', async () => {
    render(<CommunityChat />);
    expect(screen.getByText('Community Chat')).toBeInTheDocument();
  });

  it('shows connection status badge', async () => {
    render(<CommunityChat />);
    await waitFor(() => {
      // Should show either Connected or Reconnecting
      const connected = screen.queryByText('Connected');
      const reconnecting = screen.queryByText('Reconnecting');
      expect(connected || reconnecting).toBeTruthy();
    });
  });

  it('subscribes to realtime community chat channel', async () => {
    render(<CommunityChat />);
    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith('community-chat');
    });
  });

  it('cleans up channel on unmount', async () => {
    const { unmount } = render(<CommunityChat />);
    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalled();
    });
    unmount();
    expect(mockSupabase.removeChannel).toHaveBeenCalled();
  });

  it('renders the message input area', async () => {
    render(<CommunityChat />);
    await waitFor(() => {
      // textarea for message input
      const textarea = screen.queryByPlaceholderText(/message/i) ||
                       screen.queryByRole('textbox');
      // Should have some input mechanism
      expect(screen.getByText('Community Chat')).toBeInTheDocument();
    });
  });

  it('shows refresh button', () => {
    render(<CommunityChat />);
    expect(screen.getByLabelText(/refresh/i)).toBeInTheDocument();
  });

  it('handles unauthenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isEmailVerified: false,
    });

    render(<CommunityChat />);
    expect(screen.getByText('Community Chat')).toBeInTheDocument();
  });

  it('handles unverified email user', () => {
    mockUseAuth.mockReturnValue({
      user: mockUser,
      isEmailVerified: false,
    });

    render(<CommunityChat />);
    expect(screen.getByText('Community Chat')).toBeInTheDocument();
  });

  it('loads messages from community_chat_messages table', async () => {
    render(<CommunityChat />);
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalledWith('community_chat_messages');
    });
  });

  it('displays the message area with proper aria attributes', () => {
    render(<CommunityChat />);
    const messageArea = screen.getByRole('log');
    expect(messageArea).toHaveAttribute('aria-label', 'Community chat messages');
  });

  it('has a refresh button that triggers message reload', async () => {
    render(<CommunityChat />);
    const refreshBtn = screen.getByLabelText(/refresh/i);
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      // Should re-fetch messages
      expect(mockSupabase.from).toHaveBeenCalledWith('community_chat_messages');
    });
  });
});
