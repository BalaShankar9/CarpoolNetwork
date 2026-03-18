import { vi } from 'vitest';

/* ───── factories only (no vi.mock here) ───── */

export function makeCarbonStats(overrides?: Partial<any>) {
  return {
    totalCO2Saved: 150.5,
    totalDistanceShared: 820,
    ridesShared: 42,
    treesEquivalent: 7,
    monthlyAverage: 12.5,
    ...overrides,
  };
}

export function makeRewardPoints(overrides?: Partial<any>) {
  return {
    userId: 'user-1',
    currentPoints: 2500,
    lifetimePoints: 5200,
    tier: 'gold' as const,
    tierProgress: 42,
    nextTierPoints: 15000,
    ...overrides,
  };
}

export function makeReward(overrides?: Partial<any>) {
  return {
    id: 'reward-1',
    name: 'Test Reward',
    description: 'A test reward',
    category: 'voucher' as const,
    pointsCost: 500,
    value: 5,
    currency: 'GBP',
    partnerName: 'Test Partner',
    active: true,
    featured: false,
    ...overrides,
  };
}

export function makeRedemption(overrides?: Partial<any>) {
  return {
    id: 'red-1',
    userId: 'user-1',
    rewardId: 'reward-1',
    reward: makeReward(),
    pointsSpent: 500,
    status: 'completed' as const,
    code: 'ABC-123',
    redeemedAt: new Date('2025-01-15'),
    expiresAt: new Date('2026-01-15'),
    ...overrides,
  };
}
