// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { makeSavedRoute } from './helpers';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  user: { id: 'user-1' } as any,
  navigate: vi.fn(),
  updateSavedRoute: vi.fn(),
  deleteSavedRoute: vi.fn(),
}));

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.user }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock('../../src/services/favoritesService', () => ({
  updateSavedRoute: mocks.updateSavedRoute,
  deleteSavedRoute: mocks.deleteSavedRoute,
}));

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    MapPin: s('MapPin'), Navigation: s('Navigation'), Star: s('Star'),
    Edit2: s('Edit2'), Trash2: s('Trash2'), MoreVertical: s('MoreVertical'),
    Clock: s('Clock'), Calendar: s('Calendar'), Search: s('Search'), X: s('X'),
  };
});

import { SavedRouteCard } from '../../src/components/favorites/SavedRouteCard';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: 'user-1' };
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});
afterEach(cleanup);

function renderCard(overrides?: any, props?: any) {
  const route = makeSavedRoute(overrides);
  return { ...render(<SavedRouteCard route={route} {...props} />), route };
}

describe('SavedRouteCard', () => {
  /* ═══════ Display ═══════ */
  it('shows route name', () => {
    renderCard({ name: 'Daily Commute' });
    expect(screen.getByText('Daily Commute')).toBeTruthy();
  });

  it('shows Default badge when is_default is true', () => {
    renderCard({ is_default: true });
    expect(screen.getByText('Default')).toBeTruthy();
  });

  it('does not show Default badge when is_default is false', () => {
    renderCard({ is_default: false });
    expect(screen.queryByText('Default')).toBeFalsy();
  });

  it('shows origin address', () => {
    renderCard({ origin: '123 Home Street, London' });
    expect(screen.getByText('123 Home Street, London')).toBeTruthy();
  });

  it('shows destination address', () => {
    renderCard({ destination: '456 Office Road, London' });
    expect(screen.getByText('456 Office Road, London')).toBeTruthy();
  });

  it('shows From and To labels', () => {
    renderCard();
    expect(screen.getByText('From')).toBeTruthy();
    expect(screen.getByText('To')).toBeTruthy();
  });

  it('shows preferred departure time', () => {
    renderCard({ preferred_departure_time: '08:30' });
    expect(screen.getByText('08:30')).toBeTruthy();
  });

  it('shows preferred days', () => {
    renderCard({ preferred_days: ['Mon', 'Wed', 'Fri'] });
    expect(screen.getByText('Mon, Wed, Fri')).toBeTruthy();
  });

  it('shows Daily when all 7 days selected', () => {
    renderCard({ preferred_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] });
    expect(screen.getByText('Daily')).toBeTruthy();
  });

  it('shows use count', () => {
    renderCard({ use_count: 12 });
    expect(screen.getByText('Used 12 times')).toBeTruthy();
  });

  it('shows last used date', () => {
    renderCard({ last_used_at: '2025-06-08T08:30:00Z' });
    expect(screen.getByText(/Last:/)).toBeTruthy();
  });

  it('shows Search Rides button', () => {
    renderCard();
    expect(screen.getByText('Search Rides')).toBeTruthy();
  });

  /* ═══════ Search / Navigation ═══════ */
  it('navigates to find-rides with route params on search', () => {
    renderCard({ origin: 'Home', destination: 'Office' });
    fireEvent.click(screen.getByText('Search Rides'));
    expect(mocks.navigate).toHaveBeenCalledWith('/find-rides?origin=Home&destination=Office');
  });

  it('calls onQuickSearch if provided instead of navigating', () => {
    const onQuickSearch = vi.fn();
    const { route } = renderCard({}, { onQuickSearch });
    fireEvent.click(screen.getByText('Search Rides'));
    expect(onQuickSearch).toHaveBeenCalledWith(route);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  /* ═══════ Menu ═══════ */
  it('opens menu on MoreVertical click', () => {
    renderCard();
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    expect(screen.getByText('Edit Route')).toBeTruthy();
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  /* ═══════ Delete ═══════ */
  it('calls deleteSavedRoute on Delete', async () => {
    mocks.deleteSavedRoute.mockResolvedValue(true);
    const onDelete = vi.fn();
    renderCard({ id: 'route-1' }, { onDelete });
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Delete'));
    await waitFor(() => {
      expect(mocks.deleteSavedRoute).toHaveBeenCalledWith('route-1');
    });
    await waitFor(() => expect(onDelete).toHaveBeenCalled());
  });

  it('does not delete when confirm is cancelled', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderCard();
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Delete'));
    expect(mocks.deleteSavedRoute).not.toHaveBeenCalled();
  });

  /* ═══════ Edit modal ═══════ */
  it('opens edit modal from menu', () => {
    renderCard();
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Edit Route'));
    expect(screen.getAllByText('Edit Route').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Route Name')).toBeTruthy();
  });

  it('shows route name input pre-filled', () => {
    renderCard({ name: 'Daily Commute' });
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Edit Route'));
    const input = screen.getByPlaceholderText('e.g., Daily Commute') as HTMLInputElement;
    expect(input.value).toBe('Daily Commute');
  });

  it('shows day toggle buttons in edit modal', () => {
    renderCard();
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Edit Route'));
    for (const day of ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']) {
      expect(screen.getAllByText(day).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('shows default route checkbox in edit modal', () => {
    renderCard();
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Edit Route'));
    expect(screen.getByText('Set as default route')).toBeTruthy();
  });

  it('calls updateSavedRoute on Save', async () => {
    mocks.updateSavedRoute.mockResolvedValue(true);
    const onUpdate = vi.fn();
    renderCard({ id: 'route-1', name: 'Commute', preferred_departure_time: '08:30', preferred_days: ['Mon'], is_default: false }, { onUpdate });
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Edit Route'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => {
      expect(mocks.updateSavedRoute).toHaveBeenCalledWith('route-1', 'user-1', expect.objectContaining({ name: 'Commute' }));
    });
    await waitFor(() => expect(onUpdate).toHaveBeenCalled());
  });

  it('closes edit modal on Cancel', () => {
    renderCard();
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Edit Route'));
    expect(screen.getByText('Route Name')).toBeTruthy();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Route Name')).toBeFalsy();
  });

  it('shows Saving... during save', async () => {
    mocks.updateSavedRoute.mockReturnValue(new Promise(() => {}));
    renderCard();
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Edit Route'));
    fireEvent.click(screen.getByText('Save'));
    await waitFor(() => expect(screen.getByText('Saving...')).toBeTruthy());
  });

  it('disables Save when name is empty', () => {
    renderCard({ name: '' });
    fireEvent.click(document.querySelector('[data-testid="icon-MoreVertical"]')!.closest('button')!);
    fireEvent.click(screen.getByText('Edit Route'));
    const saveBtn = screen.getByText('Save') as HTMLButtonElement;
    expect(saveBtn.disabled).toBe(true);
  });

  /* ═══════ No optional fields ═══════ */
  it('does not show time badge when no preferred_departure_time', () => {
    renderCard({ preferred_departure_time: null });
    expect(document.querySelector('[data-testid="icon-Clock"]')).toBeFalsy();
  });

  it('does not show days badge when no preferred_days', () => {
    renderCard({ preferred_days: null });
    // Calendar icon should not appear in preferences area
    // (it may appear in the edit modal if opened, but not in the card body)
    const calendarIcons = document.querySelectorAll('[data-testid="icon-Calendar"]');
    expect(calendarIcons.length).toBe(0);
  });
});
