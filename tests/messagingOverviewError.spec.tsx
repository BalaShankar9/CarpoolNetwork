// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import path from 'path';
import { fileURLToPath } from 'url';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const resolveModule = (relativePath: string) => path.resolve(testDir, relativePath);
const mockUser = { id: 'user-1' };
const mockProfile = { id: 'user-1', full_name: 'Test User' };
const mockSession = { access_token: 'token' };

const setupMocks = () => {
  vi.doMock(resolveModule('../src/contexts/AuthContext'), () => ({
    useAuth: () => ({
      user: mockUser,
      profile: mockProfile,
      isEmailVerified: true,
      session: mockSession,
    }),
  }));

  vi.doMock(resolveModule('../src/contexts/RealtimeContext'), () => ({
    useRealtime: () => ({
      refreshUnreadMessages: vi.fn(),
    }),
  }));

  vi.doMock('@tanstack/react-virtual', () => ({
    useVirtualizer: () => ({
      getTotalSize: () => 0,
      getVirtualItems: () => [],
      scrollToIndex: vi.fn(),
      measureElement: vi.fn(),
    }),
  }));

  vi.doMock(resolveModule('../src/lib/toast'), () => ({
    toast: {
      error: vi.fn(),
      warning: vi.fn(),
    },
  }));

  vi.doMock(resolveModule('../src/lib/supabase'), () => {
    const channel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    };

    return {
      supabase: {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: {
            code: 'PGRST202',
            message: 'Could not find the function public.get_conversations_overview without parameters in the schema cache',
          },
        }),
        channel: vi.fn().mockReturnValue(channel),
        removeChannel: vi.fn(),
        from: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
          update: vi.fn().mockReturnThis(),
          insert: vi.fn().mockReturnThis(),
          delete: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          lt: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
        })),
        storage: {
          from: vi.fn(() => ({
            upload: vi.fn(),
            createSignedUrl: vi.fn(),
          })),
        },
      },
    };
  });
};

describe('NewChatSystem conversations RPC fallback', () => {
  it('shows a friendly retry message when the RPC is missing', async () => {
    vi.resetModules();
    setupMocks();

    const { default: NewChatSystem } = await import('../src/components/messaging/NewChatSystem');
    render(<NewChatSystem />);

    expect(await screen.findByText(/Messages are updating\. Tap Retry\./i)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Retry/i })).toBeInTheDocument();
  });
});
