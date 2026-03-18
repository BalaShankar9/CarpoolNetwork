// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { makeEntry } from './helpers';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  user: { id: 'user-1' } as any,
  navigate: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
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
  default: ({ user, size }: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'clickable-profile' }, user.full_name);
  },
}));

import RankBadge from '../../src/components/leaderboards/RankBadge';
import LeaderboardCard from '../../src/components/leaderboards/LeaderboardCard';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'user-1' };
});
afterEach(cleanup);

/* ═══════════════════════════════════════
   RankBadge
   ═══════════════════════════════════════ */
describe('RankBadge', () => {
  it('shows Crown icon for rank 1', () => {
    render(<RankBadge rank={1} />);
    expect(document.querySelector('[data-testid="icon-Crown"]')).toBeTruthy();
  });

  it('shows Medal icon for rank 2', () => {
    render(<RankBadge rank={2} />);
    expect(document.querySelector('[data-testid="icon-Medal"]')).toBeTruthy();
  });

  it('shows Award icon for rank 3', () => {
    render(<RankBadge rank={3} />);
    expect(document.querySelector('[data-testid="icon-Award"]')).toBeTruthy();
  });

  it('shows #rank text for rank 4+', () => {
    render(<RankBadge rank={7} />);
    expect(screen.getByText('#7')).toBeTruthy();
  });

  it('shows #rank text for rank 15', () => {
    render(<RankBadge rank={15} />);
    expect(screen.getByText('#15')).toBeTruthy();
  });

  it('applies sm size class', () => {
    const { container } = render(<RankBadge rank={1} size="sm" />);
    expect(container.firstElementChild!.className).toContain('w-8');
  });

  it('applies md size class by default', () => {
    const { container } = render(<RankBadge rank={1} />);
    expect(container.firstElementChild!.className).toContain('w-12');
  });

  it('applies lg size class', () => {
    const { container } = render(<RankBadge rank={1} size="lg" />);
    expect(container.firstElementChild!.className).toContain('w-16');
  });

  it('uses gold gradient for rank 1', () => {
    const { container } = render(<RankBadge rank={1} />);
    expect(container.firstElementChild!.className).toContain('from-yellow-400');
  });

  it('uses gray gradient for rank 2', () => {
    const { container } = render(<RankBadge rank={2} />);
    expect(container.firstElementChild!.className).toContain('from-gray-300');
  });

  it('uses orange gradient for rank 3', () => {
    const { container } = render(<RankBadge rank={3} />);
    expect(container.firstElementChild!.className).toContain('from-orange-400');
  });

  it('uses plain gray bg for rank 4+', () => {
    const { container } = render(<RankBadge rank={4} />);
    expect(container.firstElementChild!.className).toContain('bg-gray-200');
  });
});

/* ═══════════════════════════════════════
   LeaderboardCard
   ═══════════════════════════════════════ */
describe('LeaderboardCard', () => {
  const formatScore = (s: number) => s.toString();

  it('shows user name', () => {
    const entry = makeEntry({ profile: { full_name: 'Alice Green', avatar_url: '', city: '' } });
    render(<LeaderboardCard entry={entry} formatScore={formatScore} />);
    expect(screen.getAllByText('Alice Green').length).toBeGreaterThan(0);
  });

  it('shows Anonymous when no profile', () => {
    const entry = makeEntry({ profile: undefined });
    render(<LeaderboardCard entry={entry} formatScore={formatScore} />);
    expect(screen.getByText('Anonymous')).toBeTruthy();
  });

  it('shows ? avatar when no profile', () => {
    const entry = makeEntry({ profile: undefined });
    render(<LeaderboardCard entry={entry} formatScore={formatScore} />);
    expect(screen.getByText('?')).toBeTruthy();
  });

  it('shows ClickableUserProfile when profile exists', () => {
    const entry = makeEntry();
    render(<LeaderboardCard entry={entry} formatScore={formatScore} />);
    expect(document.querySelector('[data-testid="clickable-profile"]')).toBeTruthy();
  });

  it('shows formatted score', () => {
    const entry = makeEntry({ score: 42 });
    render(<LeaderboardCard entry={entry} formatScore={(s: number) => `${s}kg`} />);
    expect(screen.getByText('42kg')).toBeTruthy();
  });

  it('shows city when available', () => {
    const entry = makeEntry({ profile: { full_name: 'A', avatar_url: '', city: 'London' } });
    render(<LeaderboardCard entry={entry} formatScore={formatScore} />);
    expect(screen.getByText('London')).toBeTruthy();
  });

  it('does not show city when not in profile', () => {
    const entry = makeEntry({ profile: { full_name: 'A', avatar_url: '', city: '' } });
    render(<LeaderboardCard entry={entry} formatScore={formatScore} />);
    expect(screen.queryByText('London')).toBeFalsy();
  });

  it('shows "You" badge when isCurrentUser', () => {
    const entry = makeEntry();
    render(<LeaderboardCard entry={entry} formatScore={formatScore} isCurrentUser={true} />);
    expect(screen.getByText('You')).toBeTruthy();
  });

  it('does not show "You" badge when not current user', () => {
    const entry = makeEntry();
    render(<LeaderboardCard entry={entry} formatScore={formatScore} isCurrentUser={false} />);
    expect(screen.queryByText('You')).toBeFalsy();
  });

  it('applies highlight styles when isCurrentUser', () => {
    const entry = makeEntry();
    const { container } = render(
      <LeaderboardCard entry={entry} formatScore={formatScore} isCurrentUser={true} />
    );
    expect(container.firstElementChild!.className).toContain('border-blue-400');
  });

  it('shows Top 10 for ranks 1-10', () => {
    const entry = makeEntry({ rank: 5 });
    render(<LeaderboardCard entry={entry} formatScore={formatScore} />);
    expect(screen.getByText('Top 10')).toBeTruthy();
  });

  it('does not show Top 10 for rank > 10', () => {
    const entry = makeEntry({ rank: 11 });
    render(<LeaderboardCard entry={entry} formatScore={formatScore} />);
    expect(screen.queryByText('Top 10')).toBeFalsy();
  });

  it('navigates to /profile when clicking own entry', () => {
    const entry = makeEntry({ user_id: 'user-1' });
    render(<LeaderboardCard entry={entry} formatScore={formatScore} />);
    fireEvent.click(screen.getAllByText(entry.profile.full_name)[0]);
    expect(mocks.navigate).toHaveBeenCalledWith('/profile');
  });

  it('navigates to /user/:id when clicking other user', () => {
    const entry = makeEntry({ user_id: 'user-99' });
    render(<LeaderboardCard entry={entry} formatScore={formatScore} />);
    fireEvent.click(screen.getAllByText(entry.profile.full_name)[0]);
    expect(mocks.navigate).toHaveBeenCalledWith('/user/user-99');
  });
});
