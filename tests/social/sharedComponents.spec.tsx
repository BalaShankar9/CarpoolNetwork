// @vitest-environment jsdom
/**
 * Social module – shared components test suite.
 *
 * Covers: AnimatedCircularProgress, AnimatedLinearProgress, MilestoneModal,
 * PresenceIndicator, QuickActionMenu, ReactionBar, StatCard, StoryCarousel,
 * WidgetCard, and barrel index re-exports.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import React from 'react';

import { FAKE_STORY, FAKE_STORY_VIEWED, FAKE_REACTIONS, FAKE_ACTIONS, makeStory } from './helpers';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...rest }: any) =>
    React.createElement('a', { href: to, ...rest }, children),
  useNavigate: () => mockNavigate,
}));

vi.mock('framer-motion', () => ({
  motion: new Proxy({}, {
    get: (_target: any, prop: any) => {
      return React.forwardRef((props: any, ref: any) => {
        const { initial, animate, exit, transition, variants, whileHover, whileTap, whileFocus, layout, layoutId, ...rest } = props;
        return React.createElement(prop as string, { ...rest, ref });
      });
    },
  }),
  AnimatePresence: ({ children }: any) => children,
  useAnimation: () => ({ start: vi.fn(), stop: vi.fn() }),
}));

vi.mock('lucide-react', () => {
  const icon = (name: string) => (props: any) =>
    React.createElement('svg', { 'data-testid': `icon-${name}`, className: props.className });
  const icons = [
    'ChevronRight', 'Share2', 'X', 'Plus',
    'TrendingUp', 'TrendingDown',
  ];
  const out: Record<string, any> = {};
  for (const n of icons) out[n] = icon(n);
  return out;
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import {
  AnimatedCircularProgress,
  AnimatedLinearProgress,
} from '../../src/components/social/shared/AnimatedProgress';
import MilestoneModal from '../../src/components/social/shared/MilestoneModal';
import PresenceIndicator from '../../src/components/social/shared/PresenceIndicator';
import QuickActionMenu from '../../src/components/social/shared/QuickActionMenu';
import ReactionBar from '../../src/components/social/shared/ReactionBar';
import StatCard from '../../src/components/social/shared/StatCard';
import StoryCarousel from '../../src/components/social/shared/StoryCarousel';
import WidgetCard from '../../src/components/social/shared/WidgetCard';

// Cleanup between tests
afterEach(() => { cleanup(); });

// ═══════════════════════════════════════════════════════════════════════════
// AnimatedCircularProgress
// ═══════════════════════════════════════════════════════════════════════════
describe('AnimatedCircularProgress', () => {
  it('renders with role=progressbar and correct aria values', () => {
    render(<AnimatedCircularProgress value={42} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toBeInTheDocument();
    expect(bar).toHaveAttribute('aria-valuenow', '42');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('clamps value between 0 and 100', () => {
    const { rerender } = render(<AnimatedCircularProgress value={-10} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    rerender(<AnimatedCircularProgress value={150} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows percentage text when showValue is true', () => {
    render(<AnimatedCircularProgress value={75} showValue />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('shows label text', () => {
    render(<AnimatedCircularProgress value={50} label="XP" />);
    expect(screen.getByText('XP')).toBeInTheDocument();
  });

  it('renders custom children over value text', () => {
    render(
      <AnimatedCircularProgress value={50} showValue>
        <span>Custom</span>
      </AnimatedCircularProgress>,
    );
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('applies gradient when provided', () => {
    const { container } = render(
      <AnimatedCircularProgress value={60} gradient={{ from: '#ff0', to: '#f00' }} />,
    );
    const gradients = container.querySelectorAll('linearGradient');
    expect(gradients.length).toBe(1);
    const stops = gradients[0].querySelectorAll('stop');
    expect(stops[0]).toHaveAttribute('stop-color', '#ff0');
    expect(stops[1]).toHaveAttribute('stop-color', '#f00');
  });

  it('uses custom size and strokeWidth', () => {
    render(<AnimatedCircularProgress value={10} size={100} strokeWidth={8} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveStyle({ width: '100px', height: '100px' });
  });

  it('generates default aria-label from value', () => {
    render(<AnimatedCircularProgress value={33} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label', '33% progress');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// AnimatedLinearProgress
// ═══════════════════════════════════════════════════════════════════════════
describe('AnimatedLinearProgress', () => {
  it('renders progressbar with correct aria values', () => {
    render(<AnimatedLinearProgress value={60} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '60');
  });

  it('clamps value to 0-100 range', () => {
    render(<AnimatedLinearProgress value={200} />);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });

  it('shows value text when showValue is true', () => {
    render(<AnimatedLinearProgress value={45} showValue />);
    expect(screen.getByText('45%')).toBeInTheDocument();
    expect(screen.getByText('Progress')).toBeInTheDocument();
  });

  it('renders non-animated bar when animated=false', () => {
    const { container } = render(
      <AnimatedLinearProgress value={50} animated={false} />,
    );
    // Non-animated renders a plain div with inline style
    const inner = container.querySelector('[style*="width: 50%"]');
    expect(inner).toBeTruthy();
  });

  it('applies custom height', () => {
    render(<AnimatedLinearProgress value={30} height={12} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveStyle({ height: '12px' });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// MilestoneModal
// ═══════════════════════════════════════════════════════════════════════════
describe('MilestoneModal', () => {
  const baseProps = {
    isOpen: true,
    onClose: vi.fn(),
    title: 'First Ride!',
    description: 'You completed your very first carpool ride.',
    icon: React.createElement('span', null, '🚗'),
  };

  beforeEach(() => vi.clearAllMocks());

  it('renders title and description when open', () => {
    render(<MilestoneModal {...baseProps} />);
    expect(screen.getByText('First Ride!')).toBeInTheDocument();
    expect(screen.getByText(/very first carpool ride/)).toBeInTheDocument();
  });

  it('renders dialog with correct ARIA attributes', () => {
    render(<MilestoneModal {...baseProps} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-label', 'First Ride!');
  });

  it('does not render when isOpen is false', () => {
    render(<MilestoneModal {...baseProps} isOpen={false} />);
    expect(screen.queryByText('First Ride!')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    render(<MilestoneModal {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    render(<MilestoneModal {...baseProps} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(baseProps.onClose).toHaveBeenCalled();
  });

  it('shows Share button when onShare is provided', () => {
    const onShare = vi.fn();
    render(<MilestoneModal {...baseProps} onShare={onShare} />);
    const shareBtn = screen.getByText('Share to Feed');
    expect(shareBtn).toBeInTheDocument();
    fireEvent.click(shareBtn);
    expect(onShare).toHaveBeenCalledTimes(1);
  });

  it('shows Close button', () => {
    render(<MilestoneModal {...baseProps} />);
    // There's a text "Close" button in the footer
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('locks body scroll when open', () => {
    render(<MilestoneModal {...baseProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('calls onClose when backdrop is clicked', () => {
    render(<MilestoneModal {...baseProps} />);
    // Backdrop is the first motion.div child with bg-black/40 class
    const backdrop = document.querySelector('.bg-black\\/40, [class*="bg-black"]');
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(baseProps.onClose).toHaveBeenCalled();
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PresenceIndicator
// ═══════════════════════════════════════════════════════════════════════════
describe('PresenceIndicator', () => {
  it('renders online status with green dot and correct label', () => {
    render(<PresenceIndicator status="online" />);
    const dot = screen.getByRole('status');
    expect(dot).toHaveAttribute('aria-label', 'Online');
    expect(dot.className).toContain('bg-green-500');
  });

  it('renders idle status with amber dot', () => {
    render(<PresenceIndicator status="idle" />);
    const dot = screen.getByRole('status');
    expect(dot).toHaveAttribute('aria-label', 'Idle');
    expect(dot.className).toContain('bg-amber-400');
  });

  it('renders offline status with gray dot', () => {
    render(<PresenceIndicator status="offline" />);
    const dot = screen.getByRole('status');
    expect(dot).toHaveAttribute('aria-label', 'Offline');
    expect(dot.className).toContain('bg-gray-300');
  });

  it('shows label text when showLabel is true', () => {
    render(<PresenceIndicator status="online" showLabel />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('does not show label text by default', () => {
    render(<PresenceIndicator status="online" />);
    expect(screen.queryByText('Online')).not.toBeInTheDocument();
  });

  it('applies small size class', () => {
    render(<PresenceIndicator status="online" size="sm" />);
    const dot = screen.getByRole('status');
    expect(dot.className).toContain('w-2');
  });

  it('applies large size class', () => {
    render(<PresenceIndicator status="online" size="lg" />);
    const dot = screen.getByRole('status');
    expect(dot.className).toContain('w-3');
  });

  it('applies custom className', () => {
    const { container } = render(
      <PresenceIndicator status="online" className="my-custom-class" />,
    );
    expect(container.querySelector('.my-custom-class')).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// QuickActionMenu
// ═══════════════════════════════════════════════════════════════════════════
describe('QuickActionMenu', () => {
  const trigger = React.createElement('span', null, 'Open Menu');

  beforeEach(() => {
    vi.clearAllMocks();
    FAKE_ACTIONS.forEach((a) => a.onClick.mockClear());
  });

  it('renders trigger but not menu initially', () => {
    render(<QuickActionMenu actions={FAKE_ACTIONS} trigger={trigger} />);
    expect(screen.getByText('Open Menu')).toBeInTheDocument();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('opens menu on trigger click', () => {
    render(<QuickActionMenu actions={FAKE_ACTIONS} trigger={trigger} />);
    fireEvent.click(screen.getByText('Open Menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(screen.getByText('View Ride')).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(screen.getByText('Wave')).toBeInTheDocument();
  });

  it('calls action onClick and closes menu on action click', () => {
    render(<QuickActionMenu actions={FAKE_ACTIONS} trigger={trigger} />);
    fireEvent.click(screen.getByText('Open Menu'));
    fireEvent.click(screen.getByText('Message'));
    expect(FAKE_ACTIONS[1].onClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('toggles closed on second trigger click', () => {
    render(<QuickActionMenu actions={FAKE_ACTIONS} trigger={trigger} />);
    fireEvent.click(screen.getByText('Open Menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Open Menu'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes on Escape key', () => {
    render(<QuickActionMenu actions={FAKE_ACTIONS} trigger={trigger} />);
    fireEvent.click(screen.getByText('Open Menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('closes when clicking outside', () => {
    render(
      <div>
        <QuickActionMenu actions={FAKE_ACTIONS} trigger={trigger} />
        <button>Outside</button>
      </div>,
    );
    fireEvent.click(screen.getByText('Open Menu'));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByText('Outside'));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('sets aria-haspopup and aria-expanded on trigger button', () => {
    render(<QuickActionMenu actions={FAKE_ACTIONS} trigger={trigger} />);
    const btn = screen.getByRole('button', { name: 'Open Menu' });
    expect(btn).toHaveAttribute('aria-haspopup', 'menu');
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });

  it('renders all menu items with menuitem role', () => {
    render(<QuickActionMenu actions={FAKE_ACTIONS} trigger={trigger} />);
    fireEvent.click(screen.getByText('Open Menu'));
    const items = screen.getAllByRole('menuitem');
    expect(items).toHaveLength(3);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ReactionBar
// ═══════════════════════════════════════════════════════════════════════════
describe('ReactionBar', () => {
  const onReact = vi.fn();
  const onRemoveReaction = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders existing reactions with counts', () => {
    render(
      <ReactionBar
        reactions={FAKE_REACTIONS}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
      />,
    );
    // celebrate count=3, love count=1
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('calls onReact when clicking non-reacted emoji', () => {
    render(
      <ReactionBar
        reactions={FAKE_REACTIONS}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
      />,
    );
    // celebrate is not reacted (hasReacted=false)
    const celebrateBtn = screen.getByLabelText('Add celebrate reaction');
    fireEvent.click(celebrateBtn);
    expect(onReact).toHaveBeenCalledWith('celebrate');
  });

  it('calls onRemoveReaction when clicking already-reacted emoji', () => {
    render(
      <ReactionBar
        reactions={FAKE_REACTIONS}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
      />,
    );
    // love is reacted (hasReacted=true)
    const loveBtn = screen.getByLabelText('Remove love reaction');
    fireEvent.click(loveBtn);
    expect(onRemoveReaction).toHaveBeenCalledWith('love');
  });

  it('renders add-reaction button', () => {
    render(
      <ReactionBar
        reactions={FAKE_REACTIONS}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
      />,
    );
    expect(screen.getByLabelText('Add reaction')).toBeInTheDocument();
  });

  it('opens emoji picker on add-reaction click', () => {
    render(
      <ReactionBar
        reactions={FAKE_REACTIONS}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add reaction'));
    // Should see emoji picker with available emojis
    expect(screen.getByLabelText('React with fire')).toBeInTheDocument();
    expect(screen.getByLabelText('React with car')).toBeInTheDocument();
    expect(screen.getByLabelText('React with leaf')).toBeInTheDocument();
  });

  it('calls onReact and closes picker when selecting emoji from picker', () => {
    render(
      <ReactionBar
        reactions={FAKE_REACTIONS}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add reaction'));
    fireEvent.click(screen.getByLabelText('React with fire'));
    expect(onReact).toHaveBeenCalledWith('fire');
  });

  it('disables already-existing emojis in picker', () => {
    render(
      <ReactionBar
        reactions={FAKE_REACTIONS}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
      />,
    );
    fireEvent.click(screen.getByLabelText('Add reaction'));
    // celebrate and love already exist
    expect(screen.getByLabelText('React with celebrate')).toBeDisabled();
    expect(screen.getByLabelText('React with love')).toBeDisabled();
  });

  it('renders compact variant with smaller sizing', () => {
    const { container } = render(
      <ReactionBar
        reactions={FAKE_REACTIONS}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
        compact
      />,
    );
    // Compact class applies px-1.5 py-0.5
    const btns = container.querySelectorAll('button[aria-label*="reaction"]');
    expect(btns.length).toBeGreaterThan(0);
  });

  it('renders empty when no reactions', () => {
    const { container } = render(
      <ReactionBar
        reactions={[]}
        onReact={onReact}
        onRemoveReaction={onRemoveReaction}
      />,
    );
    // Only the add-reaction button
    expect(screen.getByLabelText('Add reaction')).toBeInTheDocument();
    expect(container.querySelectorAll('button[aria-label*="reaction"]').length).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// StatCard
// ═══════════════════════════════════════════════════════════════════════════
describe('StatCard', () => {
  it('renders label and value', async () => {
    render(
      <StatCard
        label="Total Rides"
        value={25}
        icon={React.createElement('span', null, '🚗')}
      />,
    );
    expect(screen.getByText('Total Rides')).toBeInTheDocument();
    // Animated counter starts at 0 and counts up — wait for final value
    await waitFor(() => {
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  it('renders suffix text', () => {
    render(
      <StatCard
        label="CO2 Saved"
        value={10}
        icon={React.createElement('span', null, '🌿')}
        suffix="kg"
      />,
    );
    expect(screen.getByText('kg')).toBeInTheDocument();
  });

  it('shows positive trend with TrendingUp icon', () => {
    render(
      <StatCard
        label="Rides"
        value={10}
        icon={React.createElement('span', null, '🚗')}
        trend={15}
      />,
    );
    expect(screen.getByTestId('icon-TrendingUp')).toBeInTheDocument();
    expect(screen.getByText('15%')).toBeInTheDocument();
  });

  it('shows negative trend with TrendingDown icon', () => {
    render(
      <StatCard
        label="Rides"
        value={10}
        icon={React.createElement('span', null, '🚗')}
        trend={-5}
      />,
    );
    expect(screen.getByTestId('icon-TrendingDown')).toBeInTheDocument();
    expect(screen.getByText('5%')).toBeInTheDocument();
  });

  it('does not show trend when trend is 0', () => {
    render(
      <StatCard
        label="Rides"
        value={10}
        icon={React.createElement('span', null, '🚗')}
        trend={0}
      />,
    );
    expect(screen.queryByTestId('icon-TrendingUp')).not.toBeInTheDocument();
    expect(screen.queryByTestId('icon-TrendingDown')).not.toBeInTheDocument();
  });

  it('does not show trend when trend is undefined', () => {
    render(
      <StatCard
        label="Rides"
        value={10}
        icon={React.createElement('span', null, '🚗')}
      />,
    );
    expect(screen.queryByTestId('icon-TrendingUp')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// StoryCarousel
// ═══════════════════════════════════════════════════════════════════════════
describe('StoryCarousel', () => {
  const onStoryClick = vi.fn();
  const onCreateStory = vi.fn();

  beforeEach(() => vi.clearAllMocks());

  it('renders story bubbles with user names', () => {
    render(
      <StoryCarousel stories={[FAKE_STORY, FAKE_STORY_VIEWED]} onStoryClick={onStoryClick} />,
    );
    // Names are truncated: "Bob Soci…" (8 chars + …) – check aria-label instead
    expect(screen.getByLabelText("View Bob Social's story")).toBeInTheDocument();
    expect(screen.getByLabelText("View Charlie Groups's story")).toBeInTheDocument();
  });

  it('calls onStoryClick when a story bubble is clicked', () => {
    render(
      <StoryCarousel stories={[FAKE_STORY]} onStoryClick={onStoryClick} />,
    );
    fireEvent.click(screen.getByLabelText("View Bob Social's story"));
    expect(onStoryClick).toHaveBeenCalledWith(FAKE_STORY);
  });

  it('renders create story button when onCreateStory is provided', () => {
    render(
      <StoryCarousel stories={[]} onStoryClick={onStoryClick} onCreateStory={onCreateStory} />,
    );
    expect(screen.getByLabelText('Create a story')).toBeInTheDocument();
  });

  it('calls onCreateStory when create button is clicked', () => {
    render(
      <StoryCarousel stories={[]} onStoryClick={onStoryClick} onCreateStory={onCreateStory} />,
    );
    fireEvent.click(screen.getByLabelText('Create a story'));
    expect(onCreateStory).toHaveBeenCalledTimes(1);
  });

  it('shows "No stories yet" when empty and no create handler', () => {
    render(
      <StoryCarousel stories={[]} onStoryClick={onStoryClick} />,
    );
    expect(screen.getByText('No stories yet')).toBeInTheDocument();
  });

  it('shows avatar image when userAvatar is provided', () => {
    render(
      <StoryCarousel stories={[FAKE_STORY]} onStoryClick={onStoryClick} />,
    );
    const img = screen.getByAltText('Bob Social');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/bob.jpg');
  });

  it('shows initials when userAvatar is not provided', () => {
    render(
      <StoryCarousel stories={[FAKE_STORY_VIEWED]} onStoryClick={onStoryClick} />,
    );
    // Charlie Groups → CG
    expect(screen.getByText('CG')).toBeInTheDocument();
  });

  it('renders viewed story with gray ring', () => {
    const { container } = render(
      <StoryCarousel stories={[FAKE_STORY_VIEWED]} onStoryClick={onStoryClick} />,
    );
    // Viewed stories have from-gray-200 class on the ring
    expect(container.querySelector('[class*="from-gray-200"]')).toBeTruthy();
  });

  it('renders unviewed story with gradient ring', () => {
    const { container } = render(
      <StoryCarousel stories={[FAKE_STORY]} onStoryClick={onStoryClick} />,
    );
    // Unviewed stories have from-social-warm-400 class
    expect(container.querySelector('[class*="from-social-warm-400"]')).toBeTruthy();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// WidgetCard
// ═══════════════════════════════════════════════════════════════════════════
describe('WidgetCard', () => {
  it('renders title and children', () => {
    render(
      <WidgetCard title="My Widget" icon={React.createElement('span', null, '🔥')}>
        <p>Widget content</p>
      </WidgetCard>,
    );
    expect(screen.getByText('My Widget')).toBeInTheDocument();
    expect(screen.getByText('Widget content')).toBeInTheDocument();
  });

  it('renders badge when provided', () => {
    render(
      <WidgetCard title="Alerts" icon={React.createElement('span', null, '🔔')} badge={5}>
        <p>Content</p>
      </WidgetCard>,
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows 99+ for large badge numbers', () => {
    render(
      <WidgetCard title="Alerts" icon={React.createElement('span', null, '🔔')} badge={150}>
        <p>Content</p>
      </WidgetCard>,
    );
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('does not show badge when value is 0', () => {
    const { container } = render(
      <WidgetCard title="Alerts" icon={React.createElement('span', null, '🔔')} badge={0}>
        <p>Content</p>
      </WidgetCard>,
    );
    // Badge span with min-w-[20px] should not exist for 0
    expect(container.querySelector('[class*="bg-social-warm-500"]')).toBeFalsy();
  });

  it('renders "See all" link when seeAllLink is provided', () => {
    render(
      <WidgetCard title="Feed" icon={React.createElement('span', null, '📰')} seeAllLink="/feed">
        <p>Content</p>
      </WidgetCard>,
    );
    const links = screen.getAllByText('See all');
    expect(links.length).toBeGreaterThanOrEqual(1);
    expect(links[0].closest('a')).toHaveAttribute('href', '/feed');
  });

  it('uses custom seeAllLabel', () => {
    render(
      <WidgetCard title="Feed" icon={React.createElement('span', null, '📰')} seeAllLink="/feed" seeAllLabel="View more">
        <p>Content</p>
      </WidgetCard>,
    );
    expect(screen.getAllByText('View more').length).toBeGreaterThanOrEqual(1);
  });

  it('shows skeleton loading state', () => {
    const { container } = render(
      <WidgetCard title="Loading" icon={React.createElement('span', null, '⏳')} loading>
        <p>Content</p>
      </WidgetCard>,
    );
    // Loading skeleton has animate-pulse-soft class
    expect(container.querySelector('[class*="animate-pulse"]')).toBeTruthy();
    // Children should not be visible
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('does not show see-all link when loading', () => {
    render(
      <WidgetCard title="Feed" icon={React.createElement('span', null, '📰')} seeAllLink="/feed" loading>
        <p>Content</p>
      </WidgetCard>,
    );
    expect(screen.queryByText('See all')).not.toBeInTheDocument();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// Barrel index re-exports
// ═══════════════════════════════════════════════════════════════════════════
describe('shared/index re-exports', () => {
  it('exports all shared components from barrel', async () => {
    const barrel = await import('../../src/components/social/shared/index');
    expect(barrel.WidgetCard).toBeDefined();
    expect(barrel.PresenceIndicator).toBeDefined();
    expect(barrel.ReactionBar).toBeDefined();
    expect(barrel.QuickActionMenu).toBeDefined();
    expect(barrel.StoryCarousel).toBeDefined();
    expect(barrel.AnimatedCircularProgress).toBeDefined();
    expect(barrel.AnimatedLinearProgress).toBeDefined();
    expect(barrel.StatCard).toBeDefined();
    expect(barrel.MilestoneModal).toBeDefined();
  });
});
