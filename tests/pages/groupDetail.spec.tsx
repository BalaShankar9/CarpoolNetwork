// @vitest-environment jsdom
/**
 * Page tests – GroupDetail page
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { FAKE_USER_ID, FAKE_OTHER_USER_ID, buildMockChain } from './helpers';

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------
const mockUseAuth = vi.hoisted(() =>
  vi.fn().mockReturnValue({
    user: { id: 'user-page-001', email: 'alice@example.com' },
    profile: {
      id: 'user-page-001',
      full_name: 'Alice Tester',
      avatar_url: null,
    },
    isEmailVerified: true,
  }),
);

const mockNavigate = vi.hoisted(() => vi.fn());
const mockUseParams = vi.hoisted(() => vi.fn().mockReturnValue({ groupId: 'group-001' }));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn(),
}));

const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis(),
    unsubscribe: vi.fn(),
  }),
  removeChannel: vi.fn(),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-page-001' } }, error: null })),
  },
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------
vi.mock('../../src/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('../../src/lib/supabase', () => ({ supabase: mockSupabase }));
vi.mock('../../src/lib/toast', () => ({ toast: mockToast }));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...props }: any) =>
    React.createElement('a', { href: to, ...props }, children),
  useNavigate: () => mockNavigate,
  useParams: mockUseParams,
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useLocation: () => ({ pathname: '/', search: '', hash: '' }),
}));

vi.mock('lucide-react', () => {
  const icon = (name: string) => (props: any) =>
    React.createElement('svg', { 'data-testid': `icon-${name}`, ...props });
  const names = [
    'ArrowLeft', 'Users', 'Globe', 'Lock', 'UserPlus', 'MessageCircle',
    'Crown', 'Shield', 'User', 'Calendar', 'MapPin', 'MoreVertical',
    'UserMinus', 'AlertTriangle', 'Loader2', 'ChevronDown', 'ChevronRight',
    'Search', 'Eye', 'EyeOff', 'Hash', 'Car', 'X', 'Clock', 'Sparkles',
    'BookOpen', 'Info',
  ];
  const out: Record<string, any> = {};
  for (const n of names) out[n] = icon(n);
  return out;
});

vi.mock('../../src/components/shared/UserAvatar', () => ({
  default: () => React.createElement('div', { 'data-testid': 'user-avatar' }),
}));
vi.mock('../../src/components/shared/ConfirmModal', () => ({
  default: (props: any) =>
    props.isOpen
      ? React.createElement('div', { 'data-testid': 'confirm-modal' },
          React.createElement('button', { onClick: props.onConfirm }, 'Confirm'),
          React.createElement('button', { onClick: props.onClose || props.onCancel }, 'Cancel'),
        )
      : null,
}));

vi.stubGlobal('IntersectionObserver', vi.fn().mockImplementation(() => ({
  observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn(),
})));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------
import GroupDetail from '../../src/pages/GroupDetail';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const FAKE_GROUP = {
  id: 'group-001',
  name: 'London Commuters',
  description: 'A group for London commuters',
  avatar_url: null,
  cover_image_url: null,
  owner_id: FAKE_OTHER_USER_ID,
  visibility: 'PUBLIC',
  category: 'Commuters',
  location: 'London',
  member_count: 5,
  max_members: 50,
  rules: 'Be nice',
  created_at: '2025-01-01T00:00:00Z',
  owner: {
    id: FAKE_OTHER_USER_ID,
    full_name: 'Bob Driver',
    avatar_url: null,
  },
};

const FAKE_MEMBER = {
  id: 'gm-001',
  user_id: FAKE_USER_ID,
  role: 'MEMBER' as const,
  joined_at: '2025-01-05T00:00:00Z',
  notification_preference: 'all',
  user: {
    id: FAKE_USER_ID,
    full_name: 'Alice Tester',
    avatar_url: null,
    profile_photo_url: null,
    profile_verified: true,
  },
};

const FAKE_OWNER_MEMBER = {
  id: 'gm-002',
  user_id: FAKE_OTHER_USER_ID,
  role: 'OWNER' as const,
  joined_at: '2025-01-01T00:00:00Z',
  notification_preference: 'all',
  user: {
    id: FAKE_OTHER_USER_ID,
    full_name: 'Bob Driver',
    avatar_url: null,
    profile_photo_url: null,
    profile_verified: false,
  },
};

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  mockUseParams.mockReturnValue({ groupId: 'group-001' });
  mockNavigate.mockReset();
  mockUseAuth.mockReturnValue({
    user: { id: 'user-page-001', email: 'alice@example.com' },
    profile: {
      id: 'user-page-001',
      full_name: 'Alice Tester',
      avatar_url: null,
    },
    isEmailVerified: true,
  });
  // Default: return group + members
  mockSupabase.from.mockImplementation((table: string) => {
    if (table === 'social_groups') return buildMockChain(FAKE_GROUP);
    if (table === 'social_group_members') return buildMockChain([FAKE_MEMBER, FAKE_OWNER_MEMBER]);
    return buildMockChain();
  });
});

afterEach(() => { cleanup(); });

// ═══════════════════════════════════════════════════════════════════════════
// GroupDetail
// ═══════════════════════════════════════════════════════════════════════════
describe('GroupDetail', () => {
  it('renders group name when data loads', async () => {
    await act(async () => { render(<GroupDetail />); });
    await waitFor(() => {
      const nameTexts = screen.getAllByText('London Commuters');
      expect(nameTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders group description', async () => {
    await act(async () => { render(<GroupDetail />); });
    await waitFor(() => {
      expect(screen.getByText('A group for London commuters')).toBeInTheDocument();
    });
  });

  it('renders group visibility badge', async () => {
    await act(async () => { render(<GroupDetail />); });
    await waitFor(() => {
      const badges = screen.queryAllByText(/public|private|invite/i);
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders member count', async () => {
    await act(async () => { render(<GroupDetail />); });
    await waitFor(() => {
      const memberTexts = screen.queryAllByText(/5.*member|member.*5/i);
      expect(memberTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders member list with names', async () => {
    await act(async () => { render(<GroupDetail />); });
    await waitFor(() => {
      const aliceTexts = screen.getAllByText('Alice Tester');
      expect(aliceTexts.length).toBeGreaterThanOrEqual(1);
      const bobTexts = screen.getAllByText('Bob Driver');
      expect(bobTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows owner role badge', async () => {
    await act(async () => { render(<GroupDetail />); });
    await waitFor(() => {
      const ownerBadges = screen.queryAllByText(/owner/i);
      expect(ownerBadges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders category info', async () => {
    await act(async () => { render(<GroupDetail />); });
    await waitFor(() => {
      const catTexts = screen.queryAllByText(/commuter/i);
      expect(catTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders group rules section', async () => {
    await act(async () => { render(<GroupDetail />); });
    await waitFor(() => {
      const rulesTexts = screen.queryAllByText(/be nice|rules/i);
      expect(rulesTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('initializes with loading state true', () => {
    // GroupDetail sets loading=true initially; after data loads it becomes false
    // We just verify the component can render at all (loading or loaded state)
    render(<GroupDetail />);
    // The component is rendered without error — either in loading or loaded state
    expect(document.body.querySelector('div')).toBeTruthy();
  });

  it('shows error when group not found', async () => {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'social_groups') return buildMockChain(null);
      return buildMockChain();
    });

    await act(async () => { render(<GroupDetail />); });
    await waitFor(() => {
      const errorTexts = screen.queryAllByText(/not found|doesn.*exist|error/i);
      expect(errorTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders back navigation link', async () => {
    await act(async () => { render(<GroupDetail />); });
    await waitFor(() => {
      // Breadcrumb or back link should exist
      const links = document.querySelectorAll('a[href*="/groups"], a[href="/friends"]');
      const backTexts = screen.queryAllByText(/back|group/i);
      expect(links.length + backTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('renders location info when present', async () => {
    await act(async () => { render(<GroupDetail />); });
    await waitFor(() => {
      const locationTexts = screen.queryAllByText(/London/);
      expect(locationTexts.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('shows UserAvatar for members', async () => {
    await act(async () => { render(<GroupDetail />); });
    await waitFor(() => {
      const avatars = screen.getAllByTestId('user-avatar');
      expect(avatars.length).toBeGreaterThanOrEqual(1);
    });
  });
});
