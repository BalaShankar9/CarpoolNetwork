// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock modules before imports
vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { 
      id: 'user-1', 
      full_name: 'Test User',
      profile_photo_url: 'https://example.com/photo.jpg',
      avatar_url: 'https://example.com/avatar.jpg',
      average_rating: 4.5,
      total_rides_offered: 10,
      total_rides_taken: 5,
      email: 'test@example.com',
      created_at: '2024-01-01T00:00:00Z',
      bio: 'Test bio',
    },
    isProfileComplete: true,
    profileMissingFields: [],
    loading: false,
    updateProfile: vi.fn().mockResolvedValue({ error: null }),
  }),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
  },
}));

vi.mock('../src/services/storageService', () => ({
  getPublicUrlSync: vi.fn((path) => `https://example.com/${path}`),
  uploadProfilePhoto: vi.fn(),
}));

vi.mock('../src/services/faceDetection', () => ({
  validateProfilePhoto: vi.fn().mockResolvedValue({ valid: true, message: '' }),
}));

// Mock all profile subcomponents
vi.mock('../src/components/profile/ProfileCompletionTracker', () => ({
  default: () => <div data-testid="profile-completion-tracker">ProfileCompletionTracker</div>,
}));
vi.mock('../src/components/profile/EmergencyContactsManager', () => ({
  default: () => <div data-testid="emergency-contacts">EmergencyContactsManager</div>,
}));
vi.mock('../src/components/profile/TrustScoreVisualization', () => ({
  default: () => <div data-testid="trust-score">TrustScoreVisualization</div>,
}));
vi.mock('../src/components/profile/ReviewsDisplay', () => ({
  default: () => <div data-testid="reviews">ReviewsDisplay</div>,
}));
vi.mock('../src/components/profile/PrivacyControls', () => ({
  default: () => <div data-testid="privacy-controls">PrivacyControls</div>,
}));
vi.mock('../src/components/profile/StatisticsDashboard', () => ({
  default: () => <div data-testid="stats-dashboard">StatisticsDashboard</div>,
}));
vi.mock('../src/components/profile/DocumentUploadCenter', () => ({
  default: () => <div data-testid="document-upload">DocumentUploadCenter</div>,
}));
vi.mock('../src/components/profile/RideAnalyticsDashboard', () => ({
  default: () => <div data-testid="ride-analytics">RideAnalyticsDashboard</div>,
}));
vi.mock('../src/components/social/FriendsManager', () => ({
  default: () => <div data-testid="friends-manager">FriendsManager</div>,
}));
vi.mock('../src/components/gamification/AchievementsBadges', () => ({
  default: () => <div data-testid="achievements">AchievementsBadges</div>,
}));
vi.mock('../src/components/profile/ReliabilityScoreDisplay', () => ({
  default: () => <div data-testid="reliability-score">ReliabilityScoreDisplay</div>,
}));
vi.mock('../src/components/profile/VehicleManager', () => ({
  default: () => <div data-testid="vehicle-manager">VehicleManager</div>,
}));

describe('Profile Page Tabs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderProfile = (initialRoute = '/profile') => {
    return import('../src/pages/Profile').then(({ default: Profile }) => {
      return render(
        <MemoryRouter initialEntries={[initialRoute]}>
          <Profile />
        </MemoryRouter>
      );
    });
  };

  it('renders with Overview tab by default', async () => {
    await renderProfile();
    
    // Check tabs exist
    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /vehicles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /safety/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /privacy/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stats/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /social/i })).toBeInTheDocument();
    
    // Overview tab content should be visible
    expect(screen.getByTestId('profile-completion-tracker')).toBeInTheDocument();
    expect(screen.getByTestId('reliability-score')).toBeInTheDocument();
  });

  it('switches to Vehicles tab when clicked', async () => {
    await renderProfile();
    
    const vehiclesTab = screen.getByRole('button', { name: /vehicles/i });
    fireEvent.click(vehiclesTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('vehicle-manager')).toBeInTheDocument();
    });
  });

  it('switches to Safety tab when clicked', async () => {
    await renderProfile();
    
    const safetyTab = screen.getByRole('button', { name: /safety/i });
    fireEvent.click(safetyTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('document-upload')).toBeInTheDocument();
      expect(screen.getByTestId('emergency-contacts')).toBeInTheDocument();
    });
  });

  it('switches to Privacy tab when clicked', async () => {
    await renderProfile();
    
    const privacyTab = screen.getByRole('button', { name: /privacy/i });
    fireEvent.click(privacyTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('privacy-controls')).toBeInTheDocument();
    });
  });

  it('switches to Stats tab when clicked', async () => {
    await renderProfile();
    
    const statsTab = screen.getByRole('button', { name: /stats/i });
    fireEvent.click(statsTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('stats-dashboard')).toBeInTheDocument();
      expect(screen.getByTestId('ride-analytics')).toBeInTheDocument();
    });
  });

  it('switches to Social tab when clicked', async () => {
    await renderProfile();
    
    const socialTab = screen.getByRole('button', { name: /social/i });
    fireEvent.click(socialTab);
    
    await waitFor(() => {
      expect(screen.getByTestId('friends-manager')).toBeInTheDocument();
    });
  });

  it('shows user name in header', async () => {
    await renderProfile();
    
    expect(screen.getByText('Test User')).toBeInTheDocument();
  });

  it('has edit profile button that opens modal', async () => {
    await renderProfile();
    
    const editButton = screen.getByTitle('Edit Profile');
    fireEvent.click(editButton);
    
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /edit profile/i })).toBeInTheDocument();
    });
  });

  it('does not have infinite scroll - content is paginated by tabs', async () => {
    await renderProfile();
    
    // Overview tab should not show vehicles, stats, friends, etc.
    // Those are in different tabs
    expect(screen.queryByTestId('vehicle-manager')).not.toBeInTheDocument();
    expect(screen.queryByTestId('friends-manager')).not.toBeInTheDocument();
    expect(screen.queryByTestId('stats-dashboard')).not.toBeInTheDocument();
  });
});
