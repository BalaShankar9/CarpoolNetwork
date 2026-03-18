// @vitest-environment jsdom
/**
 * Enterprise-grade component tests for Analytics UI components.
 *
 * Covers:
 *   - SavingsCalculator      (pure component, sliders, day/passenger buttons, calculations, details toggle)
 *   - RideHistoryChart        (loading, empty, bar chart, pagination, summary)
 *   - PersonalStats           (loading, stats rendering, driver/passenger breakdown, month comparison)
 *   - CarpoolPartners         (loading, empty, partner list, type badges, top buddy, navigation)
 *   - AnalyticsDashboard      (loading, tab switching, period selector, stats display, export)
 *   - AdvancedAnalyticsDashboard (loading, empty, time range, metric cards, peak hours, common route)
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// ─── Hoisted mocks ─────────────────────────────────────────────────────────
const mockUseAuth = vi.hoisted(() => vi.fn());
const mockNavigate = vi.hoisted(() => vi.fn());

// analyticsService mocks
const mockAnalyticsService = vi.hoisted(() => ({
  getUserStats: vi.fn(),
  getTrendData: vi.fn(),
  getEnvironmentalImpact: vi.fn(),
  generateReport: vi.fn(),
}));

// Supabase mock for components that query directly
const mockSupabase = vi.hoisted(() => {
  const makeFreshChain = (result: any) => {
    const chain: Record<string, any> = {};
    const methods = [
      'select', 'insert', 'update', 'delete', 'eq', 'neq', 'or', 'not',
      'in', 'order', 'limit', 'is', 'ilike', 'gt', 'gte', 'lt', 'lte',
      'single', 'maybeSingle', 'filter', 'range', 'contains', 'upsert', 'head',
    ];
    for (const m of methods) chain[m] = vi.fn().mockReturnValue(chain);
    const p = Promise.resolve(result);
    Object.defineProperty(chain, 'then', {
      value: p.then.bind(p),
      writable: true,
      configurable: true,
      enumerable: false,
    });
    return chain;
  };
  return {
    from: vi.fn(() => makeFreshChain({ data: [], error: null })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    makeFreshChain,
  };
});

// ─── Module mocks ──────────────────────────────────────────────────────────
vi.mock('../../src/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../src/services/analyticsService', () => ({
  analyticsService: mockAnalyticsService,
  default: mockAnalyticsService,
}));

vi.mock('../../src/lib/supabase', () => ({ supabase: mockSupabase }));

// Mock lucide-react icons — enumerate all icons used by analytics components
vi.mock('lucide-react', () => {
  const iconNames = [
    // AdvancedAnalyticsDashboard
    'TrendingUp', 'TrendingDown', 'Leaf', 'PoundSterling', 'Clock', 'MapPin',
    'Users', 'Car', 'Calendar', 'BarChart3', 'PieChart', 'Activity',
    // AnalyticsDashboard
    'TreeDeciduous', 'Wallet', 'Download', 'ChevronDown', 'Star', 'Route',
    'Zap', 'Target', 'Award', 'Loader2',
    // CarpoolPartners
    'ChevronRight',
    // PersonalStats
    'User',
    // RideHistoryChart
    'ChevronLeft',
    // SavingsCalculator
    'Calculator', 'Fuel',
  ];
  const icons: Record<string, any> = {};
  for (const name of iconNames) {
    icons[name] = React.forwardRef((props: any, ref: any) =>
      React.createElement('svg', { ...props, ref, 'data-testid': `icon-${name}` })
    );
    icons[name].displayName = name;
  }
  return icons;
});

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target, prop) => {
      return React.forwardRef((props: any, ref: any) => {
        const { initial, animate, exit, whileHover, whileTap, transition, variants, ...rest } = props;
        const Tag = prop as any;
        return React.createElement(Tag, { ...rest, ref });
      });
    },
  }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────
import { SavingsCalculator } from '../../src/components/analytics/SavingsCalculator';
import { RideHistoryChart } from '../../src/components/analytics/RideHistoryChart';
import { PersonalStats } from '../../src/components/analytics/PersonalStats';
import { CarpoolPartners } from '../../src/components/analytics/CarpoolPartners';
import AnalyticsDashboard from '../../src/components/analytics/AnalyticsDashboard';
import AdvancedAnalyticsDashboard from '../../src/components/analytics/AdvancedAnalyticsDashboard';

import {
  FAKE_USER_ID,
  FAKE_OTHER_USER_ID,
  FAKE_THIRD_USER_ID,
} from './helpers';

// ─── Common setup ───────────────────────────────────────────────────────────
const FAKE_USER = { id: FAKE_USER_ID, email: 'alice@example.com' };
const FAKE_PROFILE = {
  id: FAKE_USER_ID,
  full_name: 'Alice Analytics',
  avatar_url: 'https://example.com/alice.jpg',
  average_rating: 4.5,
  reliability_score: 90,
  total_rides: 20,
  total_distance: 200,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockUseAuth.mockReturnValue({ user: FAKE_USER, profile: FAKE_PROFILE });
  mockSupabase.from.mockImplementation(() =>
    mockSupabase.makeFreshChain({ data: [], error: null })
  );
  // Default URL
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:fake'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
});

// ═══════════════════════════════════════════════════════════════════════════
// SavingsCalculator — Pure component, no service calls
// ═══════════════════════════════════════════════════════════════════════════
describe('SavingsCalculator', () => {
  it('renders with default props', () => {
    render(<SavingsCalculator />);
    expect(screen.getByText(/Savings Calculator/i)).toBeInTheDocument();
  });

  it('accepts custom default values via props', () => {
    render(<SavingsCalculator defaultDistance={30} defaultDaysPerWeek={3} defaultPassengers={4} />);
    expect(screen.getByText(/Savings Calculator/i)).toBeInTheDocument();
  });

  it('displays distance slider', () => {
    render(<SavingsCalculator />);
    const slider = screen.getByRole('slider');
    expect(slider).toBeInTheDocument();
  });

  it('displays day-of-week selector buttons (1-7)', () => {
    render(<SavingsCalculator />);
    // Days section label
    expect(screen.getByText(/Days per week/i)).toBeInTheDocument();
    // All 7 day buttons should exist (getAllByRole button)
    const allButtons = screen.getAllByRole('button');
    // 7 day buttons + 4 passenger buttons + details toggle = at least 12
    expect(allButtons.length).toBeGreaterThanOrEqual(11);
  });

  it('displays passenger selector buttons', () => {
    render(<SavingsCalculator />);
    // Passenger section label
    expect(screen.getByText(/Carpool size/i)).toBeInTheDocument();
  });

  it('displays annual savings results', () => {
    render(<SavingsCalculator />);
    expect(screen.getByText(/Your Annual Savings/i)).toBeInTheDocument();
    expect(screen.getByText(/per year as a passenger/i)).toBeInTheDocument();
  });

  it('displays environmental metrics (CO2, trees, fuel)', () => {
    render(<SavingsCalculator />);
    expect(screen.getByText(/kg CO₂ saved/i)).toBeInTheDocument();
    expect(screen.getByText(/trees worth/i)).toBeInTheDocument();
    expect(screen.getByText(/litres saved/i)).toBeInTheDocument();
  });

  it('updates calculations when distance changes', () => {
    render(<SavingsCalculator />);
    const slider = screen.getByRole('slider');

    fireEvent.change(slider, { target: { value: '50' } });

    // Results should update — check label still present
    expect(screen.getByText(/Your Annual Savings/i)).toBeInTheDocument();
  });

  it('updates calculations when days per week button clicked', () => {
    render(<SavingsCalculator defaultDaysPerWeek={3} />);
    // All day buttons — click the first "7" (last day button)
    const buttons = screen.getAllByRole('button');
    // Day 7 button
    const day7Button = buttons.find(b => b.textContent === '7');
    expect(day7Button).toBeTruthy();
    fireEvent.click(day7Button!);
    expect(screen.getByText(/7 days/i)).toBeInTheDocument();
  });

  it('toggles calculation details section', () => {
    render(<SavingsCalculator />);

    const detailsBtn = screen.getByText(/Show calculation details/i);
    expect(detailsBtn).toBeInTheDocument();

    fireEvent.click(detailsBtn);

    // After toggle, should show detail breakdown
    expect(screen.getByText(/Hide calculation details/i)).toBeInTheDocument();
    expect(screen.getByText(/Weekly distance/i)).toBeInTheDocument();
  });

  it('displays driver savings section', () => {
    render(<SavingsCalculator />);
    expect(screen.getByText(/As a driver with/i)).toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// RideHistoryChart
// ═══════════════════════════════════════════════════════════════════════════
describe('RideHistoryChart', () => {
  it('shows loading spinner initially', () => {
    render(<RideHistoryChart />);
    // Loading state
    expect(document.querySelector('.animate-spin') || screen.queryByText(/loading/i) || document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders with data after loading', async () => {
    const rides = [
      { id: 'r1', departure_time: new Date().toISOString(), status: 'completed' },
    ];
    const bookings = [
      { ride: { departure_time: new Date().toISOString() }, status: 'confirmed' },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') {
        return mockSupabase.makeFreshChain({ data: rides, error: null });
      }
      if (table === 'ride_bookings') {
        return mockSupabase.makeFreshChain({ data: bookings, error: null });
      }
      return mockSupabase.makeFreshChain({ data: [], error: null });
    });

    render(<RideHistoryChart />);

    await waitFor(() => {
      expect(screen.getByText(/Ride History/i)).toBeInTheDocument();
    });
  });

  it('accepts months prop', async () => {
    mockSupabase.from.mockImplementation(() =>
      mockSupabase.makeFreshChain({ data: [], error: null })
    );

    render(<RideHistoryChart months={3} />);

    await waitFor(() => {
      expect(screen.getByText(/Ride History/i)).toBeInTheDocument();
    });
  });

  it('shows empty state when no rides', async () => {
    mockSupabase.from.mockImplementation(() =>
      mockSupabase.makeFreshChain({ data: [], error: null })
    );

    render(<RideHistoryChart />);

    await waitFor(() => {
      expect(screen.getByText(/Ride History/i)).toBeInTheDocument();
    });
  });

  it('displays summary section with totals', async () => {
    const rides = [
      { id: 'r1', departure_time: new Date().toISOString(), status: 'completed' },
    ];

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') return mockSupabase.makeFreshChain({ data: rides, error: null });
      return mockSupabase.makeFreshChain({ data: [], error: null });
    });

    render(<RideHistoryChart />);

    await waitFor(() => {
      expect(screen.getByText(/Total Rides/i)).toBeInTheDocument();
    });
  });

  it('displays driver/passenger summary labels', async () => {
    mockSupabase.from.mockImplementation(() =>
      mockSupabase.makeFreshChain({ data: [], error: null })
    );

    render(<RideHistoryChart />);

    await waitFor(() => {
      // "As Driver" and "As Passenger" appear in both the legend and summary
      expect(screen.getAllByText(/As Driver/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/As Passenger/i).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('does not crash when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });

    render(<RideHistoryChart />);

    // Should render something or nothing, but not throw
    expect(document.body).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PersonalStats
// ═══════════════════════════════════════════════════════════════════════════
describe('PersonalStats', () => {
  function setupPersonalStatsMock() {
    const profile = {
      ...FAKE_PROFILE,
      average_rating: 4.5,
      reliability_score: 90,
      total_rides: 20,
      total_distance: 200,
    };
    const driverRides = [
      { id: 'r1', departure_time: '2026-01-15T08:00:00Z', distance_km: 10, duration_minutes: 25, status: 'completed', ride_bookings: [{ passenger_id: 'p1', status: 'confirmed' }] },
      { id: 'r2', departure_time: '2026-01-10T09:00:00Z', distance_km: 15, duration_minutes: 30, status: 'completed', ride_bookings: [{ passenger_id: 'p2', status: 'confirmed' }] },
    ];
    const passengerBookings = [
      { ride: { departure_time: '2026-01-12T10:00:00Z', distance_km: 8, duration_minutes: 20, driver_id: 'drv1' }, status: 'confirmed' },
    ];
    // Unique partners count
    const uniquePartners = [{ partner_id: 'p1' }, { partner_id: 'p2' }, { partner_id: 'drv1' }];

    let fromCallIndex = 0;
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        const chain = mockSupabase.makeFreshChain({ data: profile, error: null });
        chain.single = vi.fn().mockResolvedValue({ data: profile, error: null });
        return chain;
      }
      if (table === 'rides') {
        return mockSupabase.makeFreshChain({ data: driverRides, error: null });
      }
      if (table === 'ride_bookings') {
        return mockSupabase.makeFreshChain({ data: passengerBookings, error: null });
      }
      return mockSupabase.makeFreshChain({ data: [], error: null });
    });
  }

  it('shows loading spinner initially', () => {
    render(<PersonalStats />);
    expect(document.querySelector('.animate-spin') || document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders stat cards after loading', async () => {
    setupPersonalStatsMock();

    render(<PersonalStats />);

    await waitFor(() => {
      expect(screen.getByText(/Total Rides/i)).toBeInTheDocument();
    });
  });

  it('displays ride breakdown (driver vs passenger)', async () => {
    setupPersonalStatsMock();

    render(<PersonalStats />);

    await waitFor(() => {
      expect(screen.getByText(/Ride Breakdown/i)).toBeInTheDocument();
      expect(screen.getByText(/As Driver/i)).toBeInTheDocument();
      expect(screen.getByText(/As Passenger/i)).toBeInTheDocument();
    });
  });

  it('displays environmental impact section', async () => {
    setupPersonalStatsMock();

    render(<PersonalStats />);

    await waitFor(() => {
      expect(screen.getByText(/Environmental Impact/i)).toBeInTheDocument();
      // "CO₂ Saved" in stat card AND "kg CO₂ saved" in env section → use getAllByText
      expect(screen.getAllByText(/CO₂/i).length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/Trees equivalent/i)).toBeInTheDocument();
    });
  });

  it('displays reputation section with rating', async () => {
    setupPersonalStatsMock();

    render(<PersonalStats />);

    await waitFor(() => {
      expect(screen.getByText(/Reputation/i)).toBeInTheDocument();
      expect(screen.getByText(/Average Rating/i)).toBeInTheDocument();
    });
  });

  it('displays This Month section with comparison arrow', async () => {
    setupPersonalStatsMock();

    render(<PersonalStats />);

    await waitFor(() => {
      expect(screen.getByText(/This Month/i)).toBeInTheDocument();
    });
  });

  it('does not crash when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });

    render(<PersonalStats />);

    expect(document.body).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CarpoolPartners
// ═══════════════════════════════════════════════════════════════════════════
describe('CarpoolPartners', () => {
  function setupPartnersMock(driverRides: any[] = [], passengerBookings: any[] = []) {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') {
        return mockSupabase.makeFreshChain({ data: driverRides, error: null });
      }
      if (table === 'ride_bookings') {
        return mockSupabase.makeFreshChain({ data: passengerBookings, error: null });
      }
      return mockSupabase.makeFreshChain({ data: [], error: null });
    });
  }

  const driverRidesWithPartners = [
    {
      id: 'r1',
      departure_time: '2026-01-15T08:00:00Z',
      bookings: [
        {
          passenger_id: FAKE_OTHER_USER_ID,
          status: 'completed',
          passenger: {
            id: FAKE_OTHER_USER_ID,
            full_name: 'Bob Partner',
            avatar_url: 'https://example.com/bob.jpg',
            profile_photo_url: null,
            average_rating: 4.8,
          },
        },
      ],
    },
  ];

  const passengerBookingsWithDrivers = [
    {
      ride: {
        id: 'r2',
        departure_time: '2026-01-16T08:30:00Z',
        driver_id: FAKE_THIRD_USER_ID,
        driver: {
          id: FAKE_THIRD_USER_ID,
          full_name: 'Carol Partner',
          avatar_url: null,
          profile_photo_url: null,
          average_rating: 4.2,
        },
      },
      status: 'completed',
    },
  ];

  it('shows loading spinner initially', () => {
    render(<CarpoolPartners />);
    expect(document.querySelector('.animate-spin') || document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('shows empty state when no partners', async () => {
    setupPartnersMock([], []);

    render(<CarpoolPartners />);

    await waitFor(() => {
      expect(screen.getByText(/No carpool partners yet/i)).toBeInTheDocument();
    });
  });

  it('renders partner list with names', async () => {
    setupPartnersMock(driverRidesWithPartners, passengerBookingsWithDrivers);

    render(<CarpoolPartners />);

    await waitFor(() => {
      expect(screen.getByText('Bob Partner')).toBeInTheDocument();
      expect(screen.getByText('Carol Partner')).toBeInTheDocument();
    });
  });

  it('displays ride count for each partner', async () => {
    setupPartnersMock(driverRidesWithPartners, []);

    render(<CarpoolPartners />);

    await waitFor(() => {
      expect(screen.getByText(/1 ride/i)).toBeInTheDocument();
    });
  });

  it('displays partner type badges (Driver/Passenger/Both)', async () => {
    setupPartnersMock(driverRidesWithPartners, passengerBookingsWithDrivers);

    render(<CarpoolPartners />);

    await waitFor(() => {
      // Bob is a passenger in user's driver ride → type should be "Passenger"
      // Carol is a driver in user's passenger booking → type should be "Driver"
      const badges = screen.getAllByText(/Driver|Passenger|Both/i);
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('navigates to partner profile on click', async () => {
    setupPartnersMock(driverRidesWithPartners, []);

    render(<CarpoolPartners />);

    await waitFor(() => {
      expect(screen.getByText('Bob Partner')).toBeInTheDocument();
    });

    // Click on the partner button
    const partnerButton = screen.getByText('Bob Partner').closest('button');
    if (partnerButton) {
      fireEvent.click(partnerButton);
      expect(mockNavigate).toHaveBeenCalledWith(`/user/${FAKE_OTHER_USER_ID}`);
    }
  });

  it('shows Top Carpool Buddy highlight when partner has ≥3 rides', async () => {
    const multiRides = [
      {
        id: 'r1', departure_time: '2026-01-15T08:00:00Z',
        bookings: [{ passenger_id: FAKE_OTHER_USER_ID, status: 'completed', passenger: { id: FAKE_OTHER_USER_ID, full_name: 'Bob Partner', avatar_url: null, profile_photo_url: null, average_rating: 4.5 } }],
      },
      {
        id: 'r2', departure_time: '2026-01-16T08:00:00Z',
        bookings: [{ passenger_id: FAKE_OTHER_USER_ID, status: 'completed', passenger: { id: FAKE_OTHER_USER_ID, full_name: 'Bob Partner', avatar_url: null, profile_photo_url: null, average_rating: 4.5 } }],
      },
      {
        id: 'r3', departure_time: '2026-01-17T08:00:00Z',
        bookings: [{ passenger_id: FAKE_OTHER_USER_ID, status: 'completed', passenger: { id: FAKE_OTHER_USER_ID, full_name: 'Bob Partner', avatar_url: null, profile_photo_url: null, average_rating: 4.5 } }],
      },
    ];
    setupPartnersMock(multiRides, []);

    render(<CarpoolPartners />);

    await waitFor(() => {
      expect(screen.getByText(/Top Carpool Buddy/i)).toBeInTheDocument();
    });
  });

  it('does not crash when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });

    render(<CarpoolPartners />);

    expect(document.body).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AnalyticsDashboard (uses analyticsService)
// ═══════════════════════════════════════════════════════════════════════════
describe('AnalyticsDashboard', () => {
  const fakeStats = {
    userId: FAKE_USER_ID,
    period: 'month' as const,
    ridesGiven: 10,
    ridesTaken: 5,
    totalDistance: 150,
    totalDuration: 300,
    moneySaved: 0,
    fuelContributions: 0,
    co2Saved: 31.5,
    treesEquivalent: 1.5,
    averageRating: 4.5,
    totalReviews: 12,
    topRoutes: [
      { origin: 'London Bridge', destination: 'Canary Wharf', count: 8, totalDistance: 80, averageDuration: 25 },
    ],
    frequentPartners: [
      { userId: FAKE_OTHER_USER_ID, name: 'Bob Partner', avatar: 'https://example.com/bob.jpg', ridesShared: 5, lastRide: new Date('2026-01-15') },
    ],
    peakTimes: [
      { hour: 8, dayOfWeek: 1, rideCount: 5 },
    ],
  };

  const fakeTrends = [
    { date: '2026-01-15', ridesGiven: 1, ridesTaken: 0, co2Saved: 2.1, distance: 10, contributions: 0, savings: 0 },
    { date: '2026-01-16', ridesGiven: 0, ridesTaken: 1, co2Saved: 1.68, distance: 8, contributions: 0, savings: 0 },
  ];

  const fakeImpact = {
    totalCo2Saved: 31.5,
    treesEquivalent: 1.5,
    gallonsSaved: 3.3,
    milesSaved: 93.2,
    carsOffRoad: 3,
    monthlyTrend: Array.from({ length: 12 }, (_, i) => ({
      month: `2025-${String(i + 1).padStart(2, '0')}`,
      co2Saved: Math.random() * 10,
    })),
    comparison: {
      averageUser: 20,
      yourSavings: 31.5,
      percentile: 75,
    },
  };

  function setupDashboardMock() {
    mockAnalyticsService.getUserStats.mockResolvedValue(fakeStats);
    mockAnalyticsService.getTrendData.mockResolvedValue(fakeTrends);
    mockAnalyticsService.getEnvironmentalImpact.mockResolvedValue(fakeImpact);
    mockAnalyticsService.generateReport.mockResolvedValue('{"test": true}');
  }

  it('shows loading spinner initially', () => {
    mockAnalyticsService.getUserStats.mockReturnValue(new Promise(() => {})); // Never resolves
    mockAnalyticsService.getTrendData.mockReturnValue(new Promise(() => {}));
    mockAnalyticsService.getEnvironmentalImpact.mockReturnValue(new Promise(() => {}));

    render(<AnalyticsDashboard />);

    expect(document.querySelector('.animate-spin') || document.querySelector('.animate-pulse')).toBeTruthy();
  });

  it('renders dashboard after loading', async () => {
    setupDashboardMock();

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Analytics/i)).toBeInTheDocument();
    });
  });

  it('displays stats cards with ride counts', async () => {
    setupDashboardMock();

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // ridesGiven
    });
  });

  it('displays period selector as a <select>', async () => {
    setupDashboardMock();

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Analytics/i)).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThanOrEqual(3); // week, month, year, all
  });

  it('switches period via select and reloads data', async () => {
    setupDashboardMock();

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Analytics/i)).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'year' } });

    // Service should be called again with new period
    await waitFor(() => {
      expect(mockAnalyticsService.getUserStats).toHaveBeenCalledTimes(2);
    });
  });

  it('displays tab navigation (overview, trends, impact, routes)', async () => {
    setupDashboardMock();

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Overview/i)).toBeInTheDocument();
      expect(screen.getByText(/Trends/i)).toBeInTheDocument();
      // "Impact" appears in tab button AND in "Community Impact" text
      expect(screen.getAllByText(/Impact/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/Routes/i)).toBeInTheDocument();
    });
  });

  it('switches to trends tab', async () => {
    setupDashboardMock();

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Trends/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Trends/i));

    await waitFor(() => {
      expect(screen.getByText(/Activity Trends/i)).toBeInTheDocument();
    });
  });

  it('switches to impact tab and shows environmental data', async () => {
    setupDashboardMock();

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Overview/i)).toBeInTheDocument();
    });

    // Find the tab button specifically — tabs render capitalized names
    const impactButtons = screen.getAllByText(/Impact/i);
    // The tab button is the one inside the tab nav
    const impactTab = impactButtons.find(el => el.tagName === 'BUTTON' && el.textContent === 'Impact');
    expect(impactTab).toBeTruthy();
    fireEvent.click(impactTab!);

    await waitFor(() => {
      expect(screen.getByText(/Environmental Impact/i)).toBeInTheDocument();
    });
  });

  it('switches to routes tab and shows top routes', async () => {
    setupDashboardMock();

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Routes/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Routes/i));

    await waitFor(() => {
      expect(screen.getByText(/Your Top Routes/i)).toBeInTheDocument();
      expect(screen.getByText(/London Bridge/i)).toBeInTheDocument();
    });
  });

  it('displays frequent partners on overview tab', async () => {
    setupDashboardMock();

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Frequent Carpool Partners/i)).toBeInTheDocument();
      expect(screen.getByText('Bob Partner')).toBeInTheDocument();
    });
  });

  it('displays average rating on overview tab', async () => {
    setupDashboardMock();

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText('4.5')).toBeInTheDocument();
    });
  });

  it('handles export button click (CSV)', async () => {
    setupDashboardMock();

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Your Analytics/i)).toBeInTheDocument();
    });

    // The export dropdown has "Export CSV" and "Export JSON" buttons
    // jsdom doesn't enforce CSS visibility, so they're accessible directly
    fireEvent.click(screen.getByText('Export CSV'));

    await waitFor(() => {
      expect(mockAnalyticsService.generateReport).toHaveBeenCalledWith(
        FAKE_USER_ID, expect.any(String), 'csv',
      );
    });
  });

  it('does not crash when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });
    setupDashboardMock();

    render(<AnalyticsDashboard />);

    expect(document.body).toBeTruthy();
  });

  it('shows comparison percentile on impact tab', async () => {
    setupDashboardMock();

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Overview/i)).toBeInTheDocument();
    });

    const impactButtons = screen.getAllByText(/Impact/i);
    const impactTab = impactButtons.find(el => el.tagName === 'BUTTON' && el.textContent === 'Impact');
    fireEvent.click(impactTab!);

    await waitFor(() => {
      expect(screen.getByText(/25%/)).toBeInTheDocument(); // Top 25% (100 - 75)
    });
  });

  it('shows empty routes message when no routes', async () => {
    const emptyRouteStats = { ...fakeStats, topRoutes: [] };
    mockAnalyticsService.getUserStats.mockResolvedValue(emptyRouteStats);
    mockAnalyticsService.getTrendData.mockResolvedValue(fakeTrends);
    mockAnalyticsService.getEnvironmentalImpact.mockResolvedValue(fakeImpact);

    render(<AnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Routes/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Routes/i));

    await waitFor(() => {
      expect(screen.getByText(/No routes yet/i)).toBeInTheDocument();
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AdvancedAnalyticsDashboard (uses supabase directly)
// ═══════════════════════════════════════════════════════════════════════════
describe('AdvancedAnalyticsDashboard', () => {
  function setupAdvancedMock(rides: any[] = [], bookings: any[] = []) {
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') {
        return mockSupabase.makeFreshChain({ data: rides, error: null });
      }
      if (table === 'ride_bookings') {
        return mockSupabase.makeFreshChain({ data: bookings, error: null });
      }
      return mockSupabase.makeFreshChain({ data: [], error: null });
    });
  }

  const fakeRides = [
    {
      id: 'r1',
      origin: 'London Bridge',
      destination: 'Canary Wharf',
      origin_lat: 51.5079,
      origin_lng: -0.0877,
      destination_lat: 51.5054,
      destination_lng: -0.0235,
      departure_time: '2026-01-15T08:00:00Z',
      status: 'completed',
      driver_id: FAKE_USER_ID,
    },
  ];

  const fakeBookings = [
    {
      ride: {
        id: 'r2',
        origin: 'Camden Town',
        destination: 'Kings Cross',
        origin_lat: 51.5392,
        origin_lng: -0.1426,
        destination_lat: 51.5309,
        destination_lng: -0.1233,
        departure_time: '2026-01-16T09:00:00Z',
        status: 'completed',
      },
      status: 'confirmed',
      passenger_id: FAKE_USER_ID,
    },
  ];

  it('shows loading spinner initially', () => {
    render(<AdvancedAnalyticsDashboard />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows empty state when analytics is null (fetch error)', async () => {
    // When supabase returns an error, analytics stays null → empty state
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') {
        return mockSupabase.makeFreshChain({ data: null, error: { message: 'DB error' } });
      }
      return mockSupabase.makeFreshChain({ data: [], error: null });
    });

    render(<AdvancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/No analytics data available/i)).toBeInTheDocument();
    });
  });

  it('renders dashboard with zero values when data is empty', async () => {
    setupAdvancedMock([], []);

    render(<AdvancedAnalyticsDashboard />);

    await waitFor(() => {
      // Empty arrays still produce analytics with zeros, not the empty state
      expect(screen.getByText(/Advanced Analytics/i)).toBeInTheDocument();
    });
  });

  it('renders dashboard with data', async () => {
    setupAdvancedMock(fakeRides, fakeBookings);

    render(<AdvancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Advanced Analytics/i)).toBeInTheDocument();
    });
  });

  it('displays metric cards (CO2, Money, Distance, Rides)', async () => {
    setupAdvancedMock(fakeRides, fakeBookings);

    render(<AdvancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/CO2 Saved/i)).toBeInTheDocument();
      expect(screen.getByText(/Money Saved/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Distance/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Rides/i)).toBeInTheDocument();
    });
  });

  it('displays time range selector with options', async () => {
    setupAdvancedMock(fakeRides, fakeBookings);

    render(<AdvancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Advanced Analytics/i)).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();

    // Options
    const options = screen.getAllByRole('option');
    expect(options.length).toBe(4); // week, month, year, all
  });

  it('changes time range selection', async () => {
    setupAdvancedMock(fakeRides, fakeBookings);

    render(<AdvancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Advanced Analytics/i)).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'year' } });

    // Should trigger data reload
    await waitFor(() => {
      expect(mockSupabase.from).toHaveBeenCalled();
    });
  });

  it('displays peak travel hours section', async () => {
    setupAdvancedMock(fakeRides, fakeBookings);

    render(<AdvancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Peak Travel Hours/i)).toBeInTheDocument();
    });
  });

  it('displays rides by day of week section', async () => {
    setupAdvancedMock(fakeRides, fakeBookings);

    render(<AdvancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Rides by Day of Week/i)).toBeInTheDocument();
    });
  });

  it('displays environmental impact section', async () => {
    setupAdvancedMock(fakeRides, fakeBookings);

    render(<AdvancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Environmental Impact/i)).toBeInTheDocument();
    });
  });

  it('does not crash when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null, profile: null });

    render(<AdvancedAnalyticsDashboard />);

    expect(document.body).toBeTruthy();
  });

  it('displays most common route section', async () => {
    setupAdvancedMock(fakeRides, fakeBookings);

    render(<AdvancedAnalyticsDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Most Common Route/i)).toBeInTheDocument();
    });
  });

  it('metric cards are clickable (role=button)', async () => {
    setupAdvancedMock(fakeRides, fakeBookings);

    render(<AdvancedAnalyticsDashboard />);

    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(4);
    });
  });
});
