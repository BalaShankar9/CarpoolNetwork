// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

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
    Leaf: s('Leaf'), TreeDeciduous: s('TreeDeciduous'), Car: s('Car'),
    Droplet: s('Droplet'), Wind: s('Wind'), TrendingUp: s('TrendingUp'),
    Award: s('Award'), Share2: s('Share2'),
  };
});

import EnvironmentalImpact from '../../src/components/eco/EnvironmentalImpact';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'user-1' };
});
afterEach(cleanup);

/* ─── chain helpers ─── */
function setupChain(driverRides: any[], passengerBookings: any[]) {
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
  chain.then = (resolve: any) => {
    callCount++;
    if (callCount === 1) {
      return resolve({ data: driverRides, error: null });
    }
    return resolve({ data: passengerBookings, error: null });
  };
  return chain;
}

function pendingChain() {
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
  // Never resolves
  chain.then = undefined;
  chain.eq = vi.fn().mockReturnValue(new Promise(() => {}));
  return chain;
}

/* ═══════════════════════════════════════
   Loading & empty states
   ═══════════════════════════════════════ */
describe('EnvironmentalImpact – states', () => {
  it('shows loading spinner initially', () => {
    // Create a chain where the final .eq() never resolves (hangs)
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
    // thenable that never resolves → component stays in loading state
    chain.then = () => new Promise(() => {});
    mocks.supabase = chain;
    render(<EnvironmentalImpact />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows empty state when stats are null (error path)', async () => {
    // Make chain reject to trigger catch, keeping stats = null
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
    chain.then = (_resolve: any, reject: any) => {
      if (reject) reject(new Error('fail'));
    };
    mocks.supabase = chain;
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Start Your Green Journey')).toBeTruthy();
    });
  });

  it('shows encouragement in empty state', async () => {
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
    chain.then = (_resolve: any, reject: any) => {
      if (reject) reject(new Error('fail'));
    };
    mocks.supabase = chain;
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Complete rides to see your environmental impact!')).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   Stats rendering
   ═══════════════════════════════════════ */
describe('EnvironmentalImpact – stats', () => {
  const driverRides = [
    { distance_km: 50, departure_time: new Date().toISOString() },
    { distance_km: 30, departure_time: new Date().toISOString() },
  ];
  const passengerBookings = [
    { id: 'b1', ride: { distance_km: 20, departure_time: new Date().toISOString() } },
  ];
  // Total: 50+30+20 = 100km; co2 = 100*0.12 = 12kg; trees = 12/21 ≈ 0.6; fuel = 100*0.08 = 8.0

  it('shows Environmental Impact heading', async () => {
    mocks.supabase = setupChain(driverRides, passengerBookings);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Environmental Impact')).toBeTruthy();
    });
  });

  it('shows CO₂ Saved card', async () => {
    mocks.supabase = setupChain(driverRides, passengerBookings);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('CO₂ Saved')).toBeTruthy();
      expect(screen.getByText('12.0')).toBeTruthy();
      expect(screen.getByText('kilograms')).toBeTruthy();
    });
  });

  it('shows Trees Equivalent card', async () => {
    mocks.supabase = setupChain(driverRides, passengerBookings);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Trees Equivalent')).toBeTruthy();
      expect(screen.getByText('0.6')).toBeTruthy();
      expect(screen.getByText('planted')).toBeTruthy();
    });
  });

  it('shows Fuel Saved card', async () => {
    mocks.supabase = setupChain(driverRides, passengerBookings);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Fuel Saved')).toBeTruthy();
      expect(screen.getByText('8.0')).toBeTruthy();
      expect(screen.getByText('liters')).toBeTruthy();
    });
  });

  it('shows Total Distance card', async () => {
    mocks.supabase = setupChain(driverRides, passengerBookings);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Total Distance')).toBeTruthy();
      expect(screen.getByText('100')).toBeTruthy();
      expect(screen.getByText('km shared')).toBeTruthy();
    });
  });

  it('shows Share Impact button', async () => {
    mocks.supabase = setupChain(driverRides, passengerBookings);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Share Impact')).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   Milestones
   ═══════════════════════════════════════ */
describe('EnvironmentalImpact – milestones', () => {
  it('shows Eco Milestones section', async () => {
    const rides = [{ distance_km: 100, departure_time: new Date().toISOString() }];
    mocks.supabase = setupChain(rides, []);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Eco Milestones')).toBeTruthy();
    });
  });

  it('shows achieved milestone: Eco Starter (co2>=10)', async () => {
    // Need 10kg co2 = 10/0.12 ≈ 83.3km
    const rides = [{ distance_km: 100, departure_time: new Date().toISOString() }];
    mocks.supabase = setupChain(rides, []);
    // co2 = 100*0.12 = 12 ≥ 10 → achieved
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Eco Starter')).toBeTruthy();
    });
  });

  it('shows progress bar for unachieved milestones', async () => {
    // co2=12 < 50, so "Green Commuter" is not achieved and should show progress bar
    const rides = [{ distance_km: 100, departure_time: new Date().toISOString() }];
    mocks.supabase = setupChain(rides, []);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Green Commuter')).toBeTruthy();
    });
    // Should show progress percentage
    expect(screen.getByText('24%')).toBeTruthy(); // (12/50)*100=24
  });

  it('shows achieved count out of total', async () => {
    // co2=12: Eco Starter achieved, others not
    const rides = [{ distance_km: 100, departure_time: new Date().toISOString() }];
    mocks.supabase = setupChain(rides, []);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('1/6 achieved')).toBeTruthy();
    });
  });

  it('shows all milestone names', async () => {
    const rides = [{ distance_km: 100, departure_time: new Date().toISOString() }];
    mocks.supabase = setupChain(rides, []);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Eco Starter')).toBeTruthy();
      expect(screen.getByText('Green Commuter')).toBeTruthy();
      expect(screen.getByText('Climate Champion')).toBeTruthy();
      expect(screen.getByText('Earth Guardian')).toBeTruthy();
      expect(screen.getByText('Tree Saver')).toBeTruthy();
      expect(screen.getByText('Fuel Saver')).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   Impact Visualized section
   ═══════════════════════════════════════ */
describe('EnvironmentalImpact – visualization', () => {
  const rides = [{ distance_km: 100, departure_time: new Date().toISOString() }];

  it('shows Your Impact Visualized heading', async () => {
    mocks.supabase = setupChain(rides, []);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Your Impact Visualized')).toBeTruthy();
    });
  });

  it('shows Clean Air Contribution', async () => {
    mocks.supabase = setupChain(rides, []);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Clean Air Contribution')).toBeTruthy();
    });
  });

  it('shows Forest Equivalent visualization', async () => {
    mocks.supabase = setupChain(rides, []);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Forest Equivalent')).toBeTruthy();
    });
  });

  it('shows Fuel Conservation visualization', async () => {
    mocks.supabase = setupChain(rides, []);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Fuel Conservation')).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   Monthly Trend
   ═══════════════════════════════════════ */
describe('EnvironmentalImpact – trend', () => {
  it('shows Monthly Impact Trend heading', async () => {
    const rides = [{ distance_km: 50, departure_time: new Date().toISOString() }];
    mocks.supabase = setupChain(rides, []);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Monthly Impact Trend')).toBeTruthy();
    });
  });

  it('shows positive trend text when recent > previous', async () => {
    const now = new Date();
    const recent = { distance_km: 100, departure_time: new Date(now.getTime() - 5 * 86400000).toISOString() };
    const old = { distance_km: 50, departure_time: new Date(now.getTime() - 45 * 86400000).toISOString() };
    mocks.supabase = setupChain([recent, old], []);
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText(/increased your eco-friendly/)).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   Share functionality
   ═══════════════════════════════════════ */
describe('EnvironmentalImpact – share', () => {
  it('copies to clipboard when navigator.share not available', async () => {
    const rides = [{ distance_km: 100, departure_time: new Date().toISOString() }];
    mocks.supabase = setupChain(rides, []);
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) }, share: undefined });
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Share Impact')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Share Impact'));
    await waitFor(() => {
      expect(screen.getByText('Copied to clipboard!')).toBeTruthy();
    });
  });

  it('uses navigator.share when available', async () => {
    const rides = [{ distance_km: 100, departure_time: new Date().toISOString() }];
    mocks.supabase = setupChain(rides, []);
    const shareFn = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: shareFn, writable: true, configurable: true });
    render(<EnvironmentalImpact />);
    await waitFor(() => {
      expect(screen.getByText('Share Impact')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('Share Impact'));
    await waitFor(() => {
      expect(shareFn).toHaveBeenCalled();
    });
    // Cleanup
    Object.defineProperty(navigator, 'share', { value: undefined, writable: true, configurable: true });
  });
});
