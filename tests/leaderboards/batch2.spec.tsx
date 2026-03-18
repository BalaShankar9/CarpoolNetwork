// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { makeEntry, makeEntries, buildMockChain } from './helpers';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  user: { id: 'user-1' } as any,
  navigate: vi.fn(),
  supabase: null as any,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
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

import GlobalLeaderboard from '../../src/components/leaderboards/GlobalLeaderboard';
import FriendLeaderboard from '../../src/components/leaderboards/FriendLeaderboard';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'user-1' };
});
afterEach(cleanup);

/* ═══════════════════════════════════════
   GlobalLeaderboard
   ═══════════════════════════════════════ */
describe('GlobalLeaderboard', () => {
  it('shows loading skeleton initially', () => {
    mocks.supabase = buildMockChain();
    // make the chain never resolve by overriding then
    mocks.supabase.then = undefined;
    mocks.supabase.limit = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<GlobalLeaderboard category="rides" period="month" />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows empty state when no leaders', async () => {
    mocks.supabase = buildMockChain([]);
    render(<GlobalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('No leaderboard data available yet.')).toBeTruthy();
    });
  });

  it('shows encouragement text in empty state', async () => {
    mocks.supabase = buildMockChain([]);
    render(<GlobalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('Be the first to climb the rankings!')).toBeTruthy();
    });
  });

  it('renders leaderboard entries', async () => {
    const entries = makeEntries(3).map(e => ({
      ...e,
      profiles: e.profile,
    }));
    mocks.supabase = buildMockChain(entries);
    render(<GlobalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getAllByText('User 1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('User 2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('User 3').length).toBeGreaterThan(0);
    });
  });

  it('formats score for co2 category', async () => {
    const entries = [{ ...makeEntry({ score: 42.5 }), profiles: makeEntry().profile }];
    mocks.supabase = buildMockChain(entries);
    render(<GlobalLeaderboard category="co2" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('42.5kg')).toBeTruthy();
    });
  });

  it('formats score for distance category', async () => {
    const entries = [{ ...makeEntry({ score: 150.7 }), profiles: makeEntry().profile }];
    mocks.supabase = buildMockChain(entries);
    render(<GlobalLeaderboard category="distance" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('151km')).toBeTruthy();
    });
  });

  it('formats score for trust_score category', async () => {
    const entries = [{ ...makeEntry({ score: 4.85 }), profiles: makeEntry().profile }];
    mocks.supabase = buildMockChain(entries);
    render(<GlobalLeaderboard category="trust_score" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('4.8')).toBeTruthy();
    });
  });

  it('formats score for rides category as plain number', async () => {
    const entries = [{ ...makeEntry({ score: 42 }), profiles: makeEntry().profile }];
    mocks.supabase = buildMockChain(entries);
    render(<GlobalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('42')).toBeTruthy();
    });
  });

  it('shows Your Ranking banner when user rank > 10', async () => {
    // Leaders must NOT contain user-1 so component falls through to maybeSingle
    const leaders = makeEntries(3, { user_id: undefined }).map((e, i) => ({
      ...e,
      user_id: `other-${i + 1}`,
      profiles: e.profile,
    }));
    const chain = buildMockChain(leaders);
    // Override maybeSingle for user rank lookup
    chain.maybeSingle = vi.fn().mockResolvedValue({
      data: { user_id: 'user-1', rank: 25, score: 15 },
      error: null,
    });
    mocks.supabase = chain;
    render(<GlobalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('Your Ranking')).toBeTruthy();
      expect(screen.getAllByText(/#25/).length).toBeGreaterThan(0);
    });
  });

  it('highlights current user in leaderboard', async () => {
    const entries = [
      { ...makeEntry({ user_id: 'user-1', rank: 1, score: 100 }), profiles: { full_name: 'Me', avatar_url: '', city: '' } },
    ];
    mocks.supabase = buildMockChain(entries);
    render(<GlobalLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('You')).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   FriendLeaderboard
   ═══════════════════════════════════════ */
describe('FriendLeaderboard', () => {
  function setupFriendChain(friends: any[], leaderData: any[]) {
    let callCount = 0;
    const chain: any = {};
    const self = () => chain;
    chain.from = vi.fn(self);
    chain.select = vi.fn(self);
    chain.eq = vi.fn(self);
    chain.in = vi.fn(self);
    chain.is = vi.fn(self);
    chain.or = vi.fn(self);
    chain.order = vi.fn(self);
    chain.limit = vi.fn(self);
    chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    // The chain resolves differently for friends vs leaderboard
    chain.then = (resolve: any) => {
      callCount++;
      if (callCount === 1) {
        // Friends query
        return resolve({ data: friends, error: null });
      }
      // Leaderboard query
      return resolve({ data: leaderData, error: null });
    };
    return chain;
  }

  it('shows loading skeleton initially', () => {
    const chain = buildMockChain();
    chain.then = undefined;
    chain.or = vi.fn().mockReturnValue(new Promise(() => {}));
    mocks.supabase = chain;
    render(<FriendLeaderboard category="rides" period="month" />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows empty state when no friends', async () => {
    const chain = setupFriendChain([], []);
    mocks.supabase = chain;
    render(<FriendLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('No friend rankings available.')).toBeTruthy();
    });
  });

  it('shows encouragement in empty state', async () => {
    const chain = setupFriendChain([], []);
    mocks.supabase = chain;
    render(<FriendLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('Add friends to compare your progress!')).toBeTruthy();
    });
  });

  it('renders friend leaderboard entries', async () => {
    const friends = [
      { user_a: 'user-1', user_b: 'user-2' },
      { user_a: 'user-3', user_b: 'user-1' },
    ];
    const leaderData = [
      { user_id: 'user-2', rank: 1, score: 50, profiles: { full_name: 'Bob', avatar_url: '', city: '' } },
      { user_id: 'user-1', rank: 2, score: 30, profiles: { full_name: 'Me', avatar_url: '', city: '' } },
    ];
    const chain = setupFriendChain(friends, leaderData);
    mocks.supabase = chain;
    render(<FriendLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getAllByText('Bob').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Me').length).toBeGreaterThan(0);
    });
  });

  it('highlights current user among friends', async () => {
    const friends = [{ user_a: 'user-1', user_b: 'user-2' }];
    const leaderData = [
      { user_id: 'user-1', rank: 1, score: 50, profiles: { full_name: 'Me', avatar_url: '', city: '' } },
    ];
    const chain = setupFriendChain(friends, leaderData);
    mocks.supabase = chain;
    render(<FriendLeaderboard category="rides" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('You')).toBeTruthy();
    });
  });

  it('formats co2 score for friends', async () => {
    const friends = [{ user_a: 'user-1', user_b: 'user-2' }];
    const leaderData = [
      { user_id: 'user-2', rank: 1, score: 33.7, profiles: { full_name: 'Bob', avatar_url: '', city: '' } },
    ];
    const chain = setupFriendChain(friends, leaderData);
    mocks.supabase = chain;
    render(<FriendLeaderboard category="co2" period="month" />);
    await waitFor(() => {
      expect(screen.getByText('33.7kg')).toBeTruthy();
    });
  });

  it('does not load when user is null', () => {
    mocks.user = null;
    const chain = buildMockChain([]);
    mocks.supabase = chain;
    render(<FriendLeaderboard category="rides" period="month" />);
    // Should stay in loading state since loadFriendLeaderboard never runs
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });
});
