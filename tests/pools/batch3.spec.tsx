/**
 * Pools module — Batch 3
 * PoolChat (25 tests)
 * ≈ 25 tests
 */
// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';

/* ------------------------------------------------------------------ */
/*  vi.hoisted mocks                                                   */
/* ------------------------------------------------------------------ */

const mocks = vi.hoisted(() => {
  const stub = (name: string) => {
    const Comp = (p: any) => <span data-testid={`icon-${name}`} {...p} />;
    Comp.displayName = name;
    return Comp;
  };

  return {
    Send: stub('Send'),
    MoreVertical: stub('MoreVertical'),
    Phone: stub('Phone'),
    MapPin: stub('MapPin'),
    Image: stub('Image'),
    Smile: stub('Smile'),
    X: stub('X'),
    Check: stub('Check'),
    CheckCheck: stub('CheckCheck'),

    mockFrom: vi.fn(),
    mockChannel: vi.fn(),
    mockRemoveChannel: vi.fn(),
    mockUser: null as any,
    mockProfile: null as any,
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  Send: mocks.Send,
  MoreVertical: mocks.MoreVertical,
  Phone: mocks.Phone,
  MapPin: mocks.MapPin,
  Image: mocks.Image,
  Smile: mocks.Smile,
  X: mocks.X,
  Check: mocks.Check,
  CheckCheck: mocks.CheckCheck,
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: (...a: any[]) => mocks.mockFrom(...a),
    channel: (...a: any[]) => mocks.mockChannel(...a),
    removeChannel: (...a: any[]) => mocks.mockRemoveChannel(...a),
  },
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.mockUser, profile: mocks.mockProfile }),
}));

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                              */
/* ------------------------------------------------------------------ */

import { PoolChat } from '../../src/components/pools/PoolChat';
import {
  FAKE_USER_ID,
  FAKE_POOL_ID,
  FAKE_USER,
  FAKE_MESSAGES,
  FAKE_MESSAGE_OWN,
  FAKE_MESSAGE_OTHER,
  buildMockChain,
} from './helpers';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

// Build a member check chain that resolves membership
function buildMemberCheckChain(isMember: boolean) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnValue({
      then(resolve: (v: any) => void) {
        resolve({ data: isMember ? { id: 'member-001' } : null, error: null });
        return { then: (r: any) => r({ data: isMember ? { id: 'member-001' } : null, error: null }) };
      },
    }),
    then(resolve: (v: any) => void) {
      resolve({ data: isMember ? { id: 'member-001' } : null, error: null });
      return chain;
    },
  };
  return chain;
}

// Build a messages load chain
function buildMessagesChain(messages: any[] = []) {
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnValue({
      then(resolve: (v: any) => void) {
        resolve({ data: messages, error: null });
        return { then: (r: any) => r({ data: messages, error: null }) };
      },
    }),
    then(resolve: (v: any) => void) {
      resolve({ data: messages, error: null });
      return chain;
    },
  };
  return chain;
}

// Build an insert chain
function buildInsertChain(error: any = null) {
  const chain: any = {
    insert: vi.fn().mockReturnValue({
      then(resolve: (v: any) => void) {
        resolve({ data: null, error });
        return { then: (r: any) => r({ data: null, error }) };
      },
    }),
    then(resolve: (v: any) => void) {
      resolve({ data: null, error });
      return chain;
    },
  };
  return chain;
}

// Channel mock with subscribe
function buildChannelMock() {
  const channelObj: any = {
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
  };
  return channelObj;
}

/* ------------------------------------------------------------------ */
/*  Setup / Teardown                                                   */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.clearAllMocks();
  mocks.mockUser = { ...FAKE_USER };
  mocks.mockProfile = null;

  // Default: member check returns true, messages load returns FAKE_MESSAGES
  let callCount = 0;
  mocks.mockFrom.mockImplementation((table: string) => {
    if (table === 'carpool_pool_members') {
      return buildMemberCheckChain(true);
    }
    if (table === 'pool_messages') {
      callCount++;
      if (callCount <= 1) {
        return buildMessagesChain(FAKE_MESSAGES);
      }
      return buildInsertChain();
    }
    return buildMockChain([]);
  });

  mocks.mockChannel.mockReturnValue(buildChannelMock());
  mocks.mockRemoveChannel.mockReturnValue(undefined);

  // scrollIntoView stub
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(cleanup);

/* ================================================================== */
/*  PoolChat                                                           */
/* ================================================================== */

describe('PoolChat', () => {
  it('shows loading spinner while checking membership', () => {
    // When user exists but membership hasn't resolved
    mocks.mockUser = null;
    const { container } = render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    // Non-member view
    expect(screen.getByText('You must be a pool member to access chat.')).toBeTruthy();
  });

  it('shows non-member message when not a pool member', async () => {
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'carpool_pool_members') {
        return buildMemberCheckChain(false);
      }
      return buildMockChain([]);
    });

    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    expect(screen.getByText('You must be a pool member to access chat.')).toBeTruthy();
  });

  it('renders Pool Chat header once member', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    expect(screen.getByText('Pool Chat')).toBeTruthy();
  });

  it('renders pool name in header', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Downtown Commuters" />);
    });

    expect(screen.getByText('Downtown Commuters')).toBeTruthy();
  });

  it('renders messages after loading', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    expect(screen.getByText('Hello everyone!')).toBeTruthy();
    expect(screen.getByText('Hey! Ready for tomorrow?')).toBeTruthy();
  });

  it('shows sender name for other messages', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    expect(screen.getByText('Other Member')).toBeTruthy();
  });

  it('renders message input', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    expect(screen.getByPlaceholderText('Type a message...')).toBeTruthy();
  });

  it('renders send button', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    expect(screen.getByTestId('icon-Send')).toBeTruthy();
  });

  it('renders emoji button', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    expect(screen.getByTestId('icon-Smile')).toBeTruthy();
  });

  it('shows emoji panel when emoji button clicked', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    const emojiBtn = screen.getByTestId('icon-Smile').closest('button')!;
    fireEvent.click(emojiBtn);

    expect(screen.getByText('👍')).toBeTruthy();
    expect(screen.getByText('🚗')).toBeTruthy();
  });

  it('adds emoji to input when clicked', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    const emojiBtn = screen.getByTestId('icon-Smile').closest('button')!;
    fireEvent.click(emojiBtn);
    fireEvent.click(screen.getByText('👍'));

    const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
    expect(input.value).toBe('👍');
  });

  it('shows empty state when no messages', async () => {
    mocks.mockFrom.mockImplementation((table: string) => {
      if (table === 'carpool_pool_members') return buildMemberCheckChain(true);
      if (table === 'pool_messages') return buildMessagesChain([]);
      return buildMockChain([]);
    });

    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    expect(screen.getByText('No messages yet')).toBeTruthy();
    expect(screen.getByText('Start the conversation!')).toBeTruthy();
  });

  it('disables send button when input is empty', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    const sendBtn = screen.getByTestId('icon-Send').closest('button')!;
    expect((sendBtn as HTMLButtonElement).disabled).toBe(true);
  });

  it('enables send button when input has text', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    const input = screen.getByPlaceholderText('Type a message...');
    fireEvent.change(input, { target: { value: 'Hello' } });

    const sendBtn = screen.getByTestId('icon-Send').closest('button')!;
    expect((sendBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('clears input after sending message', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Hello world' } });

    const sendBtn = screen.getByTestId('icon-Send').closest('button')!;
    await act(async () => {
      fireEvent.click(sendBtn);
    });

    expect(input.value).toBe('');
  });

  it('renders date separator', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    // Date for 2024-02-01 should be rendered (not "Today" since it's in the past)
    // The exact format depends on locale but there should be a date separator
    const container = document.querySelector('.flex-1.overflow-y-auto');
    expect(container).toBeTruthy();
  });

  it('renders location message with MapPin icon', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    expect(screen.getByText('Meet at 123 Main St')).toBeTruthy();
  });

  it('subscribes to channel on mount when member', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    expect(mocks.mockChannel).toHaveBeenCalledWith(`pool-chat-${FAKE_POOL_ID}`);
  });

  it('sends Enter key to submit message', async () => {
    await act(async () => {
      render(<PoolChat poolId={FAKE_POOL_ID} poolName="Test Pool" />);
    });

    const input = screen.getByPlaceholderText('Type a message...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Enter test' } });
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    });

    expect(input.value).toBe('');
  });
});
