// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  user: { id: 'user-1', email: 'test@test.com' } as any,
  isDriverFavorited: vi.fn(),
  addFavoriteDriver: vi.fn(),
  removeFavoriteDriver: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('../../src/services/favoritesService', () => ({
  isDriverFavorited: mocks.isDriverFavorited,
  addFavoriteDriver: mocks.addFavoriteDriver,
  removeFavoriteDriver: mocks.removeFavoriteDriver,
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Heart: s('Heart'), HeartOff: s('HeartOff'), Loader2: s('Loader2'),
  };
});

import { FavoriteButton } from '../../src/components/favorites/FavoriteButton';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'user-1', email: 'test@test.com' };
});
afterEach(cleanup);

/* helper: render and wait for loading to finish */
async function renderLoaded(props: Partial<any> = {}) {
  const defaultProps = { driverId: 'driver-1', driverName: 'Jane', ...props };
  mocks.isDriverFavorited.mockResolvedValue(props._favorited ?? false);
  const result = render(<FavoriteButton {...defaultProps} />);
  // Wait for loading spinner to disappear (loading state resolves)
  await waitFor(() => {
    expect(mocks.isDriverFavorited).toHaveBeenCalled();
  });
  // small wait for state update
  await waitFor(() => {
    const spinners = document.querySelectorAll('[data-testid="icon-Loader2"]');
    // At most the spinner in the button itself; after loading it should show Heart
    const heart = document.querySelector('[data-testid="icon-Heart"]');
    expect(heart || spinners.length === 0).toBeTruthy();
  });
  return result;
}

describe('FavoriteButton', () => {
  /* ═══════ Loading ═══════ */
  it('shows loading spinner initially', () => {
    mocks.isDriverFavorited.mockReturnValue(new Promise(() => {}));
    render(<FavoriteButton driverId="driver-1" />);
    expect(document.querySelector('[data-testid="icon-Loader2"]')).toBeTruthy();
  });

  it('calls isDriverFavorited on mount', async () => {
    await renderLoaded();
    expect(mocks.isDriverFavorited).toHaveBeenCalledWith('user-1', 'driver-1');
  });

  it('does not call service when user is null', () => {
    mocks.user = null;
    mocks.isDriverFavorited.mockResolvedValue(false);
    render(<FavoriteButton driverId="driver-1" />);
    expect(mocks.isDriverFavorited).not.toHaveBeenCalled();
  });

  /* ═══════ Own profile ═══════ */
  it('returns null when driverId matches user id', () => {
    mocks.isDriverFavorited.mockResolvedValue(false);
    const { container } = render(<FavoriteButton driverId="user-1" />);
    expect(container.innerHTML).toBe('');
  });

  /* ═══════ Not favorited state ═══════ */
  it('shows Heart icon when not favorited', async () => {
    await renderLoaded({ _favorited: false });
    expect(document.querySelector('[data-testid="icon-Heart"]')).toBeTruthy();
  });

  it('has title "Add to favorites" when not favorited', async () => {
    await renderLoaded({ _favorited: false });
    expect(screen.getByTitle('Add to favorites')).toBeTruthy();
  });

  it('shows "Favorite" label when showLabel is true and not favorited', async () => {
    await renderLoaded({ _favorited: false, showLabel: true });
    expect(screen.getByText('Favorite')).toBeTruthy();
  });

  /* ═══════ Favorited state ═══════ */
  it('has title "Remove from favorites" when favorited', async () => {
    await renderLoaded({ _favorited: true });
    expect(screen.getByTitle('Remove from favorites')).toBeTruthy();
  });

  it('shows "Favorited" label when showLabel is true and favorited', async () => {
    await renderLoaded({ _favorited: true, showLabel: true });
    expect(screen.getByText('Favorited')).toBeTruthy();
  });

  it('applies red background class when favorited', async () => {
    await renderLoaded({ _favorited: true });
    const btn = screen.getByTitle('Remove from favorites');
    expect(btn.className).toContain('bg-red-100');
  });

  /* ═══════ Toggle to add ═══════ */
  it('calls addFavoriteDriver when toggling to favorite', async () => {
    mocks.addFavoriteDriver.mockResolvedValue(true);
    await renderLoaded({ _favorited: false });
    const btn = screen.getByTitle('Add to favorites');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(mocks.addFavoriteDriver).toHaveBeenCalledWith('user-1', 'driver-1');
    });
  });

  it('calls onToggle(true) after adding favorite', async () => {
    mocks.addFavoriteDriver.mockResolvedValue(true);
    const onToggle = vi.fn();
    await renderLoaded({ _favorited: false, onToggle });
    fireEvent.click(screen.getByTitle('Add to favorites'));
    await waitFor(() => expect(onToggle).toHaveBeenCalledWith(true));
  });

  /* ═══════ Toggle to remove ═══════ */
  it('calls removeFavoriteDriver when toggling off', async () => {
    mocks.removeFavoriteDriver.mockResolvedValue(true);
    await renderLoaded({ _favorited: true });
    const btn = screen.getByTitle('Remove from favorites');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(mocks.removeFavoriteDriver).toHaveBeenCalledWith('user-1', 'driver-1');
    });
  });

  it('calls onToggle(false) after removing favorite', async () => {
    mocks.removeFavoriteDriver.mockResolvedValue(true);
    const onToggle = vi.fn();
    await renderLoaded({ _favorited: true, onToggle });
    fireEvent.click(screen.getByTitle('Remove from favorites'));
    await waitFor(() => expect(onToggle).toHaveBeenCalledWith(false));
  });

  /* ═══════ Sizes ═══════ */
  it('applies sm size class', async () => {
    await renderLoaded({ _favorited: false, size: 'sm' });
    const btn = screen.getByTitle('Add to favorites');
    expect(btn.className).toContain('p-1.5');
  });

  it('applies lg size class', async () => {
    await renderLoaded({ _favorited: false, size: 'lg' });
    const btn = screen.getByTitle('Add to favorites');
    expect(btn.className).toContain('p-3');
  });

  it('applies default md size class', async () => {
    await renderLoaded({ _favorited: false });
    const btn = screen.getByTitle('Add to favorites');
    expect(btn.className).toContain('p-2');
  });
});
