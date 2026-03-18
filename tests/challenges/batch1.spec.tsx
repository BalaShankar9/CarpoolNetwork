// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { makeChallenge } from './helpers';

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
    Target: s('Target'), TrendingUp: s('TrendingUp'), Leaf: s('Leaf'),
    Users: s('Users'), Award: s('Award'), CheckCircle: s('CheckCircle'),
    Clock: s('Clock'), Star: s('Star'),
  };
});

import ChallengeCard from '../../src/components/challenges/ChallengeCard';

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

/* ═══════════════════════════════════════
   ChallengeCard — not joined
   ═══════════════════════════════════════ */
describe('ChallengeCard (not joined)', () => {
  const defaultProps = () => ({
    challenge: makeChallenge(),
    isJoined: false,
    progress: 0,
    progressPercent: 0,
    isCompleted: false,
    onJoin: vi.fn(),
  });

  it('renders challenge title', () => {
    render(<ChallengeCard {...defaultProps()} />);
    expect(screen.getByText('Ride Hero')).toBeTruthy();
  });

  it('renders challenge description', () => {
    render(<ChallengeCard {...defaultProps()} />);
    expect(screen.getByText('Complete 10 rides this month')).toBeTruthy();
  });

  it('shows Goal section when not joined', () => {
    render(<ChallengeCard {...defaultProps()} />);
    expect(screen.getByText('Goal')).toBeTruthy();
  });

  it('shows formatted target for rides', () => {
    render(<ChallengeCard {...defaultProps()} />);
    expect(screen.getByText('10 rides')).toBeTruthy();
  });

  it('shows formatted target for co2', () => {
    const props = defaultProps();
    props.challenge = makeChallenge({ challenge_type: 'co2', target_value: 50 });
    render(<ChallengeCard {...props} />);
    expect(screen.getByText('50kg CO₂')).toBeTruthy();
  });

  it('shows formatted target for social', () => {
    const props = defaultProps();
    props.challenge = makeChallenge({ challenge_type: 'social', target_value: 5 });
    render(<ChallengeCard {...props} />);
    expect(screen.getByText('5 friends')).toBeTruthy();
  });

  it('shows plain target for unknown type', () => {
    const props = defaultProps();
    props.challenge = makeChallenge({ challenge_type: 'other', target_value: 99 });
    render(<ChallengeCard {...props} />);
    expect(screen.getByText('99')).toBeTruthy();
  });

  it('shows Reward section', () => {
    render(<ChallengeCard {...defaultProps()} />);
    expect(screen.getByText('Reward')).toBeTruthy();
    expect(screen.getByText('🏆 Gold Badge')).toBeTruthy();
  });

  it('renders Join Challenge button', () => {
    render(<ChallengeCard {...defaultProps()} />);
    expect(screen.getByText('Join Challenge')).toBeTruthy();
  });

  it('calls onJoin when button clicked', () => {
    const props = defaultProps();
    render(<ChallengeCard {...props} />);
    fireEvent.click(screen.getByText('Join Challenge'));
    expect(props.onJoin).toHaveBeenCalledOnce();
  });

  it('uses TrendingUp icon for rides type', () => {
    render(<ChallengeCard {...defaultProps()} />);
    expect(document.querySelector('[data-testid="icon-TrendingUp"]')).toBeTruthy();
  });

  it('uses Leaf icon for co2 type', () => {
    const props = defaultProps();
    props.challenge = makeChallenge({ challenge_type: 'co2' });
    render(<ChallengeCard {...props} />);
    expect(document.querySelector('[data-testid="icon-Leaf"]')).toBeTruthy();
  });

  it('uses Users icon for social type', () => {
    const props = defaultProps();
    props.challenge = makeChallenge({ challenge_type: 'social' });
    render(<ChallengeCard {...props} />);
    expect(document.querySelector('[data-testid="icon-Users"]')).toBeTruthy();
  });

  it('uses Target icon for unknown type', () => {
    const props = defaultProps();
    props.challenge = makeChallenge({ challenge_type: 'other' });
    render(<ChallengeCard {...props} />);
    expect(document.querySelector('[data-testid="icon-Target"]')).toBeTruthy();
  });

  it('shows seasonal banner when is_seasonal', () => {
    const props = defaultProps();
    props.challenge = makeChallenge({ is_seasonal: true, season_theme: 'Summer Sprint' });
    render(<ChallengeCard {...props} />);
    expect(screen.getByText('Summer Sprint')).toBeTruthy();
  });

  it('shows default seasonal text when no season_theme', () => {
    const props = defaultProps();
    props.challenge = makeChallenge({ is_seasonal: true, season_theme: '' });
    render(<ChallengeCard {...props} />);
    expect(screen.getByText('Seasonal Challenge')).toBeTruthy();
  });

  it('does not show seasonal banner when not seasonal', () => {
    render(<ChallengeCard {...defaultProps()} />);
    expect(screen.queryByText('Seasonal Challenge')).toBeFalsy();
  });

  it('applies gray border when not joined', () => {
    const { container } = render(<ChallengeCard {...defaultProps()} />);
    expect(container.firstElementChild!.className).toContain('border-gray-200');
  });
});

/* ═══════════════════════════════════════
   ChallengeCard — joined (in progress)
   ═══════════════════════════════════════ */
describe('ChallengeCard (joined in-progress)', () => {
  const joinedProps = () => ({
    challenge: makeChallenge(),
    isJoined: true,
    progress: 4,
    progressPercent: 40,
    isCompleted: false,
    onJoin: vi.fn(),
  });

  it('shows Progress label', () => {
    render(<ChallengeCard {...joinedProps()} />);
    expect(screen.getByText('Progress')).toBeTruthy();
  });

  it('shows progress fraction', () => {
    render(<ChallengeCard {...joinedProps()} />);
    expect(screen.getByText('4/10')).toBeTruthy();
  });

  it('shows blue progress bar', () => {
    const { container } = render(<ChallengeCard {...joinedProps()} />);
    const bar = container.querySelector('[style*="width: 40%"]');
    expect(bar).toBeTruthy();
    expect(bar!.className).toContain('bg-blue-500');
  });

  it('shows days left', () => {
    render(<ChallengeCard {...joinedProps()} />);
    expect(screen.getByText(/days left/)).toBeTruthy();
  });

  it('shows "Expires today" when 0 days left', () => {
    const props = joinedProps();
    props.challenge = makeChallenge({ end_date: new Date().toISOString() });
    render(<ChallengeCard {...props} />);
    expect(screen.getByText('Expires today')).toBeTruthy();
  });

  it('applies blue border when joined', () => {
    const { container } = render(<ChallengeCard {...joinedProps()} />);
    expect(container.firstElementChild!.className).toContain('border-blue-400');
  });

  it('does not show Join Challenge button', () => {
    render(<ChallengeCard {...joinedProps()} />);
    expect(screen.queryByText('Join Challenge')).toBeFalsy();
  });
});

/* ═══════════════════════════════════════
   ChallengeCard — completed
   ═══════════════════════════════════════ */
describe('ChallengeCard (completed)', () => {
  const completedProps = () => ({
    challenge: makeChallenge(),
    isJoined: true,
    progress: 10,
    progressPercent: 100,
    isCompleted: true,
    onJoin: vi.fn(),
  });

  it('shows Completed! text', () => {
    render(<ChallengeCard {...completedProps()} />);
    expect(screen.getByText('Completed!')).toBeTruthy();
  });

  it('shows reward value in completed state', () => {
    render(<ChallengeCard {...completedProps()} />);
    expect(screen.getByText('Reward: 🏆 Gold Badge')).toBeTruthy();
  });

  it('shows green progress bar', () => {
    const { container } = render(<ChallengeCard {...completedProps()} />);
    const bar = container.querySelector('[style*="width: 100%"]');
    expect(bar).toBeTruthy();
    expect(bar!.className).toContain('bg-green-500');
  });

  it('shows green border', () => {
    const { container } = render(<ChallengeCard {...completedProps()} />);
    expect(container.firstElementChild!.className).toContain('border-green-500');
  });

  it('shows CheckCircle icon instead of type icon', () => {
    render(<ChallengeCard {...completedProps()} />);
    expect(document.querySelector('[data-testid="icon-CheckCircle"]')).toBeTruthy();
  });

  it('shows progress as 10/10', () => {
    render(<ChallengeCard {...completedProps()} />);
    expect(screen.getByText('10/10')).toBeTruthy();
  });
});
