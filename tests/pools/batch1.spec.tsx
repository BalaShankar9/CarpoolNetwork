/**
 * Pools module — Batch 1
 * PoolCard (11 tests)
 * CreatePoolModal (11 tests)
 * JoinPoolModal (10 tests)
 * ≈ 32 tests
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
    MapPin: stub('MapPin'),
    Clock: stub('Clock'),
    Calendar: stub('Calendar'),
    Lock: stub('Lock'),
    Globe: stub('Globe'),
    ChevronRight: stub('ChevronRight'),
    Car: stub('Car'),
    X: stub('X'),
    Plus: stub('Plus'),
    Key: stub('Key'),
    Check: stub('Check'),
    AlertCircle: stub('AlertCircle'),
    Image: stub('Image'),

    mockNavigate: vi.fn(),
  };
});

/* ------------------------------------------------------------------ */
/*  Module mocks                                                       */
/* ------------------------------------------------------------------ */

vi.mock('lucide-react', () => ({
  Users: mocks.Users,
  MapPin: mocks.MapPin,
  Clock: mocks.Clock,
  Calendar: mocks.Calendar,
  Lock: mocks.Lock,
  Globe: mocks.Globe,
  ChevronRight: mocks.ChevronRight,
  Car: mocks.Car,
  X: mocks.X,
  Plus: mocks.Plus,
  Key: mocks.Key,
  Check: mocks.Check,
  AlertCircle: mocks.AlertCircle,
  Image: mocks.Image,
}));

vi.mock('react-router-dom', () => ({
  Link: ({ to, children, ...rest }: any) => <a href={to} {...rest}>{children}</a>,
  useNavigate: () => mocks.mockNavigate,
}));

/* ------------------------------------------------------------------ */
/*  Imports (after mocks)                                              */
/* ------------------------------------------------------------------ */

import { PoolCard, PoolCardSkeleton } from '../../src/components/pools/PoolCard';
import { CreatePoolModal } from '../../src/components/pools/CreatePoolModal';
import { JoinPoolModal } from '../../src/components/pools/JoinPoolModal';
import {
  FAKE_POOL,
  FAKE_PRIVATE_POOL,
  FAKE_FULL_POOL,
  makePool,
} from './helpers';

/* ------------------------------------------------------------------ */
/*  Setup / Teardown                                                   */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(cleanup);

/* ================================================================== */
/*  PoolCard                                                           */
/* ================================================================== */

describe('PoolCard', () => {
  it('renders pool name', () => {
    render(<PoolCard pool={FAKE_POOL as any} />);
    expect(screen.getByText('Downtown Commuters')).toBeTruthy();
  });

  it('renders pool description', () => {
    render(<PoolCard pool={FAKE_POOL as any} />);
    expect(screen.getByText('Daily commute from North to Downtown')).toBeTruthy();
  });

  it('renders origin and destination areas', () => {
    render(<PoolCard pool={FAKE_POOL as any} />);
    expect(screen.getByText('North Side')).toBeTruthy();
    expect(screen.getByText('Business District')).toBeTruthy();
  });

  it('renders member count badge', () => {
    render(<PoolCard pool={FAKE_POOL as any} />);
    expect(screen.getByText('5/10')).toBeTruthy();
  });

  it('shows schedule display for weekdays', () => {
    render(<PoolCard pool={FAKE_POOL as any} />);
    expect(screen.getByText('Mon - Fri')).toBeTruthy();
  });

  it('shows Daily for daily schedule type', () => {
    const dailyPool = makePool({ schedule_type: 'daily' });
    render(<PoolCard pool={dailyPool as any} />);
    expect(screen.getByText('Daily')).toBeTruthy();
  });

  it('shows preferred time', () => {
    render(<PoolCard pool={FAKE_POOL as any} />);
    expect(screen.getByText('08:00')).toBeTruthy();
  });

  it('shows creator name', () => {
    render(<PoolCard pool={FAKE_POOL as any} />);
    expect(screen.getByText('Created by Pool Tester')).toBeTruthy();
  });

  it('shows Join Pool button for public pool when not joined', () => {
    const onJoin = vi.fn();
    render(<PoolCard pool={FAKE_POOL as any} onJoin={onJoin} />);
    expect(screen.getByText('Join Pool')).toBeTruthy();
  });

  it('shows "You\'re a member" and View Pool when joined', () => {
    render(<PoolCard pool={FAKE_POOL as any} isJoined={true} />);
    expect(screen.getByText("You're a member")).toBeTruthy();
    expect(screen.getByText('View Pool')).toBeTruthy();
  });

  it('shows Pool Full for full pools', () => {
    render(<PoolCard pool={FAKE_FULL_POOL as any} memberCount={10} />);
    expect(screen.getByText('Pool Full')).toBeTruthy();
  });

  it('shows Request to Join for private pool', () => {
    const onJoin = vi.fn();
    render(<PoolCard pool={FAKE_PRIVATE_POOL as any} onJoin={onJoin} />);
    expect(screen.getByText('Request to Join')).toBeTruthy();
  });

  it('renders PoolCardSkeleton', () => {
    const { container } = render(<PoolCardSkeleton count={2} />);
    const skeletons = container.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBe(2);
  });
});

/* ================================================================== */
/*  CreatePoolModal                                                    */
/* ================================================================== */

describe('CreatePoolModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSubmit: vi.fn().mockResolvedValue(undefined),
  };

  it('returns null when not open', () => {
    const { container } = render(
      <CreatePoolModal isOpen={false} onClose={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders Create Carpool Pool heading', () => {
    render(<CreatePoolModal {...defaultProps} />);
    expect(screen.getByText('Create Carpool Pool')).toBeTruthy();
  });

  it('renders Pool Name input', () => {
    render(<CreatePoolModal {...defaultProps} />);
    expect(screen.getByText('Pool Name *')).toBeTruthy();
    expect(screen.getByPlaceholderText('e.g., Downtown Commuters')).toBeTruthy();
  });

  it('renders Origin and Destination fields', () => {
    render(<CreatePoolModal {...defaultProps} />);
    expect(screen.getByText('Origin Area *')).toBeTruthy();
    expect(screen.getByText('Destination Area *')).toBeTruthy();
  });

  it('renders schedule type buttons', () => {
    render(<CreatePoolModal {...defaultProps} />);
    expect(screen.getByText('Daily')).toBeTruthy();
    expect(screen.getByText('Weekdays')).toBeTruthy();
    expect(screen.getByText('Custom')).toBeTruthy();
  });

  it('shows custom day buttons when Custom is selected', () => {
    render(<CreatePoolModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Custom'));
    expect(screen.getByText('Sun')).toBeTruthy();
    expect(screen.getByText('Mon')).toBeTruthy();
    expect(screen.getByText('Sat')).toBeTruthy();
  });

  it('renders Maximum Members input', () => {
    render(<CreatePoolModal {...defaultProps} />);
    expect(screen.getByText('Maximum Members')).toBeTruthy();
  });

  it('shows Public Pool by default', () => {
    render(<CreatePoolModal {...defaultProps} />);
    expect(screen.getByText('Public Pool')).toBeTruthy();
    expect(screen.getByText('Anyone can find and join')).toBeTruthy();
  });

  it('renders Cancel and Create Pool buttons', () => {
    render(<CreatePoolModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByText('Create Pool')).toBeTruthy();
  });

  it('calls onClose when Cancel clicked', () => {
    render(<CreatePoolModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows error when submit fails', async () => {
    const failSubmit = vi.fn().mockRejectedValue(new Error('Create failed'));
    render(<CreatePoolModal isOpen={true} onClose={vi.fn()} onSubmit={failSubmit} />);

    fireEvent.change(screen.getByPlaceholderText('e.g., Downtown Commuters'), {
      target: { value: 'Test Pool' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., North Side'), {
      target: { value: 'Origin' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g., Business District'), {
      target: { value: 'Dest' },
    });

    await act(async () => {
      fireEvent.submit(screen.getByText('Create Pool').closest('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('Create failed')).toBeTruthy();
    });
  });
});

/* ================================================================== */
/*  JoinPoolModal                                                      */
/* ================================================================== */

describe('JoinPoolModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onJoinPublic: vi.fn().mockResolvedValue(undefined),
    poolName: 'Test Pool',
  };

  it('returns null when not open', () => {
    const { container } = render(
      <JoinPoolModal isOpen={false} onClose={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders Join Pool heading', () => {
    render(<JoinPoolModal {...defaultProps} />);
    const items = screen.getAllByText('Join Pool');
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  it('shows pool name', () => {
    render(<JoinPoolModal {...defaultProps} />);
    const items = screen.getAllByText('Test Pool');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Passenger and Driver selection', () => {
    render(<JoinPoolModal {...defaultProps} />);
    expect(screen.getByText('Passenger')).toBeTruthy();
    expect(screen.getByText('Driver')).toBeTruthy();
  });

  it('shows confirmation message for public pool', () => {
    render(<JoinPoolModal {...defaultProps} />);
    expect(screen.getByText(/You're about to join/)).toBeTruthy();
  });

  it('shows invite code input for private pool', () => {
    render(<JoinPoolModal isOpen={true} onClose={vi.fn()} onJoinByCode={vi.fn()} isPrivate={true} />);
    expect(screen.getByText('Invite Code')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter 6-character code')).toBeTruthy();
  });

  it('renders Cancel and Join Pool buttons', () => {
    render(<JoinPoolModal {...defaultProps} />);
    expect(screen.getByText('Cancel')).toBeTruthy();
    // The button text "Join Pool" appears both as heading and button
    const joinButtons = screen.getAllByText('Join Pool');
    expect(joinButtons.length).toBeGreaterThanOrEqual(2);
  });

  it('calls onClose when Cancel clicked', () => {
    render(<JoinPoolModal {...defaultProps} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('shows error on join failure', async () => {
    const failJoin = vi.fn().mockRejectedValue(new Error('Join failed'));
    render(<JoinPoolModal isOpen={true} onClose={vi.fn()} onJoinPublic={failJoin} poolName="Fail Pool" />);

    // Click the Join Pool action button (last one)
    const joinButtons = screen.getAllByText('Join Pool');
    await act(async () => {
      fireEvent.click(joinButtons[joinButtons.length - 1]);
    });

    await waitFor(() => {
      expect(screen.getByText('Join failed')).toBeTruthy();
    });
  });

  it('shows mode toggle when both public and code options available', () => {
    render(
      <JoinPoolModal
        isOpen={true}
        onClose={vi.fn()}
        onJoinPublic={vi.fn()}
        onJoinByCode={vi.fn()}
      />
    );
    expect(screen.getByText('Join Public Pool')).toBeTruthy();
    expect(screen.getByText('Use Invite Code')).toBeTruthy();
  });
});
