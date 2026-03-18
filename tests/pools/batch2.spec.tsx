/**
 * Pools module — Batch 2
 * PoolMembersList (14 tests)
 * PoolMemberAvatars (3 tests)
 * PoolSchedule (12 tests)
 * PoolScheduleCompact (2 tests)
 * ≈ 31 tests
 */
// @vitest-environment jsdom

import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';

/* ------------------------------------------------------------------ */
/*  vi.hoisted mocks                                                   */
/* ------------------------------------------------------------------ */

const mocks = vi.hoisted(() => {
  const stub = (name: string) => {
    const Comp = (p: any) => <span data-testid={`icon-${name}`} {...p} />;
    Comp.displayName = name;
    return Comp;
  };

  return {
    Users: stub('Users'),
    Crown: stub('Crown'),
    Car: stub('Car'),
    Star: stub('Star'),
    MoreVertical: stub('MoreVertical'),
    UserMinus: stub('UserMinus'),
    Shield: stub('Shield'),
    Check: stub('Check'),
    Calendar: stub('Calendar'),
    Clock: stub('Clock'),
    Plus: stub('Plus'),
    Trash2: stub('Trash2'),
    User: stub('User'),
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  Users: mocks.Users,
  Crown: mocks.Crown,
  Car: mocks.Car,
  Star: mocks.Star,
  MoreVertical: mocks.MoreVertical,
  UserMinus: mocks.UserMinus,
  Shield: mocks.Shield,
  Check: mocks.Check,
  Calendar: mocks.Calendar,
  Clock: mocks.Clock,
  Plus: mocks.Plus,
  Trash2: mocks.Trash2,
  User: mocks.User,
}));

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                              */
/* ------------------------------------------------------------------ */

import { PoolMembersList, PoolMemberAvatars } from '../../src/components/pools/PoolMembersList';
import { PoolSchedule, PoolScheduleCompact } from '../../src/components/pools/PoolSchedule';
import {
  FAKE_USER_ID,
  FAKE_OTHER_USER_ID,
  FAKE_MEMBERS,
  FAKE_MEMBER_ADMIN,
  FAKE_MEMBER_PASSENGER,
  FAKE_MEMBER_DRIVER,
  FAKE_SCHEDULE,
  FAKE_SCHEDULE_SLOT_1,
  FAKE_SCHEDULE_SLOT_2,
  makeMember,
} from './helpers';

/* ------------------------------------------------------------------ */
/*  Setup / Teardown                                                   */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

/* ================================================================== */
/*  PoolMembersList                                                    */
/* ================================================================== */

describe('PoolMembersList', () => {
  const defaultProps = {
    members: FAKE_MEMBERS as any[],
    currentUserId: FAKE_USER_ID,
    isAdmin: true,
    onRemoveMember: vi.fn().mockResolvedValue(undefined),
    onPromoteToAdmin: vi.fn().mockResolvedValue(undefined),
    onUpdateDriverStatus: vi.fn().mockResolvedValue(undefined),
  };

  it('renders member count', () => {
    render(<PoolMembersList {...defaultProps} />);
    expect(screen.getByText('3 members')).toBeTruthy();
  });

  it('renders driver count', () => {
    render(<PoolMembersList {...defaultProps} />);
    expect(screen.getByText('2 drivers')).toBeTruthy();
  });

  it('renders passenger count', () => {
    render(<PoolMembersList {...defaultProps} />);
    expect(screen.getByText('1 passengers')).toBeTruthy();
  });

  it('shows member names', () => {
    render(<PoolMembersList {...defaultProps} />);
    expect(screen.getByText('Pool Tester')).toBeTruthy();
    expect(screen.getByText('Other Member')).toBeTruthy();
    expect(screen.getByText('Third Driver')).toBeTruthy();
  });

  it('shows "You" badge for current user', () => {
    render(<PoolMembersList {...defaultProps} />);
    expect(screen.getByText('You')).toBeTruthy();
  });

  it('shows Driver label for drivers', () => {
    render(<PoolMembersList {...defaultProps} />);
    const driverLabels = screen.getAllByText('Driver');
    expect(driverLabels.length).toBeGreaterThanOrEqual(2);
  });

  it('shows Passenger label', () => {
    render(<PoolMembersList {...defaultProps} />);
    expect(screen.getByText('Passenger')).toBeTruthy();
  });

  it('shows rating for members with average_rating', () => {
    render(<PoolMembersList {...defaultProps} />);
    expect(screen.getByText('4.5')).toBeTruthy();
    expect(screen.getByText('4.0')).toBeTruthy();
  });

  it('shows action menu for admin on non-current member', () => {
    render(<PoolMembersList {...defaultProps} />);
    // There should be action buttons (MoreVertical icons) for non-current members
    const menuButtons = screen.getAllByTestId('icon-MoreVertical');
    expect(menuButtons.length).toBe(2); // 2 non-current members
  });

  it('does not show action menu when not admin', () => {
    render(<PoolMembersList {...defaultProps} isAdmin={false} />);
    expect(screen.queryByTestId('icon-MoreVertical')).toBeNull();
  });

  it('opens dropdown menu on clicking MoreVertical', () => {
    render(<PoolMembersList {...defaultProps} />);
    const menuButtons = screen.getAllByTestId('icon-MoreVertical');
    fireEvent.click(menuButtons[0].closest('button')!);
    expect(screen.getByText('Make Admin')).toBeTruthy();
    expect(screen.getByText('Remove from Pool')).toBeTruthy();
  });

  it('shows Set as Driver for passenger in dropdown', () => {
    render(<PoolMembersList {...defaultProps} />);
    // Click menu for the passenger member (index 0 since members sorted admin first, then by date)
    // Sorted: admin (current), passenger, driver - so passenger menu is index 0
    const menuButtons = screen.getAllByTestId('icon-MoreVertical');
    fireEvent.click(menuButtons[0].closest('button')!);
    expect(screen.getByText('Set as Driver')).toBeTruthy();
  });

  it('shows Set as Passenger for driver in dropdown', () => {
    render(<PoolMembersList {...defaultProps} />);
    const menuButtons = screen.getAllByTestId('icon-MoreVertical');
    fireEvent.click(menuButtons[1].closest('button')!);
    expect(screen.getByText('Set as Passenger')).toBeTruthy();
  });

  it('calls onRemoveMember when remove clicked', async () => {
    render(<PoolMembersList {...defaultProps} />);
    const menuButtons = screen.getAllByTestId('icon-MoreVertical');
    fireEvent.click(menuButtons[0].closest('button')!);

    await act(async () => {
      fireEvent.click(screen.getByText('Remove from Pool'));
    });

    expect(defaultProps.onRemoveMember).toHaveBeenCalledWith(FAKE_OTHER_USER_ID);
  });
});

/* ================================================================== */
/*  PoolMemberAvatars                                                  */
/* ================================================================== */

describe('PoolMemberAvatars', () => {
  it('renders avatar images for members', () => {
    const { container } = render(<PoolMemberAvatars members={FAKE_MEMBERS as any[]} />);
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBe(3);
  });

  it('limits displayed avatars to max', () => {
    const { container } = render(<PoolMemberAvatars members={FAKE_MEMBERS as any[]} max={2} />);
    const imgs = container.querySelectorAll('img');
    expect(imgs.length).toBe(2);
    expect(screen.getByText('+1')).toBeTruthy();
  });

  it('does not show +N when all fit within max', () => {
    render(<PoolMemberAvatars members={FAKE_MEMBERS as any[]} max={5} />);
    expect(screen.queryByText(/^\+/)).toBeNull();
  });
});

/* ================================================================== */
/*  PoolSchedule                                                       */
/* ================================================================== */

describe('PoolSchedule', () => {
  const defaultProps = {
    schedule: FAKE_SCHEDULE as any[],
    members: FAKE_MEMBERS as any[],
    currentUserId: FAKE_USER_ID,
    isAdmin: true,
    onAddSlot: vi.fn().mockResolvedValue(undefined),
    onAssignDriver: vi.fn().mockResolvedValue(undefined),
    onRemoveSlot: vi.fn().mockResolvedValue(undefined),
  };

  it('renders Weekly Schedule heading', () => {
    render(<PoolSchedule {...defaultProps} />);
    expect(screen.getByText('Weekly Schedule')).toBeTruthy();
  });

  it('renders Add Time Slot button for admin', () => {
    render(<PoolSchedule {...defaultProps} />);
    expect(screen.getByText('Add Time Slot')).toBeTruthy();
  });

  it('hides Add Time Slot when not admin', () => {
    render(<PoolSchedule {...defaultProps} isAdmin={false} />);
    expect(screen.queryByText('Add Time Slot')).toBeNull();
  });

  it('renders day names with schedule slots', () => {
    render(<PoolSchedule {...defaultProps} />);
    expect(screen.getByText('Monday')).toBeTruthy();
    expect(screen.getByText('Wednesday')).toBeTruthy();
  });

  it('renders departure times', () => {
    render(<PoolSchedule {...defaultProps} />);
    const times = screen.getAllByText('08:00');
    expect(times.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('17:30')).toBeTruthy();
  });

  it('shows driver name for assigned slots', () => {
    render(<PoolSchedule {...defaultProps} />);
    const items = screen.getAllByText('Pool Tester');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "No driver assigned" for unassigned slots', () => {
    render(<PoolSchedule {...defaultProps} />);
    expect(screen.getByText('No driver assigned')).toBeTruthy();
  });

  it('shows empty state when no schedule', () => {
    render(<PoolSchedule {...defaultProps} schedule={[]} />);
    expect(screen.getByText('No schedule set up yet')).toBeTruthy();
  });

  it('shows admin hint in empty state', () => {
    render(<PoolSchedule {...defaultProps} schedule={[]} />);
    expect(screen.getByText('Add time slots to create a recurring schedule')).toBeTruthy();
  });

  it('opens add slot form when Add Time Slot clicked', () => {
    render(<PoolSchedule {...defaultProps} />);
    fireEvent.click(screen.getByText('Add Time Slot'));
    expect(screen.getByText('Day')).toBeTruthy();
    expect(screen.getByText('Time')).toBeTruthy();
    expect(screen.getByText('Recurring every week')).toBeTruthy();
  });

  it('calls onRemoveSlot when delete button clicked', () => {
    render(<PoolSchedule {...defaultProps} />);
    const deleteIcons = screen.getAllByTestId('icon-Trash2');
    fireEvent.click(deleteIcons[0].closest('button')!);
    expect(defaultProps.onRemoveSlot).toHaveBeenCalledWith('slot-001');
  });

  it('shows "You" badge for current user as driver', () => {
    render(<PoolSchedule {...defaultProps} />);
    const youBadges = screen.getAllByText('You');
    expect(youBadges.length).toBeGreaterThanOrEqual(1);
  });
});

/* ================================================================== */
/*  PoolScheduleCompact                                                */
/* ================================================================== */

describe('PoolScheduleCompact', () => {
  it('renders day abbreviations with times', () => {
    render(<PoolScheduleCompact schedule={FAKE_SCHEDULE as any[]} />);
    expect(screen.getByText('Mon')).toBeTruthy();
    expect(screen.getByText('Wed')).toBeTruthy();
  });

  it('groups multiple times under the same day', () => {
    render(<PoolScheduleCompact schedule={FAKE_SCHEDULE as any[]} />);
    expect(screen.getByText('08:00, 17:30')).toBeTruthy();
  });
});
