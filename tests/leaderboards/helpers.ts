import { vi } from 'vitest';

/* ───── leaderboard entry factory ───── */
export function makeEntry(overrides?: Partial<any>) {
  return {
    user_id: 'user-2',
    rank: 1,
    score: 42,
    profile: {
      full_name: 'Alice Green',
      avatar_url: 'https://example.com/alice.jpg',
      city: 'London',
    },
    ...overrides,
  };
}

export function makeEntries(count: number, base?: Partial<any>) {
  return Array.from({ length: count }, (_, i) =>
    makeEntry({
      user_id: `user-${i + 1}`,
      rank: i + 1,
      score: 100 - i * 10,
      profile: {
        full_name: `User ${i + 1}`,
        avatar_url: `https://example.com/u${i + 1}.jpg`,
        city: 'London',
      },
      ...base,
    })
  );
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
  chain.or = vi.fn(self);
  chain.not = vi.fn(self);
  chain.order = vi.fn(self);
  chain.limit = vi.fn(self);
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: resolvedData, error });
  chain.rpc = vi.fn().mockResolvedValue({ data: resolvedData, error });
  // The terminal call — when the chain is awaited, resolve with data
  chain.then = (resolve: any) => resolve({ data: resolvedData, error });
  return chain;
}
