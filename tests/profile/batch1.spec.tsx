// @vitest-environment jsdom
/**
 * Profile module – Batch 1
 *  • StatisticsDashboard   (8 tests)
 *  • ProfileCompletionTracker (9 tests)
 *  • PrivacyControls       (8 tests)
 *  • ReliabilityScoreDisplay (8 tests)
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import {
  FAKE_USER,
  FAKE_PROFILE,
  FAKE_EMPTY_PROFILE,
  FAKE_RELIABILITY_DATA,
  FAKE_RESTRICTION,
  buildMockChain,
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

vi.mock('lucide-react', () => {
  const stub = (name: string) => {
    const C = (p: any) => <span data-testid={`icon-${name}`} {...p} />;
    C.displayName = name;
    return C;
  };
  return {
    Car: stub('Car'), Users: stub('Users'), Star: stub('Star'), TrendingUp: stub('TrendingUp'),
    Award: stub('Award'), Calendar: stub('Calendar'), CheckCircle: stub('CheckCircle'),
    AlertCircle: stub('AlertCircle'), Shield: stub('Shield'), Phone: stub('Phone'),
    User: stub('User'), ImageIcon: stub('ImageIcon'), Image: stub('Image'),
    Sparkles: stub('Sparkles'), ArrowRight: stub('ArrowRight'),
    Eye: stub('Eye'), EyeOff: stub('EyeOff'), Lock: stub('Lock'), Mail: stub('Mail'),
    MessageSquare: stub('MessageSquare'),
    TrendingDown: stub('TrendingDown'), Clock: stub('Clock'), Info: stub('Info'),
    RefreshCw: stub('RefreshCw'),
  };
});

// ---- imports under test ---------------------------------------------------

import StatisticsDashboard from '../../src/components/profile/StatisticsDashboard';
import ProfileCompletionTracker from '../../src/components/profile/ProfileCompletionTracker';
import PrivacyControls from '../../src/components/profile/PrivacyControls';
import ReliabilityScoreDisplay from '../../src/components/profile/ReliabilityScoreDisplay';

// ===========================================================================
// StatisticsDashboard
// ===========================================================================
describe('StatisticsDashboard', () => {
  beforeEach(() => {
    mocks.mockProfile = { ...FAKE_PROFILE };
    mocks.mockUser = { ...FAKE_USER };
  });
  afterEach(cleanup);

  it('renders nothing when profile is null', () => {
    mocks.mockProfile = null;
    const { container } = render(<StatisticsDashboard />);
    expect(container.innerHTML).toBe('');
  });

  it('shows the heading "Your Statistics"', () => {
    render(<StatisticsDashboard />);
    expect(screen.getByText('Your Statistics')).toBeInTheDocument();
  });

  it('displays Rides Offered', () => {
    render(<StatisticsDashboard />);
    expect(screen.getByText('Rides Offered')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('displays Rides Taken', () => {
    render(<StatisticsDashboard />);
    expect(screen.getByText('Rides Taken')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays Average Rating', () => {
    render(<StatisticsDashboard />);
    expect(screen.getByText('Average Rating')).toBeInTheDocument();
    expect(screen.getByText('4.5')).toBeInTheDocument();
  });

  it('displays Total Trips as sum of offered + taken', () => {
    render(<StatisticsDashboard />);
    expect(screen.getByText('Total Trips')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('shows Member Since date', () => {
    render(<StatisticsDashboard />);
    expect(screen.getByText('Member Since')).toBeInTheDocument();
    // Jun 2024
    expect(screen.getByText(/Jun 2024/)).toBeInTheDocument();
  });

  it('shows Active Rider Badge when total rides >= 10', () => {
    mocks.mockProfile = { ...FAKE_PROFILE, total_rides_offered: 8, total_rides_taken: 5 };
    render(<StatisticsDashboard />);
    expect(screen.getByText(/Active Rider Badge Earned/)).toBeInTheDocument();
  });
});

// ===========================================================================
// ProfileCompletionTracker
// ===========================================================================
describe('ProfileCompletionTracker', () => {
  beforeEach(() => {
    mocks.mockProfile = { ...FAKE_PROFILE };
    mocks.mockUser = { ...FAKE_USER };
  });
  afterEach(cleanup);

  it('renders nothing when profile is null', () => {
    mocks.mockProfile = null;
    const { container } = render(<ProfileCompletionTracker />);
    expect(container.innerHTML).toBe('');
  });

  it('shows "Profile Complete!" when all items done', () => {
    // All items completed: photo, face_verified, phone, bio, vehicle(total_rides_offered > 0)
    mocks.mockProfile = {
      ...FAKE_PROFILE,
      profile_photo_url: 'https://img.example.com/a.jpg',
      profile_verified: true,
      phone_e164: '+447700900001',
      phone_verified: true,
      bio: 'This is a long enough bio text',
      total_rides_offered: 5,
    };
    render(<ProfileCompletionTracker />);
    expect(screen.getByText('Profile Complete!')).toBeInTheDocument();
  });

  it('shows percentage and boost message when incomplete', () => {
    mocks.mockProfile = { ...FAKE_EMPTY_PROFILE };
    render(<ProfileCompletionTracker />);
    expect(screen.getByText('0%')).toBeInTheDocument();
    expect(screen.getByText('Boost Your Visibility')).toBeInTheDocument();
  });

  it('shows incomplete items as actionable buttons', () => {
    mocks.mockProfile = {
      ...FAKE_PROFILE,
      profile_photo_url: null,
      avatar_url: null,
      profile_verified: false,
    };
    render(<ProfileCompletionTracker />);
    expect(screen.getByText('Profile Photo')).toBeInTheDocument();
  });

  it('navigates when clicking an incomplete item', () => {
    mocks.mockProfile = {
      ...FAKE_PROFILE,
      profile_photo_url: null,
      avatar_url: null,
      profile_verified: false,
    };
    render(<ProfileCompletionTracker />);
    fireEvent.click(screen.getByText('Profile Photo'));
    expect(mocks.mockNavigate).toHaveBeenCalled();
  });

  it('shows milestone unlocked when >= 50%', () => {
    // 3 of 5 completed = 60%
    mocks.mockProfile = {
      ...FAKE_PROFILE,
      profile_photo_url: 'img.jpg',
      profile_verified: true,
      phone_e164: '+447700900001',
      phone_verified: true,
      bio: 'A bio that is more than 20 chars long',
      total_rides_offered: 0,
    };
    render(<ProfileCompletionTracker />);
    expect(screen.getByText(/Milestone Unlocked/)).toBeInTheDocument();
  });

  it('displays completion count', () => {
    mocks.mockProfile = {
      ...FAKE_PROFILE,
      profile_photo_url: 'img.jpg',
      profile_verified: false,
      phone_e164: '+447700900001',
      phone_verified: true,
      bio: 'A bio that is more than 20 chars long',
      total_rides_offered: 5,
    };
    render(<ProfileCompletionTracker />);
    // 4 of 5 completed
    expect(screen.getByText('4/5 completed')).toBeInTheDocument();
  });

  it('shows "Why Complete Your Profile?" info', () => {
    mocks.mockProfile = { ...FAKE_EMPTY_PROFILE };
    render(<ProfileCompletionTracker />);
    expect(screen.getByText('Why Complete Your Profile?')).toBeInTheDocument();
  });

  it('shows 100% trust builder badges when complete', () => {
    mocks.mockProfile = {
      ...FAKE_PROFILE,
      profile_photo_url: 'img.jpg',
      profile_verified: true,
      phone_e164: '+447700900001',
      phone_verified: true,
      bio: 'A bio that is more than 20 chars long enough for sure',
      total_rides_offered: 5,
    };
    render(<ProfileCompletionTracker />);
    expect(screen.getByText('100% Trust Builder')).toBeInTheDocument();
    expect(screen.getByText('Premium Visibility')).toBeInTheDocument();
  });
});

// ===========================================================================
// PrivacyControls
// ===========================================================================
describe('PrivacyControls', () => {
  beforeEach(() => {
    mocks.mockProfile = { ...FAKE_PROFILE };
    mocks.mockUser = { ...FAKE_USER };
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  function setupMockData(data: any = null) {
    mocks.mockSupabase.from.mockImplementation(() => buildMockChain(data ? [data] : []));
  }

  it('shows loading spinner initially', () => {
    // Make the chain never resolve by returning a pending promise
    mocks.mockSupabase.from.mockImplementation(() => {
      const chain = buildMockChain([]);
      chain.maybeSingle = vi.fn().mockReturnValue(new Promise(() => {}));
      return chain;
    });
    render(<PrivacyControls />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders "Privacy Controls" heading after load', async () => {
    setupMockData({ phone_visible: true, email_visible: false, profile_searchable: true, allow_messages_from: 'anyone' });
    render(<PrivacyControls />);
    await waitFor(() => {
      expect(screen.getByText('Privacy Controls')).toBeInTheDocument();
    });
  });

  it('shows all privacy toggle labels', async () => {
    setupMockData({ phone_visible: true, email_visible: false, profile_searchable: true, allow_messages_from: 'anyone' });
    render(<PrivacyControls />);
    await waitFor(() => {
      expect(screen.getByText('Show Phone Number')).toBeInTheDocument();
    });
    expect(screen.getByText('Show Email Address')).toBeInTheDocument();
    expect(screen.getByText('Profile Searchable')).toBeInTheDocument();
    expect(screen.getByText('Who Can Message You')).toBeInTheDocument();
  });

  it('renders checkboxes for toggle settings', async () => {
    setupMockData({ phone_visible: true, email_visible: false, profile_searchable: true, allow_messages_from: 'anyone' });
    render(<PrivacyControls />);
    await waitFor(() => {
      expect(screen.getByText('Show Phone Number')).toBeInTheDocument();
    });
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(3);
  });

  it('renders messaging dropdown', async () => {
    setupMockData({ phone_visible: true, email_visible: false, profile_searchable: true, allow_messages_from: 'verified' });
    render(<PrivacyControls />);
    await waitFor(() => {
      expect(screen.getByText('Who Can Message You')).toBeInTheDocument();
    });
    const select = screen.getByRole('combobox');
    expect(select).toHaveValue('verified');
  });

  it('calls upsert when toggling phone visibility', async () => {
    setupMockData({ phone_visible: true, email_visible: false, profile_searchable: true, allow_messages_from: 'anyone' });
    render(<PrivacyControls />);
    await waitFor(() => {
      expect(screen.getByText('Show Phone Number')).toBeInTheDocument();
    });

    // Now setup for the upsert
    mocks.mockSupabase.from.mockImplementation(() => buildMockChain([]));
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(mocks.mockSupabase.from).toHaveBeenCalledWith('user_preferences');
    });
  });

  it('shows success message after updating', async () => {
    setupMockData({ phone_visible: true, email_visible: false, profile_searchable: true, allow_messages_from: 'anyone' });
    render(<PrivacyControls />);
    await waitFor(() => {
      expect(screen.getByText('Show Phone Number')).toBeInTheDocument();
    });

    mocks.mockSupabase.from.mockImplementation(() => buildMockChain([]));
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    await waitFor(() => {
      expect(screen.getByText('Privacy settings updated')).toBeInTheDocument();
    });
  });

  it('shows info note about past interactions', async () => {
    setupMockData({ phone_visible: true, email_visible: false, profile_searchable: true, allow_messages_from: 'anyone' });
    render(<PrivacyControls />);
    await waitFor(() => {
      expect(screen.getByText(/Some information may still be visible/)).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// ReliabilityScoreDisplay
// ===========================================================================
describe('ReliabilityScoreDisplay', () => {
  beforeEach(() => {
    mocks.mockProfile = { ...FAKE_PROFILE };
    mocks.mockUser = { ...FAKE_USER };
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  function setupMocks(reliabilityData: any = FAKE_RELIABILITY_DATA, restrictions: any[] = []) {
    mocks.mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'reliability_scores') return buildMockChain(reliabilityData ? [reliabilityData] : []);
      if (table === 'booking_restrictions') return buildMockChain(restrictions);
      return buildMockChain([]);
    });
  }

  it('shows loading spinner initially', () => {
    mocks.mockSupabase.from.mockImplementation(() => {
      const chain = buildMockChain([]);
      chain.maybeSingle = vi.fn().mockReturnValue(new Promise(() => {}));
      return chain;
    });
    render(<ReliabilityScoreDisplay />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows "not available" when no data', async () => {
    setupMocks(null, []);
    render(<ReliabilityScoreDisplay />);
    await waitFor(() => {
      expect(screen.getByText('Reliability data not available')).toBeInTheDocument();
    });
  });

  it('renders score and heading', async () => {
    setupMocks();
    render(<ReliabilityScoreDisplay />);
    await waitFor(() => {
      expect(screen.getByText('Reliability Score')).toBeInTheDocument();
    });
    expect(screen.getByText('85/100')).toBeInTheDocument();
  });

  it('shows ride stats grid', async () => {
    setupMocks();
    render(<ReliabilityScoreDisplay />);
    await waitFor(() => {
      expect(screen.getByText('Total Rides')).toBeInTheDocument();
    });
    expect(screen.getByText('30')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('27')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('shows completion and cancellation rates', async () => {
    setupMocks();
    render(<ReliabilityScoreDisplay />);
    await waitFor(() => {
      expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    });
    expect(screen.getByText('90.0%')).toBeInTheDocument();
    expect(screen.getByText('10.0%')).toBeInTheDocument();
  });

  it('shows grace period when active', async () => {
    setupMocks({ ...FAKE_RELIABILITY_DATA, is_in_grace_period: true, grace_rides_remaining: 3 });
    render(<ReliabilityScoreDisplay />);
    await waitFor(() => {
      expect(screen.getByText('Grace Period Active')).toBeInTheDocument();
    });
    expect(screen.getByText(/3 grace rides remaining/)).toBeInTheDocument();
  });

  it('shows warnings when count > 0', async () => {
    setupMocks({ ...FAKE_RELIABILITY_DATA, warnings_count: 2 });
    render(<ReliabilityScoreDisplay />);
    await waitFor(() => {
      expect(screen.getByText('2 Active Warnings')).toBeInTheDocument();
    });
  });

  it('shows restrictions when present', async () => {
    setupMocks(FAKE_RELIABILITY_DATA, [FAKE_RESTRICTION]);
    render(<ReliabilityScoreDisplay />);
    await waitFor(() => {
      expect(screen.getByText('Active Restrictions')).toBeInTheDocument();
    });
    expect(screen.getByText('Excessive cancellations')).toBeInTheDocument();
  });
});
