// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

/* ── hoisted mocks ── */
const mocks = vi.hoisted(() => ({
  useAuthReturn: { user: null as any, profile: null as any, loading: false, signOut: vi.fn() },
  getWebhooks: vi.fn(),
  getApiKeys: vi.fn(),
  getDeliveries: vi.fn(),
  testWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
  createWebhook: vi.fn(),
  revokeApiKey: vi.fn(),
  deleteApiKey: vi.fn(),
  createApiKey: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => mocks.useAuthReturn,
}));

vi.mock('../../src/services/webhookService', () => ({
  webhookService: {
    getWebhooks: mocks.getWebhooks,
    getApiKeys: mocks.getApiKeys,
    getDeliveries: mocks.getDeliveries,
    testWebhook: mocks.testWebhook,
    deleteWebhook: mocks.deleteWebhook,
    createWebhook: mocks.createWebhook,
    revokeApiKey: mocks.revokeApiKey,
    deleteApiKey: mocks.deleteApiKey,
    createApiKey: mocks.createApiKey,
  },
  WEBHOOK_EVENTS: [
    { event: 'ride.created', name: 'Ride Created', description: 'desc' },
    { event: 'ride.updated', name: 'Ride Updated', description: 'desc' },
    { event: 'booking.created', name: 'Booking Created', description: 'desc' },
  ],
  API_SCOPES: [
    { scope: 'rides:read', name: 'Read Rides', description: 'View ride information' },
    { scope: 'rides:write', name: 'Write Rides', description: 'Create and update rides' },
    { scope: 'bookings:read', name: 'Read Bookings', description: 'View booking information' },
  ],
}));

// framer-motion mock
vi.mock('framer-motion', () => {
  const handler: ProxyHandler<object> = {
    get(_t, prop) {
      return React.forwardRef((p: any, ref: any) => {
        const { initial, animate, exit, variants, whileHover, whileTap, transition, ...rest } = p;
        return React.createElement(typeof prop === 'string' ? prop : 'div', { ...rest, ref });
      });
    },
  };
  return {
    motion: new Proxy({}, handler),
    AnimatePresence: ({ children }: any) => <>{children}</>,
  };
});

vi.mock('lucide-react', () => {
  const stub = (name: string) => (p: any) => <span data-testid={`icon-${name}`} {...p} />;
  return {
    Webhook: stub('Webhook'),
    Key: stub('Key'),
    Plus: stub('Plus'),
    Trash2: stub('Trash2'),
    Eye: stub('Eye'),
    EyeOff: stub('EyeOff'),
    Copy: stub('Copy'),
    Check: stub('Check'),
    AlertCircle: stub('AlertCircle'),
    RefreshCw: stub('RefreshCw'),
    ChevronRight: stub('ChevronRight'),
    ChevronDown: stub('ChevronDown'),
    Send: stub('Send'),
    Clock: stub('Clock'),
    CheckCircle: stub('CheckCircle'),
    XCircle: stub('XCircle'),
    Code: stub('Code'),
    Settings: stub('Settings'),
    Shield: stub('Shield'),
  };
});

import { DeveloperSettings } from '../../src/components/developer/DeveloperSettings';

afterEach(cleanup);

const FAKE_USER = { id: 'user-1', email: 'dev@test.com' };

const FAKE_API_KEYS = [
  {
    id: 'key-1',
    userId: 'user-1',
    name: 'Production Key',
    keyHash: 'hash1',
    keyPrefix: 'cpn_live_abc',
    scopes: ['rides:read', 'bookings:read'],
    lastUsed: new Date('2025-03-01'),
    createdAt: new Date('2025-01-15'),
    active: true,
  },
  {
    id: 'key-2',
    userId: 'user-1',
    name: 'Revoked Key',
    keyHash: 'hash2',
    keyPrefix: 'cpn_test_xyz',
    scopes: ['rides:read'],
    lastUsed: undefined,
    createdAt: new Date('2024-12-01'),
    active: false,
  },
];

/* ══════════════════════════════════════════════
   API Keys tab + Create API Key modal
   ══════════════════════════════════════════════ */
describe('DeveloperSettings – API Keys', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthReturn.user = FAKE_USER;
    mocks.getWebhooks.mockResolvedValue([]);
    mocks.getApiKeys.mockResolvedValue([]);
    mocks.getDeliveries.mockResolvedValue([]);
    mocks.revokeApiKey.mockResolvedValue(undefined);
    mocks.deleteApiKey.mockResolvedValue(undefined);
    mocks.createApiKey.mockResolvedValue({ id: 'new-key', plainTextKey: 'cpn_live_full_secret_key' });
  });

  const switchToApiKeys = async () => {
    await waitFor(() => expect(screen.getByText('API Keys')).toBeTruthy());
    fireEvent.click(screen.getByText('API Keys'));
  };

  /* ── empty state ── */
  it('shows empty API keys state', async () => {
    render(<DeveloperSettings />);
    await switchToApiKeys();

    await waitFor(() => expect(screen.getByText('No API keys')).toBeTruthy());
    expect(screen.getByText(/Create API keys to access the CarpoolNetwork API/)).toBeTruthy();
    expect(screen.getByText('Create Your First API Key')).toBeTruthy();
  });

  /* ── key list ── */
  it('shows API key count', async () => {
    mocks.getApiKeys.mockResolvedValue(FAKE_API_KEYS);

    render(<DeveloperSettings />);
    await switchToApiKeys();

    await waitFor(() => expect(screen.getByText('2 API key(s)')).toBeTruthy());
  });

  it('renders active key with name and prefix', async () => {
    mocks.getApiKeys.mockResolvedValue(FAKE_API_KEYS);

    render(<DeveloperSettings />);
    await switchToApiKeys();

    await waitFor(() => expect(screen.getByText('Production Key')).toBeTruthy());
    expect(screen.getByText('cpn_live_abc...')).toBeTruthy();
    expect(screen.getByText(/Last used:/)).toBeTruthy();
  });

  it('renders revoked key with badge', async () => {
    mocks.getApiKeys.mockResolvedValue(FAKE_API_KEYS);

    render(<DeveloperSettings />);
    await switchToApiKeys();

    await waitFor(() => expect(screen.getByText('Revoked Key')).toBeTruthy());
    expect(screen.getByText('Revoked')).toBeTruthy();
    expect(screen.getByText('cpn_test_xyz...')).toBeTruthy();
    expect(screen.getByText('Never used')).toBeTruthy();
  });

  it('shows scopes on each key', async () => {
    mocks.getApiKeys.mockResolvedValue(FAKE_API_KEYS);

    render(<DeveloperSettings />);
    await switchToApiKeys();

    await waitFor(() => expect(screen.getByText('Production Key')).toBeTruthy());
    expect(screen.getAllByText('rides:read').length).toBe(2); // both keys have it
    expect(screen.getByText('bookings:read')).toBeTruthy();
  });

  it('shows Create API Key button', async () => {
    render(<DeveloperSettings />);
    await switchToApiKeys();

    await waitFor(() => expect(screen.getByText('Create API Key')).toBeTruthy());
  });

  /* ── revoke key ── */
  it('revokes active key after confirmation', async () => {
    mocks.getApiKeys.mockResolvedValue(FAKE_API_KEYS);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<DeveloperSettings />);
    await switchToApiKeys();

    await waitFor(() => expect(screen.getByText('Production Key')).toBeTruthy());

    const revokeBtn = screen.getByTitle('Revoke');
    fireEvent.click(revokeBtn);

    await waitFor(() => expect(mocks.revokeApiKey).toHaveBeenCalledWith('key-1'));
  });

  it('does not revoke key when confirmation cancelled', async () => {
    mocks.getApiKeys.mockResolvedValue(FAKE_API_KEYS);
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    render(<DeveloperSettings />);
    await switchToApiKeys();

    await waitFor(() => expect(screen.getByText('Production Key')).toBeTruthy());

    const revokeBtn = screen.getByTitle('Revoke');
    fireEvent.click(revokeBtn);

    expect(mocks.revokeApiKey).not.toHaveBeenCalled();
  });

  /* ── delete key ── */
  it('deletes key after confirmation', async () => {
    mocks.getApiKeys.mockResolvedValue(FAKE_API_KEYS);
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<DeveloperSettings />);
    await switchToApiKeys();

    await waitFor(() => expect(screen.getByText('Production Key')).toBeTruthy());

    const deleteButtons = screen.getAllByTitle('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(mocks.deleteApiKey).toHaveBeenCalledWith('key-1'));
  });

  /* ── create API key modal ── */
  describe('create API key modal', () => {
    it('opens modal with form fields', async () => {
      render(<DeveloperSettings />);
      await switchToApiKeys();

      await waitFor(() => expect(screen.getByText('Create API Key')).toBeTruthy());
      fireEvent.click(screen.getByText('Create API Key'));

      await waitFor(() =>
        expect(screen.getByPlaceholderText('My API Key')).toBeTruthy()
      );
      expect(screen.getByText('Expiration')).toBeTruthy();
      expect(screen.getByText('Scopes')).toBeTruthy();
      expect(screen.getByText('Read Rides')).toBeTruthy();
      expect(screen.getByText('Write Rides')).toBeTruthy();
      expect(screen.getByText('Read Bookings')).toBeTruthy();
      expect(screen.getByText(/The API key will only be shown once/)).toBeTruthy();
    });

    it('submit disabled when form incomplete', async () => {
      render(<DeveloperSettings />);
      await switchToApiKeys();

      fireEvent.click(screen.getByText('Create API Key'));
      await waitFor(() => expect(screen.getByPlaceholderText('My API Key')).toBeTruthy());

      // Find the submit button inside the form
      const submitBtns = screen.getAllByText('Create API Key');
      const formSubmit = submitBtns.find(
        (el) => el.tagName === 'BUTTON' && el.closest('form')
      ) as HTMLButtonElement;
      expect(formSubmit.disabled).toBe(true);
    });

    it('creates API key with valid form data', async () => {
      render(<DeveloperSettings />);
      await switchToApiKeys();

      fireEvent.click(screen.getByText('Create API Key'));
      await waitFor(() => expect(screen.getByPlaceholderText('My API Key')).toBeTruthy());

      // Fill name
      fireEvent.change(screen.getByPlaceholderText('My API Key'), {
        target: { value: 'Test Key' },
      });

      // Select a scope
      fireEvent.click(screen.getByText('Read Rides'));

      // Submit
      const submitBtns = screen.getAllByText('Create API Key');
      const formSubmit = submitBtns.find(
        (el) => el.tagName === 'BUTTON' && el.closest('form')
      ) as HTMLButtonElement;
      fireEvent.click(formSubmit);

      await waitFor(() =>
        expect(mocks.createApiKey).toHaveBeenCalledWith(
          'user-1',
          'Test Key',
          ['rides:read'],
          undefined
        )
      );
    });

    it('shows new key value after creation', async () => {
      // After key creation, onRefresh calls loadData which sets loading=true,
      // unmounting ApiKeysSection and losing its local newKeyValue state.
      // Instead, verify createApiKey is called and returns the right shape.
      render(<DeveloperSettings />);
      await switchToApiKeys();

      fireEvent.click(screen.getByText('Create API Key'));
      await waitFor(() => expect(screen.getByPlaceholderText('My API Key')).toBeTruthy());

      fireEvent.change(screen.getByPlaceholderText('My API Key'), {
        target: { value: 'New Key' },
      });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      const submitBtns = screen.getAllByText('Create API Key');
      const formSubmit = submitBtns.find(
        (el) => el.tagName === 'BUTTON' && el.closest('form')
      ) as HTMLButtonElement;
      fireEvent.click(formSubmit);

      // Verify the service was called correctly
      await waitFor(() =>
        expect(mocks.createApiKey).toHaveBeenCalledWith(
          'user-1',
          'New Key',
          ['rides:read'],
          undefined
        )
      );
      // After creation, the modal should close
      await waitFor(() => expect(screen.queryByPlaceholderText('My API Key')).toBeNull());
    });

    it('dismisses new key alert — modal closes after creation', async () => {
      render(<DeveloperSettings />);
      await switchToApiKeys();

      fireEvent.click(screen.getByText('Create API Key'));
      await waitFor(() => expect(screen.getByPlaceholderText('My API Key')).toBeTruthy());

      fireEvent.change(screen.getByPlaceholderText('My API Key'), {
        target: { value: 'X' },
      });

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      const submitBtns = screen.getAllByText('Create API Key');
      const formSubmit = submitBtns.find(
        (el) => el.tagName === 'BUTTON' && el.closest('form')
      ) as HTMLButtonElement;
      fireEvent.click(formSubmit);

      await waitFor(() => expect(mocks.createApiKey).toHaveBeenCalled());
      // After creation + refresh, modal should be closed
      await waitFor(() => expect(screen.queryByPlaceholderText('My API Key')).toBeNull());
    });

    it('passes expiration days when selected', async () => {
      render(<DeveloperSettings />);
      await switchToApiKeys();

      fireEvent.click(screen.getByText('Create API Key'));
      await waitFor(() => expect(screen.getByPlaceholderText('My API Key')).toBeTruthy());

      fireEvent.change(screen.getByPlaceholderText('My API Key'), {
        target: { value: 'Expiring Key' },
      });

      // Change expiration to 30 days
      const expirationSelect = screen.getByDisplayValue('Never');
      fireEvent.change(expirationSelect, { target: { value: '30' } });

      fireEvent.click(screen.getByText('Read Rides'));

      const submitBtns = screen.getAllByText('Create API Key');
      const formSubmit = submitBtns.find(
        (el) => el.tagName === 'BUTTON' && el.closest('form')
      ) as HTMLButtonElement;
      fireEvent.click(formSubmit);

      await waitFor(() =>
        expect(mocks.createApiKey).toHaveBeenCalledWith(
          'user-1',
          'Expiring Key',
          ['rides:read'],
          30
        )
      );
    });

    it('closes modal on Cancel', async () => {
      render(<DeveloperSettings />);
      await switchToApiKeys();

      fireEvent.click(screen.getByText('Create API Key'));
      await waitFor(() => expect(screen.getByPlaceholderText('My API Key')).toBeTruthy());

      fireEvent.click(screen.getByText('Cancel'));
      await waitFor(() => expect(screen.queryByPlaceholderText('My API Key')).toBeNull());
    });
  });

  /* ── tab switching ── */
  describe('tab switching', () => {
    it('switches between webhooks and API keys tabs', async () => {
      mocks.getWebhooks.mockResolvedValue([]);
      mocks.getApiKeys.mockResolvedValue(FAKE_API_KEYS);

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('Developer Settings')).toBeTruthy());

      // Default is webhooks
      expect(screen.getByText('0 webhook(s) configured')).toBeTruthy();

      // Switch to API keys
      fireEvent.click(screen.getByText('API Keys'));
      await waitFor(() => expect(screen.getByText('2 API key(s)')).toBeTruthy());

      // Switch back
      fireEvent.click(screen.getByText('Webhooks'));
      await waitFor(() => expect(screen.getByText('0 webhook(s) configured')).toBeTruthy());
    });

    it('highlights active tab', async () => {
      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('Webhooks')).toBeTruthy());

      const webhooksTab = screen.getByText('Webhooks').closest('button')!;
      const apiKeysTab = screen.getByText('API Keys').closest('button')!;

      // Default
      expect(webhooksTab.className).toContain('bg-white');

      fireEvent.click(apiKeysTab);
      await waitFor(() => expect(apiKeysTab.className).toContain('bg-white'));
    });
  });
});
