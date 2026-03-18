import { vi } from 'vitest';

/* ───── challenge factory ───── */
export function makeChallenge(overrides?: Partial<any>) {
  return {
    id: 'ch-1',
    title: 'Ride Hero',
    description: 'Complete 10 rides this month',
    challenge_type: 'rides',
    target_value: 10,
    reward_type: 'badge',
    reward_value: '🏆 Gold Badge',
    badge_icon: '🏆',
    start_date: new Date(Date.now() - 86400000).toISOString(),
    end_date: new Date(Date.now() + 7 * 86400000).toISOString(),
    is_seasonal: false,
    season_theme: '',
    is_active: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/* ───── completed challenge factory ───── */
export function makeCompleted(overrides?: Partial<any>) {
  return {
    id: 'uc-1',
    completed_at: '2024-06-15T12:00:00Z',
    reward_claimed: false,
    challenges: {
      title: 'Ride Hero',
      description: 'Complete 10 rides',
      reward_value: '🏆 Gold Badge',
      badge_icon: '🏆',
    },
    ...overrides,
  };
}

/* ───── Supabase mock chain builder ───── */
export function buildMockChain(resolvedData: any = [], error: any = null) {
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
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: resolvedData, error });
  chain.then = (resolve: any) => resolve({ data: resolvedData, error });
  return chain;
}
