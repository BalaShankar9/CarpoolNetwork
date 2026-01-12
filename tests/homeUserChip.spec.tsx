// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock contexts
vi.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
    profile: { 
      id: 'user-1', 
      full_name: 'John Doe',
      profile_photo_url: 'https://example.com/photo.jpg',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    loading: false,
    isProfileComplete: true,
  }),
}));

vi.mock('../src/contexts/RidesContext', () => ({
  useRides: () => ({
    activeRide: null,
    userBookings: [],
    loading: false,
  }),
}));

vi.mock('../src/contexts/NotificationsContext', () => ({
  useNotifications: () => ({
    unreadCount: 0,
  }),
}));

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    })),
  },
}));

vi.mock('../src/services/storageService', () => ({
  getPublicUrlSync: vi.fn((path) => `https://example.com/${path}`),
}));

describe('Home Page UserChip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockClear();
  });

  const renderHome = () => {
    return import('../src/pages/Home').then(({ default: Home }) => {
      return render(
        <MemoryRouter>
          <Home />
        </MemoryRouter>
      );
    });
  };

  it('displays the user name', async () => {
    await renderHome();
    
    expect(screen.getByText(/John/i)).toBeInTheDocument();
  });

  it('displays avatar image', async () => {
    await renderHome();
    
    const avatars = screen.getAllByRole('img', { name: /john/i });
    expect(avatars.length).toBeGreaterThan(0);
  });

  it('navigates to profile when user chip is clicked', async () => {
    await renderHome();
    
    // Find the clickable area - it contains the name
    const buttons = screen.getAllByRole('button');
    const userChipButton = buttons.find(btn => btn.textContent?.includes('John'));
    expect(userChipButton).toBeDefined();
    if (userChipButton) {
      fireEvent.click(userChipButton);
      expect(mockNavigate).toHaveBeenCalledWith('/profile');
    }
  });

  it('shows welcome message with first name', async () => {
    await renderHome();
    
    // Should show "Hello, John" or similar
    expect(screen.getByText(/Hello,/i)).toBeInTheDocument();
    expect(screen.getByText(/John/i)).toBeInTheDocument();
  });
});
