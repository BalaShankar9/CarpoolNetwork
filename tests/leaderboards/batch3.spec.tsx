// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { makeEntry, buildMockChain } from './helpers';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  user: { id: 'user-1' } as any,
  profile: { city: 'London' } as any,
  navigate: vi.fn(),
  supabase: null as any,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user, profile: mocks.profile }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../../src/lib/supabase', () => ({
  get supabase() { return mocks.supabase; },
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Crown: s('Crown'), Medal: s('Medal'), Award: s('Award'),
    MapPin: s('MapPin'), Star: s('Star'), Trophy: s('Trophy'),
    TrendingUp: s('TrendingUp'), Users: s('Users'),
  };
});

vi.mock('../../src/components/shared/ClickableUserProfile', () => ({
  default: ({ user }: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'clickable-profile' }, user.full_name);
  },
}));

import RegionalLeaderboard from '../../src/components/leaderboards/RegionalLeaderboard';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'user-1' };
  mocks.profile = { city: 'London' };
});
afterEach(cleanup);

function setupRegionalChain(regions: string[], leaderData: any[]) {
  let callCount = 0;
  const chain: any = {};
  const self = () => chain;
  chain.from = vi.fn(self);
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.in = vi.fn(self);
  chain.is = vi.fn(self);
  chain.not = vi.fn(self);
  chain.or = vi.fn(self);
  chain.order = vi.fn(self);
  chain.limit = vi.fn(self);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
  chain.then = (resolve: any) => {
    callCount++;
    if (callCount === 1) {
      // Regions query (profiles with cities)
      return resolve({ data: regions.map(r => ({ city: r })), error: null });
    }
    // Leaderboard query
    return resolve({ data: leaderData, error: null });
  };
  return chain;
}

describe('RegionalLeaderboard', () => {
  it('shows Select Region label', async () => {
    mocks.supabase = setupRegionalChain(['London', 'Manchester'], []);
    render(<RegionalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('Select Region')).toBeTruthy();
    });
  });

  it('populates region dropdown from database', async () => {
    mocks.supabase = setupRegionalChain(['London', 'Manchester', 'Bristol'], []);
    render(<RegionalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      const select = document.querySelector('select') as HTMLSelectElement;
      expect(select).toBeTruthy();
      const options = Array.from(select.options).map(o => o.value);
      expect(options).toContain('Bristol');
      expect(options).toContain('London');
      expect(options).toContain('Manchester');
    });
  });

  it('defaults to user city when available', async () => {
    mocks.profile = { city: 'Manchester' };
    mocks.supabase = setupRegionalChain(['London', 'Manchester'], []);
    render(<RegionalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      const select = document.querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe('Manchester');
    });
  });

  it('defaults to first region when user city not in list', async () => {
    mocks.profile = { city: 'Edinburgh' };
    mocks.supabase = setupRegionalChain(['Bristol', 'London'], []);
    render(<RegionalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      const select = document.querySelector('select') as HTMLSelectElement;
      expect(select.value).toBe('Bristol');
    });
  });

  it('shows empty state when no leaders in region', async () => {
    mocks.supabase = setupRegionalChain(['London'], []);
    render(<RegionalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getByText(/No rankings for .* yet/)).toBeTruthy();
    });
  });

  it('shows encouragement in empty state', async () => {
    mocks.supabase = setupRegionalChain(['London'], []);
    render(<RegionalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('Be the first to represent your region!')).toBeTruthy();
    });
  });

  it('renders leaderboard entries for region', async () => {
    const leaderData = [
      { user_id: 'u1', rank: 1, score: 50, region: 'London', profiles: { full_name: 'Alice', avatar_url: '', city: 'London' } },
      { user_id: 'u2', rank: 2, score: 30, region: 'London', profiles: { full_name: 'Bob', avatar_url: '', city: 'London' } },
    ];
    mocks.supabase = setupRegionalChain(['London'], leaderData);
    render(<RegionalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
    });
  });

  it('highlights current user in regional board', async () => {
    const leaderData = [
      { user_id: 'user-1', rank: 1, score: 50, region: 'London', profiles: { full_name: 'Me', avatar_url: '', city: 'London' } },
    ];
    mocks.supabase = setupRegionalChain(['London'], leaderData);
    render(<RegionalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('You')).toBeTruthy();
    });
  });

  it('formats co2 score', async () => {
    const leaderData = [
      { user_id: 'u1', rank: 1, score: 22.3, region: 'London', profiles: { full_name: 'Alice', avatar_url: '', city: 'London' } },
    ];
    mocks.supabase = setupRegionalChain(['London'], leaderData);
    render(<RegionalLeaderboard category="co2" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('22.3kg')).toBeTruthy();
    });
  });

  it('formats distance score', async () => {
    const leaderData = [
      { user_id: 'u1', rank: 1, score: 150.7, region: 'London', profiles: { full_name: 'Alice', avatar_url: '', city: 'London' } },
    ];
    mocks.supabase = setupRegionalChain(['London'], leaderData);
    render(<RegionalLeaderboard category="distance" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('151km')).toBeTruthy();
    });
  });

  it('shows loading skeleton while fetching', () => {
    const chain = buildMockChain();
    chain.then = undefined;
    chain.not = vi.fn().mockReturnValue(new Promise(() => {}));
    mocks.supabase = chain;
    render(<RegionalLeaderboard category="rides" period="month" />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows empty state when no regions available', async () => {
    mocks.supabase = setupRegionalChain([], []);
    render(<RegionalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      // No regions → no select options, loading should finish
      const select = document.querySelector('select') as HTMLSelectElement;
      expect(select.options.length).toBe(0);
    });
  });
});
