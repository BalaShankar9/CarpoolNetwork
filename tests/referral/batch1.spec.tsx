// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  user: { id: 'user-1' } as any,
  referralCode: { code: 'RIDE2024', id: 'rc-1' } as any,
  stats: {
    totalReferrals: 8,
    completedReferrals: 5,
    pendingReferrals: 3,
    tier: 'silver',
    rank: 12,
  } as any,
  leaderboard: [] as any[],
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('../../src/services/referralService', () => ({
  referralService: {
    getOrCreateReferralCode: vi.fn(() => Promise.resolve(mocks.referralCode)),
    getReferralStats: vi.fn(() => Promise.resolve(mocks.stats)),
    getShareLink: vi.fn((code: string) => `https://app.com/ref/${code}`),
    getShareText: vi.fn((code: string, platform: string) => `Join with ${code}`),
    getLeaderboard: vi.fn(() => Promise.resolve(mocks.leaderboard)),
  },
  REFERRAL_TIERS: [
    { name: 'Bronze', minReferrals: 0, badge: '🥉', color: '#CD7F32' },
    { name: 'Silver', minReferrals: 3, badge: '🥈', color: '#C0C0C0' },
    { name: 'Gold', minReferrals: 10, badge: '🥇', color: '#FFD700' },
    { name: 'Platinum', minReferrals: 25, badge: '💎', color: '#E5E4E2' },
  ],
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: new Proxy({}, {
      get: (_t: any, prop: string) =>
        React.forwardRef((p: any, ref: any) => {
          const { initial, animate, transition, whileHover, whileTap, exit, variants, ...rest } = p;
          return React.createElement(prop, { ...rest, ref });
        }),
    }),
    AnimatePresence: ({ children }: any) => children,
  };
});

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Gift: s('Gift'), Copy: s('Copy'), Check: s('Check'), Share2: s('Share2'),
    Twitter: s('Twitter'), MessageCircle: s('MessageCircle'), Mail: s('Mail'),
    Users: s('Users'), Trophy: s('Trophy'), Star: s('Star'),
    ChevronRight: s('ChevronRight'), Sparkles: s('Sparkles'),
    Crown: s('Crown'), Medal: s('Medal'),
  };
});

import { ReferralCard } from '../../src/components/referral/ReferralCard';
import { ReferralLeaderboard } from '../../src/components/referral/ReferralLeaderboard';
import { referralService } from '../../src/services/referralService';

beforeEach(() => {
  vi.restoreAllMocks();
  mocks.user = { id: 'user-1' };
  mocks.referralCode = { code: 'RIDE2024', id: 'rc-1' };
  mocks.stats = { totalReferrals: 8, completedReferrals: 5, pendingReferrals: 3, tier: 'silver', rank: 12 };
  mocks.leaderboard = [];
  Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  // Re-apply default mock implementations after restore
  vi.mocked(referralService.getOrCreateReferralCode).mockImplementation(() => Promise.resolve(mocks.referralCode));
  vi.mocked(referralService.getReferralStats).mockImplementation(() => Promise.resolve(mocks.stats));
  vi.mocked(referralService.getLeaderboard).mockImplementation(() => Promise.resolve(mocks.leaderboard));
  vi.mocked(referralService.getShareLink).mockImplementation((code: string) => `https://app.com/ref/${code}`);
  vi.mocked(referralService.getShareText).mockImplementation((code: string) => `Join with ${code}`);
});
afterEach(cleanup);

/* ═══════════════════════════════════════
   ReferralCard — loading
   ═══════════════════════════════════════ */
describe('ReferralCard – loading', () => {
  it('shows loading skeleton initially', () => {
    vi.mocked(referralService.getOrCreateReferralCode).mockReturnValue(new Promise(() => {}));
    render(<ReferralCard />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   ReferralCard — content
   ═══════════════════════════════════════ */
describe('ReferralCard – content', () => {
  it('shows Invite Friends heading', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('Invite Friends')).toBeTruthy();
    });
  });

  it('shows referral code', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('RIDE2024')).toBeTruthy();
    });
  });

  it('shows Your referral code label', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('Your referral code')).toBeTruthy();
    });
  });

  it('shows Total Invited stat', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('8')).toBeTruthy();
      expect(screen.getByText('Total Invited')).toBeTruthy();
    });
  });

  it('shows Completed stat', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('5')).toBeTruthy();
      expect(screen.getByText('Completed')).toBeTruthy();
    });
  });

  it('shows Pending stat', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('3')).toBeTruthy();
      expect(screen.getByText('Pending')).toBeTruthy();
    });
  });

  it('shows tier name', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('Silver Referrer')).toBeTruthy();
    });
  });

  it('shows next tier info', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText(/more to Gold/)).toBeTruthy();
    });
  });

  it('shows Copy Link button', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('Copy Link')).toBeTruthy();
    });
  });

  it('shows Share button', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('Share')).toBeTruthy();
    });
  });

  it('shows benefits section', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText(/What you & your friends get/)).toBeTruthy();
    });
  });

  it('shows Community Champion badge benefit', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('Community Champion badge for you')).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   ReferralCard — interactions
   ═══════════════════════════════════════ */
describe('ReferralCard – interactions', () => {
  it('copies code to clipboard on Copy click', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Copy'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('RIDE2024');
  });

  it('copies link on Copy Link click', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('Copy Link')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Copy Link'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://app.com/ref/RIDE2024');
  });

  it('shows share menu when Share clicked', async () => {
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('Share')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Share'));
    await waitFor(() => {
      expect(screen.getByText('Twitter')).toBeTruthy();
      expect(screen.getByText('WhatsApp')).toBeTruthy();
      expect(screen.getByText('Email')).toBeTruthy();
    });
  });

  it('opens twitter share', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<ReferralCard />);
    await waitFor(() => expect(screen.getByText('Share')).toBeTruthy());
    fireEvent.click(screen.getByText('Share'));
    await waitFor(() => expect(screen.getByText('Twitter')).toBeTruthy());
    fireEvent.click(screen.getByText('Twitter'));
    expect(openSpy).toHaveBeenCalledWith(expect.stringContaining('twitter.com'), '_blank');
    openSpy.mockRestore();
  });

  it('shows rank badge when rank <= 100', async () => {
    mocks.stats = { ...mocks.stats, rank: 5 };
    render(<ReferralCard />);
    await waitFor(() => {
      expect(screen.getByText('#5')).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   ReferralLeaderboard — loading
   ═══════════════════════════════════════ */
describe('ReferralLeaderboard – loading', () => {
  it('shows loading skeleton initially', () => {
    vi.mocked(referralService.getLeaderboard).mockReturnValue(new Promise(() => {}));
    render(<ReferralLeaderboard />);
    expect(document.querySelector('.animate-pulse')).toBeTruthy();
  });
});

/* ═══════════════════════════════════════
   ReferralLeaderboard — empty
   ═══════════════════════════════════════ */
describe('ReferralLeaderboard – empty', () => {
  it('shows No Leaders Yet', async () => {
    mocks.leaderboard = [];
    render(<ReferralLeaderboard />);
    await waitFor(() => {
      expect(screen.getByText('No Leaders Yet')).toBeTruthy();
    });
  });

  it('shows encouragement text', async () => {
    mocks.leaderboard = [];
    render(<ReferralLeaderboard />);
    await waitFor(() => {
      expect(screen.getByText(/Be the first to invite friends/)).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   ReferralLeaderboard — with data
   ═══════════════════════════════════════ */
describe('ReferralLeaderboard – with data', () => {
  beforeEach(() => {
    mocks.leaderboard = [
      { userId: 'u1', name: 'Alice', avatar: '', referralCount: 20, tier: 'gold' },
      { userId: 'u2', name: 'Bob', avatar: '', referralCount: 12, tier: 'silver' },
      { userId: 'user-1', name: 'Me', avatar: '', referralCount: 5, tier: 'bronze' },
    ];
  });

  it('shows Referral Champions heading', async () => {
    render(<ReferralLeaderboard />);
    await waitFor(() => {
      expect(screen.getByText('Referral Champions')).toBeTruthy();
    });
  });

  it('renders leaderboard entries', async () => {
    render(<ReferralLeaderboard />);
    await waitFor(() => {
      expect(screen.getByText('Alice')).toBeTruthy();
      expect(screen.getByText('Bob')).toBeTruthy();
    });
  });

  it('shows Crown for rank 1', async () => {
    render(<ReferralLeaderboard />);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="icon-Crown"]')).toBeTruthy();
    });
  });

  it('shows Medal for rank 2', async () => {
    render(<ReferralLeaderboard />);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="icon-Medal"]')).toBeTruthy();
    });
  });

  it('shows "(You)" for current user', async () => {
    render(<ReferralLeaderboard />);
    await waitFor(() => {
      expect(screen.getByText('(You)')).toBeTruthy();
    });
  });

  it('shows referral count', async () => {
    render(<ReferralLeaderboard />);
    await waitFor(() => {
      expect(screen.getByText('20')).toBeTruthy();
    });
  });

  it('shows tier label for entries', async () => {
    render(<ReferralLeaderboard />);
    await waitFor(() => {
      expect(screen.getByText('gold Referrer')).toBeTruthy();
      expect(screen.getByText('silver Referrer')).toBeTruthy();
    });
  });

  it('shows referrals text', async () => {
    render(<ReferralLeaderboard />);
    await waitFor(() => {
      expect(screen.getAllByText('referrals').length).toBeGreaterThan(0);
    });
  });

  it('shows first letter avatar when no image', async () => {
    mocks.leaderboard = [
      { userId: 'u1', name: 'Alice', avatar: null, referralCount: 10, tier: 'gold' },
    ];
    render(<ReferralLeaderboard />);
    await waitFor(() => {
      expect(screen.getByText('A')).toBeTruthy();
    });
  });
});
