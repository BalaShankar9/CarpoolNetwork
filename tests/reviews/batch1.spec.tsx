// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  supabase: null as any,
}));

vi.mock('../../src/lib/supabase', () => ({
  get supabase() { return mocks.supabase; },
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Star: s('Star'), ThumbsUp: s('ThumbsUp'), MessageSquare: s('MessageSquare'),
    Calendar: s('Calendar'), Car: s('Car'), User: s('User'),
    TrendingUp: s('TrendingUp'), TrendingDown: s('TrendingDown'), Minus: s('Minus'),
  };
});

vi.mock('../../src/components/shared/ClickableUserProfile', () => ({
  default: ({ user }: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'clickable-profile' }, user.full_name);
  },
}));

import ReviewsDisplay from '../../src/components/reviews/ReviewsDisplay';

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

/* ─── helpers ─── */
function buildChain(data: any[], error: any = null) {
  const chain: any = {};
  const self = () => chain;
  chain.from = vi.fn(self);
  chain.select = vi.fn(self);
  chain.eq = vi.fn(self);
  chain.order = vi.fn(self);
  chain.then = (resolve: any) => resolve({ data, error });
  return chain;
}

function makeReview(overrides?: Partial<any>) {
  return {
    id: 'r-1',
    booking_id: 'b-1',
    ride_id: 'ride-1',
    reviewer_id: 'rev-1',
    reviewee_id: 'user-1',
    overall_rating: 5,
    punctuality_rating: 4,
    cleanliness_rating: 5,
    communication_rating: 4,
    safety_rating: 5,
    comfort_rating: 4,
    review_text: 'Great ride, very friendly driver!',
    would_ride_again: true,
    created_at: '2024-06-15T12:00:00Z',
    reviewer: { id: 'rev-1', full_name: 'Bob Smith', avatar_url: 'https://example.com/bob.jpg', profile_photo_url: null },
    ride: { origin: 'London', destination: 'Oxford', departure_time: '2024-06-14T08:00:00Z' },
    ...overrides,
  };
}

/* ═══════════════════════════════════════
   Loading & Empty states
   ═══════════════════════════════════════ */
describe('ReviewsDisplay – states', () => {
  it('shows loading spinner initially', () => {
    const chain: any = {};
    const self = () => chain;
    chain.from = vi.fn(self);
    chain.select = vi.fn(self);
    chain.eq = vi.fn(self);
    chain.order = vi.fn(self);
    chain.then = () => new Promise(() => {});
    mocks.supabase = chain;
    render(<ReviewsDisplay userId="user-1" />);
    expect(document.querySelector('.animate-spin')).toBeTruthy();
  });

  it('shows No Reviews Yet for empty data', async () => {
    mocks.supabase = buildChain([]);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('No Reviews Yet')).toBeTruthy();
    });
  });

  it('shows own profile text when isOwnProfile', async () => {
    mocks.supabase = buildChain([]);
    render(<ReviewsDisplay userId="user-1" isOwnProfile={true} />);
    await waitFor(() => {
      expect(screen.getByText(/haven't received any reviews yet/)).toBeTruthy();
    });
  });

  it('shows other user text when not own profile', async () => {
    mocks.supabase = buildChain([]);
    render(<ReviewsDisplay userId="user-1" isOwnProfile={false} />);
    await waitFor(() => {
      expect(screen.getByText(/This user hasn't received any reviews yet/)).toBeTruthy();
    });
  });
});

/* ═══════════════════════════════════════
   Stats overview
   ═══════════════════════════════════════ */
describe('ReviewsDisplay – stats', () => {
  it('shows average rating', async () => {
    const reviews = [makeReview({ overall_rating: 5 }), makeReview({ id: 'r-2', overall_rating: 3 })];
    mocks.supabase = buildChain(reviews);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getAllByText('4.0').length).toBeGreaterThan(0);
    });
  });

  it('shows total review count', async () => {
    const reviews = [makeReview(), makeReview({ id: 'r-2' })];
    mocks.supabase = buildChain(reviews);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('2 reviews')).toBeTruthy();
    });
  });

  it('shows would ride again percentage', async () => {
    const reviews = [
      makeReview({ would_ride_again: true }),
      makeReview({ id: 'r-2', would_ride_again: false }),
    ];
    mocks.supabase = buildChain(reviews);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('50%')).toBeTruthy();
      expect(screen.getByText('would ride again')).toBeTruthy();
    });
  });

  it('shows Category Ratings heading', async () => {
    mocks.supabase = buildChain([makeReview()]);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('Category Ratings')).toBeTruthy();
    });
  });

  it('shows category labels', async () => {
    mocks.supabase = buildChain([makeReview()]);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getAllByText('Punctuality').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Communication').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Safety').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Comfort').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Cleanliness').length).toBeGreaterThan(0);
    });
  });
});

/* ═══════════════════════════════════════
   Review items
   ═══════════════════════════════════════ */
describe('ReviewsDisplay – review items', () => {
  it('shows reviewer name', async () => {
    mocks.supabase = buildChain([makeReview()]);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getAllByText('Bob Smith').length).toBeGreaterThan(0);
    });
  });

  it('shows Anonymous when no reviewer', async () => {
    mocks.supabase = buildChain([makeReview({ reviewer: null })]);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('Anonymous')).toBeTruthy();
    });
  });

  it('shows review text', async () => {
    mocks.supabase = buildChain([makeReview()]);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('Great ride, very friendly driver!')).toBeTruthy();
    });
  });

  it('shows ride route', async () => {
    mocks.supabase = buildChain([makeReview()]);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText(/London.*→.*Oxford/)).toBeTruthy();
    });
  });

  it('shows "Would ride again" for positive reviews', async () => {
    mocks.supabase = buildChain([makeReview({ would_ride_again: true })]);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('Would ride again')).toBeTruthy();
    });
  });

  it('shows "Would not ride again" for negative reviews', async () => {
    mocks.supabase = buildChain([makeReview({ would_ride_again: false })]);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('Would not ride again')).toBeTruthy();
    });
  });

  it('shows ClickableUserProfile when reviewer exists', async () => {
    mocks.supabase = buildChain([makeReview()]);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(document.querySelector('[data-testid="clickable-profile"]')).toBeTruthy();
    });
  });

  it('shows detailed category ratings on review card', async () => {
    mocks.supabase = buildChain([makeReview({ punctuality_rating: 4 })]);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      // Category labels appear both in stats section and on review card
      expect(screen.getAllByText('Punctuality').length).toBeGreaterThanOrEqual(2);
    });
  });
});

/* ═══════════════════════════════════════
   Filters & Sort
   ═══════════════════════════════════════ */
describe('ReviewsDisplay – filters & sort', () => {
  it('shows filter buttons', async () => {
    mocks.supabase = buildChain([makeReview()]);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('All')).toBeTruthy();
      expect(screen.getByText('★ 4+')).toBeTruthy();
      expect(screen.getByText('★ 2-')).toBeTruthy();
    });
  });

  it('shows sort dropdown', async () => {
    mocks.supabase = buildChain([makeReview()]);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      const select = document.querySelector('select') as HTMLSelectElement;
      expect(select).toBeTruthy();
    });
  });

  it('filters to positive reviews (4+)', async () => {
    const reviews = [
      makeReview({ id: 'r-1', overall_rating: 5, review_text: 'Great!' }),
      makeReview({ id: 'r-2', overall_rating: 2, review_text: 'Meh' }),
    ];
    mocks.supabase = buildChain(reviews);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('Great!')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('★ 4+'));
    expect(screen.getByText('Great!')).toBeTruthy();
    expect(screen.queryByText('Meh')).toBeFalsy();
  });

  it('filters to negative reviews (2-)', async () => {
    const reviews = [
      makeReview({ id: 'r-1', overall_rating: 5, review_text: 'Great!' }),
      makeReview({ id: 'r-2', overall_rating: 2, review_text: 'Meh' }),
    ];
    mocks.supabase = buildChain(reviews);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('Meh')).toBeTruthy();
    });
    fireEvent.click(screen.getByText('★ 2-'));
    expect(screen.getByText('Meh')).toBeTruthy();
    expect(screen.queryByText('Great!')).toBeFalsy();
  });

  it('sorts by highest rated', async () => {
    const reviews = [
      makeReview({ id: 'r-1', overall_rating: 3, review_text: 'Okay', created_at: '2024-06-15T12:00:00Z' }),
      makeReview({ id: 'r-2', overall_rating: 5, review_text: 'Amazing', created_at: '2024-06-14T12:00:00Z' }),
    ];
    mocks.supabase = buildChain(reviews);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('Okay')).toBeTruthy();
    });
    // Change sort to highest
    fireEvent.change(document.querySelector('select')!, { target: { value: 'highest' } });
    // After sort, first review card should contain "Amazing" (rating 5)
    const cards = document.querySelectorAll('.bg-white.rounded-xl.p-6.border');
    // Skip the stats card - review cards contain review text
    const reviewCards = Array.from(cards).filter(c => c.textContent?.includes('Amazing') || c.textContent?.includes('Okay'));
    expect(reviewCards[0]?.textContent).toContain('Amazing');
  });

  it('sorts by lowest rated', async () => {
    const reviews = [
      makeReview({ id: 'r-1', overall_rating: 5, review_text: 'Amazing', created_at: '2024-06-15T12:00:00Z' }),
      makeReview({ id: 'r-2', overall_rating: 2, review_text: 'Poor', created_at: '2024-06-14T12:00:00Z' }),
    ];
    mocks.supabase = buildChain(reviews);
    render(<ReviewsDisplay userId="user-1" />);
    await waitFor(() => {
      expect(screen.getByText('Amazing')).toBeTruthy();
    });
    fireEvent.change(document.querySelector('select')!, { target: { value: 'lowest' } });
    const cards = document.querySelectorAll('.bg-white.rounded-xl.p-6.border');
    const reviewCards = Array.from(cards).filter(c => c.textContent?.includes('Amazing') || c.textContent?.includes('Poor'));
    expect(reviewCards[0]?.textContent).toContain('Poor');
  });
});
