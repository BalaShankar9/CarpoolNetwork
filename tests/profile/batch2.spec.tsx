// @vitest-environment jsdom
/**
 * Profile module – Batch 2
 *  • ReviewsDisplay          (8 tests)
 *  • RideAnalyticsDashboard  (8 tests)
 *  • TrustScoreVisualization (8 tests)
 *  • VerificationBadges      (9 tests)
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import {
  FAKE_USER,
  FAKE_PROFILE,
  FAKE_EMPTY_PROFILE,
  FAKE_REVIEW,
  FAKE_DRIVER_LICENSE,
  FAKE_INSURANCE,
  buildMockChain,
  makeReview,
} from './helpers';

// ---- hoisted mocks --------------------------------------------------------

const mocks = vi.hoisted(() => ({
  mockProfile: null as any,
  mockUser: null as any,
  mockNavigate: vi.fn(),
  mockSupabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) },
    storage: { from: vi.fn(() => ({ upload: vi.fn(), getPublicUrl: vi.fn() })) },
  },
}));

// ---- module mocks ---------------------------------------------------------

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.mockUser, profile: mocks.mockProfile }),
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: mocks.mockSupabase,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.mockNavigate,
  Link: ({ to, children, ...p }: any) => <a href={to} {...p}>{children}</a>,
}));

vi.mock('../../src/components/shared/ClickableUserProfile', () => ({
  default: ({ user, additionalInfo }: any) => (
    <div data-testid="clickable-user">
      <span>{user?.full_name}</span>
      {additionalInfo}
    </div>
  ),
}));

vi.mock('lucide-react', () => {
  const stub = (name: string) => {
    const C = (p: any) => <span data-testid={`icon-${name}`} {...p} />;
    C.displayName = name;
    return C;
  };
  return {
    Star: stub('Star'), ThumbsUp: stub('ThumbsUp'), Car: stub('Car'), User: stub('User'),
    Calendar: stub('Calendar'), Filter: stub('Filter'), TrendingUp: stub('TrendingUp'),
    Leaf: stub('Leaf'), MapPin: stub('MapPin'), Clock: stub('Clock'), DollarSign: stub('DollarSign'),
    Users: stub('Users'), Award: stub('Award'), Shield: stub('Shield'), CheckCircle: stub('CheckCircle'),
    Info: stub('Info'), RefreshCw: stub('RefreshCw'), Mail: stub('Mail'), Phone: stub('Phone'),
    Camera: stub('Camera'), FileText: stub('FileText'), XCircle: stub('XCircle'),
    TrendingDown: stub('TrendingDown'),
  };
});

// ---- imports under test ---------------------------------------------------

import ReviewsDisplay from '../../src/components/profile/ReviewsDisplay';
import RideAnalyticsDashboard from '../../src/components/profile/RideAnalyticsDashboard';
import TrustScoreVisualization from '../../src/components/profile/TrustScoreVisualization';
import VerificationBadges from '../../src/components/profile/VerificationBadges';

// ===========================================================================
// ReviewsDisplay
// ===========================================================================
describe('ReviewsDisplay', () => {
  beforeEach(() => {
    mocks.mockProfile = { ...FAKE_PROFILE };
    mocks.mockUser = { ...FAKE_USER };
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  function setupReviews(reviews: any[] = []) {
    mocks.mockSupabase.from.mockImplementation(() => buildMockChain(reviews));
  }

  it('returns null when profile is null', () => {
    mocks.mockProfile = null;
    setupReviews([]);
    const { container } = render(<ReviewsDisplay />);
    expect(container.innerHTML).toBe('');
  });

  it('shows loading spinner initially', () => {
    mocks.mockSupabase.from.mockImplementation(() => {
      const c = buildMockChain([]);
      c.then = () => new Promise(() => {});
      return c;
    });
    render(<ReviewsDisplay />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no reviews', async () => {
    setupReviews([]);
    render(<ReviewsDisplay />);
    await waitFor(() => {
      expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    });
  });

  it('renders heading and review count', async () => {
    const reviews = [FAKE_REVIEW, makeReview({ id: 'rev-002', rating: 4, review_type: 'passenger' })];
    setupReviews(reviews);
    render(<ReviewsDisplay />);
    await waitFor(() => {
      expect(screen.getByText('Reviews & Ratings')).toBeInTheDocument();
    });
    expect(screen.getByText(/2 reviews from the community/)).toBeInTheDocument();
  });

  it('shows average rating', async () => {
    setupReviews([FAKE_REVIEW]);
    render(<ReviewsDisplay />);
    await waitFor(() => {
      expect(screen.getByText('4.5')).toBeInTheDocument();
    });
  });

  it('renders filter buttons', async () => {
    setupReviews([FAKE_REVIEW]);
    render(<ReviewsDisplay />);
    await waitFor(() => {
      expect(screen.getByText('All')).toBeInTheDocument();
    });
    expect(screen.getByText('As Driver')).toBeInTheDocument();
    expect(screen.getByText('As Passenger')).toBeInTheDocument();
  });

  it('shows reviewer name from ClickableUserProfile', async () => {
    setupReviews([FAKE_REVIEW]);
    render(<ReviewsDisplay />);
    await waitFor(() => {
      expect(screen.getByText('Bob Driver')).toBeInTheDocument();
    });
  });

  it('shows review comment', async () => {
    setupReviews([FAKE_REVIEW]);
    render(<ReviewsDisplay />);
    await waitFor(() => {
      expect(screen.getByText('Great driver, very safe!')).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// RideAnalyticsDashboard
// ===========================================================================
describe('RideAnalyticsDashboard', () => {
  beforeEach(() => {
    mocks.mockProfile = { ...FAKE_PROFILE };
    mocks.mockUser = { ...FAKE_USER };
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  function setupRideData(driverRides: any[] = [], passengerBookings: any[] = []) {
    let callCount = 0;
    mocks.mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'rides') return buildMockChain(driverRides);
      if (table === 'ride_bookings') return buildMockChain(passengerBookings);
      return buildMockChain([]);
    });
  }

  it('shows loading spinner initially', () => {
    mocks.mockSupabase.from.mockImplementation(() => {
      const c = buildMockChain([]);
      c.then = () => new Promise(() => {});
      return c;
    });
    render(<RideAnalyticsDashboard />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders heading', async () => {
    setupRideData([], []);
    render(<RideAnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Your Ride Analytics')).toBeInTheDocument();
    });
  });

  it('shows zero-state when no rides', async () => {
    setupRideData([], []);
    render(<RideAnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('No ride data yet')).toBeInTheDocument();
    });
  });

  it('computes total distance from driver rides', async () => {
    const driverRides = [
      { id: 'r1', estimated_distance: 100, estimated_duration: 60, origin: 'A', destination: 'B', ride_bookings: [] },
      { id: 'r2', estimated_distance: 50, estimated_duration: 30, origin: 'A', destination: 'B', ride_bookings: [] },
    ];
    setupRideData(driverRides, []);
    render(<RideAnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument(); // 100+50 km
    });
  });

  it('shows carbon saved estimate', async () => {
    const driverRides = [
      { id: 'r1', estimated_distance: 100, estimated_duration: 60, origin: 'A', destination: 'B', ride_bookings: [] },
    ];
    setupRideData(driverRides, []);
    render(<RideAnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Environmental Impact')).toBeInTheDocument();
    });
    // 100 * 0.171 = 17.1 kg CO2
    expect(screen.getByText('17.1')).toBeInTheDocument();
  });

  it('shows money saved', async () => {
    const driverRides = [
      { id: 'r1', estimated_distance: 200, estimated_duration: 120, origin: 'A', destination: 'B', ride_bookings: [] },
    ];
    setupRideData(driverRides, []);
    render(<RideAnalyticsDashboard />);
    await waitFor(() => {
      // 200 * 0.15 = 30
      expect(screen.getByText('£30')).toBeInTheDocument();
    });
  });

  it('counts unique people connected', async () => {
    const driverRides = [
      {
        id: 'r1', estimated_distance: 50, estimated_duration: 30, origin: 'London', destination: 'Manchester',
        ride_bookings: [{ passenger_id: 'p1' }, { passenger_id: 'p2' }],
      },
    ];
    setupRideData(driverRides, []);
    render(<RideAnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 unique people
    });
  });

  it('shows most frequent route', async () => {
    const driverRides = [
      { id: 'r1', estimated_distance: 50, estimated_duration: 30, origin: 'London', destination: 'Manchester', ride_bookings: [] },
      { id: 'r2', estimated_distance: 50, estimated_duration: 30, origin: 'London', destination: 'Manchester', ride_bookings: [] },
    ];
    setupRideData(driverRides, []);
    render(<RideAnalyticsDashboard />);
    await waitFor(() => {
      expect(screen.getByText('Most Frequent Route')).toBeInTheDocument();
    });
    expect(screen.getByText('London')).toBeInTheDocument();
    expect(screen.getByText('Manchester')).toBeInTheDocument();
    expect(screen.getByText('2 times')).toBeInTheDocument();
  });
});

// ===========================================================================
// TrustScoreVisualization
// ===========================================================================
describe('TrustScoreVisualization', () => {
  beforeEach(() => {
    mocks.mockProfile = { ...FAKE_PROFILE };
    mocks.mockUser = { ...FAKE_USER };
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  function setupTrustData(licenseData: any = null, insuranceData: any = null) {
    mocks.mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'driver_licenses') return buildMockChain(licenseData ? [licenseData] : []);
      if (table === 'vehicle_insurance') return buildMockChain(insuranceData ? [insuranceData] : []);
      return buildMockChain([]);
    });
  }

  it('returns null when profile is null', () => {
    mocks.mockProfile = null;
    setupTrustData();
    const { container } = render(<TrustScoreVisualization />);
    expect(container.innerHTML).toBe('');
  });

  it('shows loading spinner initially', () => {
    mocks.mockSupabase.from.mockImplementation(() => {
      const c = buildMockChain([]);
      c.maybeSingle = vi.fn().mockReturnValue(new Promise(() => {}));
      return c;
    });
    render(<TrustScoreVisualization />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders heading "Trust Score"', async () => {
    setupTrustData();
    render(<TrustScoreVisualization />);
    await waitFor(() => {
      expect(screen.getByText('Trust Score')).toBeInTheDocument();
    });
  });

  it('displays current trust score', async () => {
    setupTrustData();
    render(<TrustScoreVisualization />);
    await waitFor(() => {
      expect(screen.getByText('72')).toBeInTheDocument(); // trust_score from profile
    });
  });

  it('shows score breakdown categories', async () => {
    setupTrustData();
    render(<TrustScoreVisualization />);
    await waitFor(() => {
      expect(screen.getByText('Score Breakdown')).toBeInTheDocument();
    });
    expect(screen.getByText('Email Verification')).toBeInTheDocument();
    expect(screen.getByText('Phone Verification')).toBeInTheDocument();
    expect(screen.getByText('Profile Photo')).toBeInTheDocument();
    expect(screen.getByText('Completed Rides')).toBeInTheDocument();
  });

  it('shows refresh button and calls rpc', async () => {
    setupTrustData();
    render(<TrustScoreVisualization />);
    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument();
    });

    mocks.mockSupabase.rpc.mockResolvedValue({ data: 80, error: null });
    fireEvent.click(screen.getByText('Refresh'));
    await waitFor(() => {
      expect(mocks.mockSupabase.rpc).toHaveBeenCalledWith('refresh_my_trust_score');
    });
  });

  it('shows verified license in breakdown', async () => {
    setupTrustData({ id: 'lic-1', status: 'verified' }, null);
    render(<TrustScoreVisualization />);
    await waitFor(() => {
      expect(screen.getByText('Driver License')).toBeInTheDocument();
    });
    // 20/20 pts for verified license
    expect(screen.getByText('20/20 pts')).toBeInTheDocument();
  });

  it('shows info about why trust score matters', async () => {
    setupTrustData();
    render(<TrustScoreVisualization />);
    await waitFor(() => {
      expect(screen.getByText(/Why does trust score matter/)).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// VerificationBadges
// ===========================================================================
describe('VerificationBadges', () => {
  beforeEach(() => {
    mocks.mockProfile = { ...FAKE_PROFILE };
    mocks.mockUser = { ...FAKE_USER };
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  function setupDocs(licenseData: any = null, insuranceData: any = null) {
    mocks.mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'driver_licenses') return buildMockChain(licenseData ? [licenseData] : []);
      if (table === 'vehicle_insurance') return buildMockChain(insuranceData ? [insuranceData] : []);
      return buildMockChain([]);
    });
  }

  it('returns null when profile is null and no external status', () => {
    mocks.mockProfile = null;
    const { container } = render(<VerificationBadges />);
    expect(container.innerHTML).toBe('');
  });

  it('renders with external status props even without profile', () => {
    mocks.mockProfile = null;
    render(<VerificationBadges emailVerified={true} phoneVerified={false} includeDocuments={false} />);
    expect(screen.getByText('Email Verified')).toBeInTheDocument();
  });

  it('shows "Verification Status" heading for self (non-readOnly)', async () => {
    setupDocs();
    render(<VerificationBadges />);
    await waitFor(() => {
      expect(screen.getByText('Verification Status')).toBeInTheDocument();
    });
  });

  it('shows "Verification Summary" in readOnly mode', async () => {
    setupDocs();
    render(<VerificationBadges readOnly={true} />);
    await waitFor(() => {
      expect(screen.getByText('Verification Summary')).toBeInTheDocument();
    });
  });

  it('displays all base verification items', async () => {
    setupDocs();
    render(<VerificationBadges />);
    await waitFor(() => {
      expect(screen.getByText('Email Verified')).toBeInTheDocument();
    });
    expect(screen.getByText('Phone Verified')).toBeInTheDocument();
    expect(screen.getByText('Photo Verified')).toBeInTheDocument();
    expect(screen.getByText('ID Verified')).toBeInTheDocument();
  });

  it('includes document badges when includeDocuments=true', async () => {
    setupDocs({ id: 'l1', status: 'verified' }, { id: 'i1', status: 'active' });
    render(<VerificationBadges includeDocuments={true} />);
    await waitFor(() => {
      expect(screen.getByText('Driver License')).toBeInTheDocument();
    });
    expect(screen.getByText('Insurance')).toBeInTheDocument();
  });

  it('shows computed trust score', async () => {
    setupDocs();
    render(<VerificationBadges />);
    await waitFor(() => {
      expect(screen.getByText('Trust Score')).toBeInTheDocument();
    });
  });

  it('shows action links for unverified items (non-readOnly)', async () => {
    mocks.mockProfile = { ...FAKE_EMPTY_PROFILE };
    setupDocs();
    render(<VerificationBadges />);
    await waitFor(() => {
      expect(screen.getByText('Verify Email ->')).toBeInTheDocument();
    });
  });

  it('hides action links in readOnly mode', async () => {
    mocks.mockProfile = { ...FAKE_EMPTY_PROFILE };
    setupDocs();
    render(<VerificationBadges readOnly={true} />);
    await waitFor(() => {
      expect(screen.getByText('Verification Summary')).toBeInTheDocument();
    });
    expect(screen.queryByText('Verify Email ->')).not.toBeInTheDocument();
  });
});
