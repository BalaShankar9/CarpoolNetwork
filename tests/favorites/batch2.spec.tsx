// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { makeFavoriteDriver } from './helpers';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  user: { id: 'user-1' } as any,
  navigate: vi.fn(),
  updateFavoriteDriver: vi.fn(),
  removeFavoriteDriver: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../../src/services/favoritesService', () => ({
  updateFavoriteDriver: mocks.updateFavoriteDriver,
  removeFavoriteDriver: mocks.removeFavoriteDriver,
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Heart: s('Heart'), Star: s('Star'), Car: s('Car'), Edit2: s('Edit2'),
    Trash2: s('Trash2'), MoreVertical: s('MoreVertical'), Calendar: s('Calendar'), X: s('X'),
  };
});

import { FavoriteDriverCard } from '../../src/components/favorites/FavoriteDriverCard';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'user-1' };
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(cleanup);

function renderCard(overrides?: any, props?: any) {
  const favorite = makeFavoriteDriver(overrides);
  return { ...render(<FavoriteDriverCard favorite={favorite} {...props} />), favorite };
}

describe('FavoriteDriverCard', () => {
  /* ═══════ Display ═══════ */
  it('shows driver full name when no nickname', () => {
    renderCard({ nickname: '' });
    expect(screen.getByText('Jane Smith')).toBeTruthy();
  });

  it('shows nickname as display name when set', () => {
    renderCard({ nickname: 'Janie' });
    expect(screen.getByText('Janie')).toBeTruthy();
  });

  it('shows real name below nickname', () => {
    renderCard({ nickname: 'Janie', driver: { full_name: 'Jane Smith', average_rating: 4.8 } });
    expect(screen.getByText('Jane Smith')).toBeTruthy();
  });

  it('shows driver avatar image when available', () => {
    renderCard();
    const img = document.querySelector('img');
    expect(img).toBeTruthy();
    expect(img!.src).toContain('example.com/photo.jpg');
  });

  it('shows Car icon placeholder when no avatar', () => {
    renderCard({ driver: { full_name: 'Jane', profile_photo_url: null, avatar_url: null } });
    expect(document.querySelector('[data-testid="icon-Car"]')).toBeTruthy();
  });

  it('shows driver rating', () => {
    renderCard();
    expect(screen.getByText('4.8')).toBeTruthy();
  });

  it('shows ride count', () => {
    renderCard({ ride_count: 5 });
    expect(screen.getByText('5 rides together')).toBeTruthy();
  });

  it('shows notes when present', () => {
    renderCard({ notes: 'Great driver, very punctual' });
    expect(screen.getByText('Great driver, very punctual')).toBeTruthy();
  });

  it('does not show notes section when empty', () => {
    renderCard({ notes: '' });
    expect(screen.queryByText('Great driver')).toBeFalsy();
  });

  it('shows last ride date', () => {
    renderCard({ last_ride_at: '2025-06-10T10:00:00Z' });
    expect(screen.getByText(/Last ride:/)).toBeTruthy();
  });

  it('shows Find Their Rides button', () => {
    renderCard();
    expect(screen.getByText('Find Their Rides')).toBeTruthy();
  });

  /* ═══════ Navigation ═══════ */
  it('navigates to find-rides with driver filter on button click', () => {
    renderCard({ driver_id: 'driver-1' });
    fireEvent.click(screen.getByText('Find Their Rides'));
    expect(mocks.navigate).toHaveBeenCalledWith('/find-rides?driver=driver-1');
  });

  /* ═══════ Menu ═══════ */
  it('shows menu when MoreVertical is clicked', () => {
    renderCard();
    const menuBtn = document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!;
    fireEvent.click(menuBtn);
    expect(screen.getByText('Edit Details')).toBeTruthy();
    expect(screen.getByText('Remove')).toBeTruthy();
  });

  /* ═══════ Remove ═══════ */
  it('calls removeFavoriteDriver when Remove is clicked', async () => {
    mocks.removeFavoriteDriver.mockResolvedValue(true);
    const onRemove = vi.fn();
    renderCard({ driver_id: 'driver-1' }, { onRemove });
    // Open menu
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Remove'));
    await waitFor(() => {
      expect(mocks.removeFavoriteDriver).toHaveBeenCalledWith('user-1', 'driver-1');
    });
    await waitFor(() => expect(onRemove).toHaveBeenCalled());
  });

  it('does not remove when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderCard();
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Remove'));
    expect(mocks.removeFavoriteDriver).not.toHaveBeenCalled();
  });

  /* ═══════ Edit modal ═══════ */
  it('opens edit modal from menu', () => {
    renderCard();
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Edit Details'));
    expect(screen.getByText('Edit Favorite')).toBeTruthy();
  });

  it('shows nickname and notes inputs in edit modal', () => {
    renderCard({ nickname: 'Janie', notes: 'nice driver' });
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Edit Details'));
    const inputs = document.querySelectorAll('input');
    const textarea = document.querySelector('textarea');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
    expect(textarea).toBeTruthy();
  });

  it('calls updateFavoriteDriver on Save', async () => {
    mocks.updateFavoriteDriver.mockResolvedValue(true);
    const onUpdate = vi.fn();
    renderCard({ id: 'fav-1', nickname: 'Janie', notes: 'nice' }, { onUpdate });
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Edit Details'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(mocks.updateFavoriteDriver).toHaveBeenCalledWith('fav-1', { nickname: 'Janie', notes: 'nice' });
    });
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
  });

  it('closes edit modal on Cancel', () => {
    renderCard();
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Edit Details'));
    expect(screen.getByText('Edit Favorite')).toBeTruthy();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Edit Favorite')).toBeFalsy();
  });

  it('shows Saving... while save is in progress', async () => {
    mocks.updateFavoriteDriver.mockReturnValue(new Promise(() => {}));
    renderCard();
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Edit Details'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByText('Saving...')).toBeTruthy());
  });
});
