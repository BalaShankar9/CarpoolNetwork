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

const FAKE_WEBHOOKS = [
  {
    id: 'wh-1',
    userId: 'user-1',
    name: 'My Integration',
    url: 'https://example.com/webhook',
    secret: 'whsec_abc123def456',
    events: ['ride.created', 'ride.updated'],
    active: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
  },
  {
    id: 'wh-2',
    userId: 'user-1',
    name: 'Inactive Hook',
    url: 'https://old.com/hook',
    secret: 'whsec_old',
    events: ['booking.created'],
    active: false,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
  },
];

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

const FAKE_DELIVERIES = [
  {
    id: 'del-1',
    webhookId: 'wh-1',
    event: 'ride.created',
    payload: {},
    requestHeaders: {},
    responseStatus: 200,
    responseTime: 150,
    success: true,
    attempts: 1,
    createdAt: new Date('2025-03-10T10:00:00Z'),
  },
  {
    id: 'del-2',
    webhookId: 'wh-1',
    event: 'ride.updated',
    payload: {},
    requestHeaders: {},
    responseStatus: 500,
    responseTime: 300,
    success: false,
    error: 'Server error',
    attempts: 3,
    createdAt: new Date('2025-03-10T11:00:00Z'),
  },
];

/* ══════════════════════════════════════════════
   DeveloperSettings — main component + webhooks
   ══════════════════════════════════════════════ */
describe('DeveloperSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useAuthReturn.user = null;
    mocks.getWebhooks.mockResolvedValue([]);
    mocks.getApiKeys.mockResolvedValue([]);
    mocks.getDeliveries.mockResolvedValue([]);
    mocks.testWebhook.mockResolvedValue(undefined);
    mocks.deleteWebhook.mockResolvedValue(undefined);
    mocks.createWebhook.mockResolvedValue({ id: 'new-wh' });
    mocks.revokeApiKey.mockResolvedValue(undefined);
    mocks.deleteApiKey.mockResolvedValue(undefined);
    mocks.createApiKey.mockResolvedValue({ id: 'new-key', plainTextKey: 'cpn_live_full_secret' });
  });

  /* ── loading state ── */
  it('shows loading skeleton while fetching', () => {
    mocks.useAuthReturn.user = FAKE_USER;
    // Never resolve
    mocks.getWebhooks.mockReturnValue(new Promise(() => {}));
    mocks.getApiKeys.mockReturnValue(new Promise(() => {}));

    const { container } = render(<DeveloperSettings />);
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });

  /* ── header ── */
  it('renders header and tabs', async () => {
    mocks.useAuthReturn.user = FAKE_USER;
    render(<DeveloperSettings />);

    await waitFor(() => expect(screen.getByText('Developer Settings')).toBeTruthy());
    expect(screen.getByText('Manage webhooks and API access for integrations')).toBeTruthy();
    expect(screen.getByText('Webhooks')).toBeTruthy();
    expect(screen.getByText('API Keys')).toBeTruthy();
  });

  /* ── webhooks tab (default) ── */
  describe('webhooks tab', () => {
    it('shows webhook count summary', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getWebhooks.mockResolvedValue(FAKE_WEBHOOKS);

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('2 webhook(s) configured')).toBeTruthy());
    });

    it('shows Add Webhook button', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getWebhooks.mockResolvedValue(FAKE_WEBHOOKS);

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('Add Webhook')).toBeTruthy());
    });

    it('renders webhook list with names and URLs', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getWebhooks.mockResolvedValue(FAKE_WEBHOOKS);

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('My Integration')).toBeTruthy());

      expect(screen.getByText('https://example.com/webhook')).toBeTruthy();
      expect(screen.getByText('2 events')).toBeTruthy();
      expect(screen.getByText('Inactive Hook')).toBeTruthy();
      expect(screen.getByText('https://old.com/hook')).toBeTruthy();
      expect(screen.getByText('1 events')).toBeTruthy();
    });

    it('shows empty webhooks state', async () => {
      mocks.useAuthReturn.user = FAKE_USER;

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('No webhooks configured')).toBeTruthy());
      expect(screen.getByText(/Webhooks allow you to receive real-time notifications/)).toBeTruthy();
      expect(screen.getByText('Create Your First Webhook')).toBeTruthy();
    });

    it('expands webhook to show events and deliveries', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getWebhooks.mockResolvedValue(FAKE_WEBHOOKS);
      mocks.getDeliveries.mockResolvedValue(FAKE_DELIVERIES);

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('My Integration')).toBeTruthy());

      // Click to expand
      fireEvent.click(screen.getByText('My Integration'));

      await waitFor(() => expect(screen.getByText('Subscribed Events')).toBeTruthy());
      expect(screen.getAllByText('ride.created').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ride.updated').length).toBeGreaterThan(0);
      expect(screen.getByText('Signing Secret')).toBeTruthy();
      expect(screen.getByText('Recent Deliveries')).toBeTruthy();

      // Wait for deliveries
      await waitFor(() => expect(screen.getByText('150ms')).toBeTruthy());
      expect(screen.getByText('300ms')).toBeTruthy();
    });

    it('shows "No deliveries yet" for fresh webhook', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getWebhooks.mockResolvedValue(FAKE_WEBHOOKS);
      mocks.getDeliveries.mockResolvedValue([]);

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('My Integration')).toBeTruthy());

      fireEvent.click(screen.getByText('My Integration'));
      await waitFor(() => expect(screen.getByText('No deliveries yet')).toBeTruthy());
    });

    it('calls testWebhook on send test click', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getWebhooks.mockResolvedValue(FAKE_WEBHOOKS);

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('My Integration')).toBeTruthy());

      const sendButtons = screen.getAllByTitle('Send test');
      fireEvent.click(sendButtons[0]);

      await waitFor(() => expect(mocks.testWebhook).toHaveBeenCalledWith('wh-1'));
    });

    it('deletes webhook after confirmation', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getWebhooks.mockResolvedValue(FAKE_WEBHOOKS);
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('My Integration')).toBeTruthy());

      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => expect(mocks.deleteWebhook).toHaveBeenCalledWith('wh-1'));
    });

    it('does not delete webhook when confirmation cancelled', async () => {
      mocks.useAuthReturn.user = FAKE_USER;
      mocks.getWebhooks.mockResolvedValue(FAKE_WEBHOOKS);
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('My Integration')).toBeTruthy());

      const deleteButtons = screen.getAllByTitle('Delete');
      fireEvent.click(deleteButtons[0]);

      expect(mocks.deleteWebhook).not.toHaveBeenCalled();
    });
  });

  /* ── create webhook modal ── */
  describe('create webhook modal', () => {
    it('opens create modal on Add Webhook click', async () => {
      mocks.useAuthReturn.user = FAKE_USER;

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('Developer Settings')).toBeTruthy());

      fireEvent.click(screen.getByText('Add Webhook'));
      await waitFor(() => expect(screen.getByPlaceholderText('My Integration')).toBeTruthy());

      expect(screen.getByPlaceholderText('https://example.com/webhook')).toBeTruthy();
      expect(screen.getByText('Events')).toBeTruthy();
      expect(screen.getByText('Ride Created')).toBeTruthy();
      expect(screen.getByText('Ride Updated')).toBeTruthy();
      expect(screen.getByText('Booking Created')).toBeTruthy();
    });

    it('submit is disabled when form is incomplete', async () => {
      mocks.useAuthReturn.user = FAKE_USER;

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('Developer Settings')).toBeTruthy());

      fireEvent.click(screen.getByText('Add Webhook'));
      await waitFor(() => expect(screen.getByPlaceholderText('My Integration')).toBeTruthy());

      const submitBtn = screen.getAllByText('Create Webhook').find(
        (el) => el.tagName === 'BUTTON' && el.closest('form')
      );
      expect(submitBtn).toBeTruthy();
      expect((submitBtn as HTMLButtonElement).disabled).toBe(true);
    });

    it('creates webhook on valid submit', async () => {
      mocks.useAuthReturn.user = FAKE_USER;

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('Developer Settings')).toBeTruthy());

      fireEvent.click(screen.getByText('Add Webhook'));
      await waitFor(() => expect(screen.getByPlaceholderText('My Integration')).toBeTruthy());

      // Fill form
      fireEvent.change(screen.getByPlaceholderText('My Integration'), {
        target: { value: 'New Hook' },
      });
      fireEvent.change(screen.getByPlaceholderText('https://example.com/webhook'), {
        target: { value: 'https://api.test.com/hook' },
      });

      // Select an event
      fireEvent.click(screen.getByText('Ride Created'));

      // Submit
      const submitBtn = screen.getAllByText('Create Webhook').find(
        (el) => el.tagName === 'BUTTON' && el.closest('form')
      ) as HTMLButtonElement;
      fireEvent.click(submitBtn);

      await waitFor(() =>
        expect(mocks.createWebhook).toHaveBeenCalledWith(
          'user-1',
          'New Hook',
          'https://api.test.com/hook',
          ['ride.created']
        )
      );
    });

    it('closes modal on Cancel click', async () => {
      mocks.useAuthReturn.user = FAKE_USER;

      render(<DeveloperSettings />);
      await waitFor(() => expect(screen.getByText('Developer Settings')).toBeTruthy());

      fireEvent.click(screen.getByText('Add Webhook'));
      await waitFor(() => expect(screen.getByPlaceholderText('My Integration')).toBeTruthy());

      fireEvent.click(screen.getByText('Cancel'));
      await waitFor(() => expect(screen.queryByPlaceholderText('My Integration')).toBeNull());
    });
  });
});
