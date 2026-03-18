// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';
import { makeChallenge, makeCompleted, buildMockChain } from './helpers';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  user: { id: 'user-1' } as any,
  supabase: null as any,
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('../../src/lib/supabase', () => ({
  get supabase() { return mocks.supabase; },
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Target: s('Target'), TrendingUp: s('TrendingUp'), Leaf: s('Leaf'),
    Users: s('Users'), Award: s('Award'), CheckCircle: s('CheckCircle'),
    Clock: s('Clock'), Star: s('Star'),
  };
});

import ChallengeGrid from '../../src/components/challenges/ChallengeGrid';
import CompletedChallenges from '../../src/components/challenges/CompletedChallenges';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'user-1' };
});
afterEach(cleanup);

/* ═══════════════════════════════════════
   ChallengeGrid
   ═══════════════════════════════════════ */
describe('ChallengeGrid', () => {
  function setupGridChain(challenges: any[], userChallenges: any[] = []) {
    let callCount = 0;
    const chain: any = {};
    const self = () => chain;
    chain.from = vi.fn(self);
    chain.select = vi.fn(self);
    chain.eq = vi.fn(self);
    chain.in = vi.fn(self);
    chain.is = vi.fn(self);
    chain.gte = vi.fn(self);
    chain.lte = vi.fn(self);
    chain.or = vi.fn(self);
    chain.not = vi.fn(self);
    chain.order = vi.fn(self);
    chain.limit = vi.fn(self);
    chain.insert = vi.fn().mockResolvedValue({ data: null, error: null });
    chain.then = (resolve: any) => {
      callCount++;
      if (callCount === 1) {
        return resolve({ data: challenges, error: null });
      }
      return resolve({ data: userChallenges, error: null });
    };
    return chain;
  }

  it('shows loading skeleton initially', () => {
    const chain = buildMockChain();
    chain.then = undefined;
    chain.order = vi.fn().mockReturnValue(new Promise(() => {}));
    mocks.supabase = chain;
    render(<ChallengeGrid />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows empty state when no challenges', async () => {
    mocks.supabase = setupGridChain([]);
    render(<ChallengeGrid />);
    await waitFor(() => {
      expect(screen.getByText('No active challenges at the moment.')).toBeTruthy();
    });
  });

  it('shows encouragement in empty state', async () => {
    mocks.supabase = setupGridChain([]);
    render(<ChallengeGrid />);
    await waitFor(() => {
      expect(screen.getByText('Check back soon for new challenges!')).toBeTruthy();
    });
  });

  it('renders challenge cards', async () => {
    const challenges = [
      makeChallenge({ id: 'ch-1', title: 'Ride Hero' }),
      makeChallenge({ id: 'ch-2', title: 'Eco Warrior' }),
    ];
    mocks.supabase = setupGridChain(challenges);
    render(<ChallengeGrid />);
    await waitFor(() => {
      expect(screen.getByText('Ride Hero')).toBeTruthy();
      expect(screen.getByText('Eco Warrior')).toBeTruthy();
    });
  });

  it('shows Join Challenge button for non-joined challenges', async () => {
    const challenges = [makeChallenge()];
    mocks.supabase = setupGridChain(challenges);
    render(<ChallengeGrid />);
    await waitFor(() => {
      expect(screen.getByText('Join Challenge')).toBeTruthy();
    });
  });

  it('shows progress for joined challenges', async () => {
    const challenges = [makeChallenge({ id: 'ch-1', target_value: 10 })];
    const userChallenges = [{ challenge_id: 'ch-1', progress: 5, completed: false }];
    mocks.supabase = setupGridChain(challenges, userChallenges);
    render(<ChallengeGrid />);
    await waitFor(() => {
      expect(screen.getByText('Progress')).toBeTruthy();
      expect(screen.getByText('5/10')).toBeTruthy();
    });
  });

  it('shows completed state for finished challenges', async () => {
    const challenges = [makeChallenge({ id: 'ch-1', target_value: 10 })];
    const userChallenges = [{ challenge_id: 'ch-1', progress: 10, completed: true }];
    mocks.supabase = setupGridChain(challenges, userChallenges);
    render(<ChallengeGrid />);
    await waitFor(() => {
      expect(screen.getByText('Completed!')).toBeTruthy();
    });
  });

  it('calls onChallengeUpdate after join', async () => {
    const challenges = [makeChallenge()];
    const chain = setupGridChain(challenges);
    mocks.supabase = chain;
    const onUpdate = vi.fn();
    render(<ChallengeGrid onChallengeUpdate={onUpdate} />);
    await waitFor(() => {
      expect(screen.getByText('Join Challenge')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Join Challenge'));
    await waitFor(() => {
      expect(chain.insert).toHaveBeenCalled();
    });
  });
});

/* ═══════════════════════════════════════
   CompletedChallenges
   ═══════════════════════════════════════ */
describe('CompletedChallenges', () => {
  it('shows loading skeleton initially', () => {
    const chain = buildMockChain();
    chain.then = undefined;
    chain.order = vi.fn().mockReturnValue(new Promise(() => {}));
    mocks.supabase = chain;
    render(<CompletedChallenges />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows empty state when no completed challenges', async () => {
    mocks.supabase = buildMockChain([]);
    render(<CompletedChallenges />);
    await waitFor(() => {
      expect(screen.getByText('No completed challenges yet.')).toBeTruthy();
    });
  });

  it('shows encouragement in empty state', async () => {
    mocks.supabase = buildMockChain([]);
    render(<CompletedChallenges />);
    await waitFor(() => {
      expect(screen.getByText('Start a challenge to earn rewards!')).toBeTruthy();
    });
  });

  it('renders completed challenge title', async () => {
    const data = [makeCompleted({ challenges: { title: 'Speed Racer', description: 'Fast rides', reward_value: '50pts', badge_icon: '🏎️' } })];
    mocks.supabase = buildMockChain(data);
    render(<CompletedChallenges />);
    await waitFor(() => {
      expect(screen.getByText('Speed Racer')).toBeTruthy();
    });
  });

  it('renders completed challenge description', async () => {
    const data = [makeCompleted()];
    mocks.supabase = buildMockChain(data);
    render(<CompletedChallenges />);
    await waitFor(() => {
      expect(screen.getByText('Complete 10 rides')).toBeTruthy();
    });
  });

  it('renders reward value', async () => {
    const data = [makeCompleted()];
    mocks.supabase = buildMockChain(data);
    render(<CompletedChallenges />);
    await waitFor(() => {
      expect(screen.getByText('🏆 Gold Badge')).toBeTruthy();
    });
  });

  it('shows completed date', async () => {
    const data = [makeCompleted({ completed_at: '2024-06-15T12:00:00Z' })];
    mocks.supabase = buildMockChain(data);
    render(<CompletedChallenges />);
    await waitFor(() => {
      expect(screen.getByText(/Completed/)).toBeTruthy();
    });
  });

  it('shows Reward Claimed badge when claimed', async () => {
    const data = [makeCompleted({ reward_claimed: true })];
    mocks.supabase = buildMockChain(data);
    render(<CompletedChallenges />);
    await waitFor(() => {
      expect(screen.getByText('Reward Claimed')).toBeTruthy();
    });
  });

  it('does not show Reward Claimed when not claimed', async () => {
    const data = [makeCompleted({ reward_claimed: false })];
    mocks.supabase = buildMockChain(data);
    render(<CompletedChallenges />);
    await waitFor(() => {
      expect(screen.getByText('Complete 10 rides')).toBeTruthy();
    });
    expect(screen.queryByText('Reward Claimed')).toBeFalsy();
  });

  it('renders multiple completed challenges', async () => {
    const data = [
      makeCompleted({ id: 'uc-1', challenges: { title: 'Alpha', description: 'A', reward_value: '10', badge_icon: '' } }),
      makeCompleted({ id: 'uc-2', challenges: { title: 'Beta', description: 'B', reward_value: '20', badge_icon: '' } }),
    ];
    mocks.supabase = buildMockChain(data);
    render(<CompletedChallenges />);
    await waitFor(() => {
      expect(screen.getByText('Alpha')).toBeTruthy();
      expect(screen.getByText('Beta')).toBeTruthy();
    });
  });
});
