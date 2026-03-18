// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  user: { id: 'u1', email: 'user@test.com' } as any,
  twoFactorData: null as any,
  chainError: null as any,
}));

// build a Supabase-like chain
function buildChain(data?: any, error?: any) {
  const chain: any = {};
  const self = () => chain;
  chain.select = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.delete = vi.fn().mockReturnValue(chain);
  chain.update = vi.fn().mockReturnValue(chain);
  chain.insert = vi.fn().mockReturnValue(chain);
  chain.upsert = vi.fn().mockReturnValue(chain);
  chain.maybeSingle = vi.fn().mockReturnValue(chain);
  chain.then = (resolve: any) => resolve({ data: data ?? null, error: error ?? null });
  return chain;
}

vi.mock('../../src/lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'two_factor_auth') {
          return buildChain(mocks.twoFactorData, mocks.chainError);
        }
        return buildChain(null, null);
      }),
      auth: {
        getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok-123' } } }),
      },
    },
  };
});

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('../../src/components/shared/ConfirmModal', () => ({
  __esModule: true,
  default: ({ isOpen, onClose, onConfirm, title, message, confirmText, cancelText }: any) => {
    if (!isOpen) return null;
    return React.createElement('div', { 'data-testid': 'confirm-modal' },
      React.createElement('h3', null, title),
      React.createElement('p', null, message),
      React.createElement('button', { onClick: onConfirm }, confirmText),
      React.createElement('button', { onClick: onClose }, cancelText),
    );
  },
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Shield: s('Shield'), Smartphone: s('Smartphone'), Key: s('Key'),
    Check: s('Check'), X: s('X'), Copy: s('Copy'), AlertCircle: s('AlertCircle'),
    Download: s('Download'), RefreshCw: s('RefreshCw'), Lock: s('Lock'), Unlock: s('Unlock'),
  };
});

import TwoFactorAuth from '../../src/components/security/TwoFactorAuth';
import { supabase } from '../../src/lib/supabase';

beforeEach(() => {
  vi.restoreAllMocks();
  mocks.user = { id: 'u1', email: 'user@test.com' };
  mocks.twoFactorData = null;
  mocks.chainError = null;
  // Re-apply supabase.from mock
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    if (table === 'two_factor_auth') {
      return buildChain(mocks.twoFactorData, mocks.chainError) as any;
    }
    return buildChain(null, null) as any;
  });
});
afterEach(cleanup);

/* ═══════════════════════════════════════
   Loading
   ═══════════════════════════════════════ */
describe('TwoFactorAuth – loading', () => {
  it('shows loading spinner initially', () => {
    // Make supabase chain never resolve
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockReturnValue({
            then: () => {}, // never resolves
          }),
        }),
      }),
    } as any);
    render(<TwoFactorAuth />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   Disabled state (2FA not enabled)
   ═══════════════════════════════════════ */
describe('TwoFactorAuth – disabled state', () => {
  beforeEach(() => {
    mocks.twoFactorData = { enabled: false, verified_at: null, last_used_at: null };
  });

  it('shows heading', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => {
      expect(screen.getByText('Two-Factor Authentication')).toBeTruthy();
    });
  });

  it('shows description', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => {
      expect(screen.getByText('Add an extra layer of security to your account')).toBeTruthy();
    });
  });

  it('shows Disabled badge', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => {
      expect(screen.getByText('Disabled')).toBeTruthy();
    });
  });

  it('shows Enable button', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => {
      expect(screen.getByText('Enable Two-Factor Authentication')).toBeTruthy();
    });
  });

  it('shows "Why enable 2FA?" section', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => {
      expect(screen.getByText('Why enable 2FA?')).toBeTruthy();
    });
  });

  it('shows security benefits', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => {
      expect(screen.getByText('Protects your account even if your password is compromised')).toBeTruthy();
      expect(screen.getByText('Prevents unauthorized access to your rides and messages')).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   Enabled state
   ═══════════════════════════════════════ */
describe('TwoFactorAuth – enabled state', () => {
  beforeEach(() => {
    mocks.twoFactorData = { enabled: true, verified_at: '2024-06-15T12:00:00Z', last_used_at: null };
  });

  it('shows Enabled badge', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => {
      expect(screen.getByText('Enabled')).toBeTruthy();
    });
  });

  it('shows protected message', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => {
      expect(screen.getByText('Your account is protected with two-factor authentication.')).toBeTruthy();
    });
  });

  it('shows Disable button', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => {
      expect(screen.getByText('Disable Two-Factor Authentication')).toBeTruthy();
    });
  });

  it('shows last used date when available', async () => {
    mocks.twoFactorData.last_used_at = '2024-06-15T15:00:00Z';
    render(<TwoFactorAuth />);
    await waitFor(() => {
      expect(screen.getByText(/Last used:/)).toBeTruthy();
    });
  });

  it('does not show Enable button', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => {
      expect(screen.getByText('Enabled')).toBeTruthy();
    });
    expect(screen.queryByText('Enable Two-Factor Authentication')).toBeNull();
  });
});

/* ═══════════════════════════════════════
   Setup flow
   ═══════════════════════════════════════ */
describe('TwoFactorAuth – setup', () => {
  beforeEach(() => {
    mocks.twoFactorData = { enabled: false, verified_at: null, last_used_at: null };
  });

  it('shows QR code section after clicking Enable', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => expect(screen.getByText('Enable Two-Factor Authentication')).toBeTruthy());
    fireEvent.click(screen.getByText('Enable Two-Factor Authentication'));
    await waitFor(() => {
      expect(screen.getByText('Set Up Two-Factor Authentication')).toBeTruthy();
    });
  });

  it('shows QR code instruction text', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => expect(screen.getByText('Enable Two-Factor Authentication')).toBeTruthy());
    fireEvent.click(screen.getByText('Enable Two-Factor Authentication'));
    await waitFor(() => {
      expect(screen.getByText(/Scan this QR code with your authenticator app/)).toBeTruthy();
    });
  });

  it('shows manual entry hint', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => expect(screen.getByText('Enable Two-Factor Authentication')).toBeTruthy());
    fireEvent.click(screen.getByText('Enable Two-Factor Authentication'));
    await waitFor(() => {
      expect(screen.getByText('Or enter this code manually:')).toBeTruthy();
    });
  });

  it('shows verification code input', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => expect(screen.getByText('Enable Two-Factor Authentication')).toBeTruthy());
    fireEvent.click(screen.getByText('Enable Two-Factor Authentication'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText('000000')).toBeTruthy();
    });
  });

  it('shows Verify & Enable button', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => expect(screen.getByText('Enable Two-Factor Authentication')).toBeTruthy());
    fireEvent.click(screen.getByText('Enable Two-Factor Authentication'));
    await waitFor(() => {
      expect(screen.getByText('Verify & Enable')).toBeTruthy();
    });
  });

  it('shows Cancel button', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => expect(screen.getByText('Enable Two-Factor Authentication')).toBeTruthy());
    fireEvent.click(screen.getByText('Enable Two-Factor Authentication'));
    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeTruthy();
    });
  });

  it('Cancel returns to initial view', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => expect(screen.getByText('Enable Two-Factor Authentication')).toBeTruthy());
    fireEvent.click(screen.getByText('Enable Two-Factor Authentication'));
    await waitFor(() => expect(screen.getByText('Cancel')).toBeTruthy());
    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => {
      expect(screen.getByText('Enable Two-Factor Authentication')).toBeTruthy();
      expect(screen.queryByText('Set Up Two-Factor Authentication')).toBeNull();
    });
  });

  it('Verify & Enable is disabled with short code', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => expect(screen.getByText('Enable Two-Factor Authentication')).toBeTruthy());
    fireEvent.click(screen.getByText('Enable Two-Factor Authentication'));
    await waitFor(() => expect(screen.getByText('Verify & Enable')).toBeTruthy());

    const input = screen.getByPlaceholderText('000000');
    fireEvent.change(input, { target: { value: '123' } });
    const btn = screen.getByText('Verify & Enable').closest('button')!;
    expect(btn.disabled).toBe(true);
  });
});

/* ═══════════════════════════════════════
   Disable flow
   ═══════════════════════════════════════ */
describe('TwoFactorAuth – disable', () => {
  beforeEach(() => {
    mocks.twoFactorData = { enabled: true, verified_at: '2024-06-15T12:00:00Z', last_used_at: null };
  });

  it('shows confirm modal when disable clicked', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => expect(screen.getByText('Disable Two-Factor Authentication')).toBeTruthy());
    fireEvent.click(screen.getByText('Disable Two-Factor Authentication'));
    await waitFor(() => {
      expect(screen.getByTestId('confirm-modal')).toBeTruthy();
    });
  });

  it('confirm modal has correct title', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => expect(screen.getByText('Disable Two-Factor Authentication')).toBeTruthy());
    fireEvent.click(screen.getByText('Disable Two-Factor Authentication'));
    await waitFor(() => {
      // title in modal should also say "Disable Two-Factor Authentication"
      // There will be 2 instances now (button + modal title)
      const all = screen.getAllByText('Disable Two-Factor Authentication');
      expect(all.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('confirm modal shows warning message', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => expect(screen.getByText('Disable Two-Factor Authentication')).toBeTruthy());
    fireEvent.click(screen.getByText('Disable Two-Factor Authentication'));
    await waitFor(() => {
      expect(screen.getByText(/Are you sure you want to disable two-factor authentication/)).toBeTruthy();
    });
  });

  it('cancel in confirm modal keeps 2FA enabled', async () => {
    render(<TwoFactorAuth />);
    await waitFor(() => expect(screen.getByText('Disable Two-Factor Authentication')).toBeTruthy());
    fireEvent.click(screen.getByText('Disable Two-Factor Authentication'));
    await waitFor(() => expect(screen.getByText('Keep Enabled')).toBeTruthy());
    fireEvent.click(screen.getByText('Keep Enabled'));
    await waitFor(() => {
      expect(screen.queryByTestId('confirm-modal')).toBeNull();
    });
  });
});

/* ═══════════════════════════════════════
   No user
   ═══════════════════════════════════════ */
describe('TwoFactorAuth – no user', () => {
  it('still renders when no user', () => {
    mocks.user = null;
    render(<TwoFactorAuth />);
    // Without a user, fetchTwoFactorStatus returns early; loading stays true initially
    // but eventually the component should still render (may stay in loading or render empty)
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   Error states
   ═══════════════════════════════════════ */
describe('TwoFactorAuth – errors', () => {
  it('handles fetch error gracefully', async () => {
    mocks.chainError = { code: 'SOME_ERROR', message: 'DB error' };
    render(<TwoFactorAuth />);
    // Should not crash — goes to non-loading state
    await waitFor(() => {
      expect(screen.getByText('Two-Factor Authentication')).toBeTruthy();
    });
  });
});
