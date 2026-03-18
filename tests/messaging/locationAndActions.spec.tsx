/**
 * locationAndActions.spec.tsx — Tests for LocationShareMessage, ShareLocationButton, MessageActionsMenu
 */

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { LocationShareMessage, ShareLocationButton } from '../../src/components/messaging/LocationShareMessage';
import { MessageActionsMenu } from '../../src/components/messaging/MessageActions';

afterEach(() => cleanup());

// ============================================================
// LocationShareMessage
// ============================================================

describe('LocationShareMessage', () => {
  const defaultProps = {
    location: {
      latitude: 51.5074,
      longitude: -0.1278,
      address: '10 Downing Street, London',
    },
    label: 'Meeting Point',
    timestamp: '14:30',
    isOwnMessage: false,
  };

  it('should render location label', () => {
    render(<LocationShareMessage {...defaultProps} />);
    expect(screen.getByText('Meeting Point')).toBeInTheDocument();
  });

  it('should render address when provided', () => {
    render(<LocationShareMessage {...defaultProps} />);
    expect(screen.getByText('10 Downing Street, London')).toBeInTheDocument();
  });

  it('should render "Open in Maps" button', () => {
    render(<LocationShareMessage {...defaultProps} />);
    expect(screen.getByText('Open in Maps')).toBeInTheDocument();
  });

  it('should open Google Maps URL on "Open in Maps" click', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<LocationShareMessage {...defaultProps} />);

    fireEvent.click(screen.getByText('Open in Maps'));

    expect(openSpy).toHaveBeenCalledWith(
      'https://www.google.com/maps?q=51.5074,-0.1278',
      '_blank',
    );
    openSpy.mockRestore();
  });

  it('should render Google Static Maps image', () => {
    const { container } = render(<LocationShareMessage {...defaultProps} />);
    const img = container.querySelector('img[alt="Location"]');
    expect(img).toBeTruthy();
    expect(img!.getAttribute('src')).toContain('51.5074');
    expect(img!.getAttribute('src')).toContain('-0.1278');
  });

  it('should render timestamp when provided', () => {
    render(<LocationShareMessage {...defaultProps} />);
    expect(screen.getByText('14:30')).toBeInTheDocument();
  });

  it('should not render timestamp when not provided', () => {
    const { timestamp, ...rest } = defaultProps;
    render(<LocationShareMessage {...rest} />);
    expect(screen.queryByText('14:30')).not.toBeInTheDocument();
  });

  it('should copy coordinates when copy button clicked', async () => {
    const clipboardSpy = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: clipboardSpy },
    });

    render(<LocationShareMessage {...defaultProps} />);

    const copyBtn = screen.getByTitle('Copy coordinates');
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(clipboardSpy).toHaveBeenCalledWith('51.5074, -0.1278');
    });
  });

  it('should use default label "Shared Location" when none provided', () => {
    const { label, ...rest } = defaultProps;
    render(<LocationShareMessage {...rest} />);
    expect(screen.getByText('Shared Location')).toBeInTheDocument();
  });

  it('should apply own-message styling', () => {
    const { container } = render(
      <LocationShareMessage {...defaultProps} isOwnMessage={true} />,
    );
    expect(container.querySelector('.bg-blue-600')).toBeTruthy();
  });

  it('should apply other-message styling', () => {
    const { container } = render(
      <LocationShareMessage {...defaultProps} isOwnMessage={false} />,
    );
    expect(container.querySelector('.bg-white')).toBeTruthy();
  });
});

// ============================================================
// ShareLocationButton
// ============================================================

describe('ShareLocationButton', () => {
  it('should render a button with "Share location" title', () => {
    render(<ShareLocationButton onShare={vi.fn()} />);
    expect(screen.getByTitle('Share location')).toBeInTheDocument();
  });

  it('should be disabled when disabled=true', () => {
    render(<ShareLocationButton onShare={vi.fn()} disabled />);
    expect(screen.getByTitle('Share location')).toBeDisabled();
  });

  it('should alert when geolocation not supported', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    // Remove geolocation entirely so 'geolocation' in navigator returns false
    const original = navigator.geolocation;
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'geolocation')
      ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(navigator), 'geolocation');

    // Redefine property to use a getter that makes 'in' return false-like via delete
    Object.defineProperty(navigator, 'geolocation', { value: undefined, configurable: true });
    // 'in' still returns true when value is undefined, so we must delete entirely
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (navigator as any).geolocation;

    render(<ShareLocationButton onShare={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Share location'));

    expect(alertSpy).toHaveBeenCalledWith('Geolocation is not supported by your browser');

    // Restore
    Object.defineProperty(navigator, 'geolocation', { value: original, configurable: true });
    alertSpy.mockRestore();
  });

  it('should call onShare with coords on success', async () => {
    const onShare = vi.fn();
    const mockGeolocation = {
      getCurrentPosition: vi.fn((success: Function) => {
        success({
          coords: { latitude: 51.5074, longitude: -0.1278 },
        });
      }),
    };
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
    });

    render(<ShareLocationButton onShare={onShare} />);
    fireEvent.click(screen.getByTitle('Share location'));

    await waitFor(() => {
      expect(onShare).toHaveBeenCalledWith({
        latitude: 51.5074,
        longitude: -0.1278,
      });
    });
  });

  it('should alert on permission denied error', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    const mockGeolocation = {
      getCurrentPosition: vi.fn((_success: Function, error: Function) => {
        error({ code: 1 });
      }),
    };
    Object.defineProperty(navigator, 'geolocation', {
      value: mockGeolocation,
      configurable: true,
    });

    render(<ShareLocationButton onShare={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Share location'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        'Location permission denied. Please enable location access.',
      );
    });

    alertSpy.mockRestore();
  });
});

// ============================================================
// MessageActionsMenu
// ============================================================

describe('MessageActionsMenu', () => {
  const defaultProps = {
    messageId: 'msg-1',
    isOwn: true,
    isPinned: false,
    onReply: vi.fn(),
    onForward: vi.fn(),
    onCopy: vi.fn(),
    onDelete: vi.fn(),
    onPin: vi.fn(),
    onScheduleReminder: vi.fn(),
    onReact: vi.fn(),
  };

  it('should render quick action buttons (first 3: React, Reply, Forward)', () => {
    const { container } = render(<MessageActionsMenu {...defaultProps} />);

    const buttons = container.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(4); // 3 quick + More
  });

  it('should call onReact when React quick action is clicked', () => {
    const onReact = vi.fn();
    render(<MessageActionsMenu {...defaultProps} onReact={onReact} />);

    // Quick actions are the first 3 buttons
    const buttons = screen.getAllByRole('button');
    // React is first quick action
    fireEvent.click(buttons[0]);

    expect(onReact).toHaveBeenCalled();
  });

  it('should call onReply when Reply quick action is clicked', () => {
    const onReply = vi.fn();
    render(<MessageActionsMenu {...defaultProps} onReply={onReply} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Reply is second

    expect(onReply).toHaveBeenCalled();
  });

  it('should call onForward when Forward quick action is clicked', () => {
    const onForward = vi.fn();
    render(<MessageActionsMenu {...defaultProps} onForward={onForward} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[2]); // Forward is third

    expect(onForward).toHaveBeenCalled();
  });

  it('should show "More actions" button', () => {
    render(<MessageActionsMenu {...defaultProps} />);
    expect(screen.getByTitle('More actions')).toBeInTheDocument();
  });

  it('should show delete action only for own messages', () => {
    render(<MessageActionsMenu {...defaultProps} isOwn={true} />);

    // Open more menu
    fireEvent.click(screen.getByTitle('More actions'));

    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('should not show delete action for others messages', () => {
    render(<MessageActionsMenu {...defaultProps} isOwn={false} />);

    // Open more menu
    fireEvent.click(screen.getByTitle('More actions'));

    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('should show "Pin" for unpinned messages', () => {
    render(<MessageActionsMenu {...defaultProps} isPinned={false} />);

    fireEvent.click(screen.getByTitle('More actions'));

    expect(screen.getByText('Pin')).toBeInTheDocument();
  });

  it('should show "Unpin" for pinned messages', () => {
    render(<MessageActionsMenu {...defaultProps} isPinned={true} />);

    fireEvent.click(screen.getByTitle('More actions'));

    expect(screen.getByText('Unpin')).toBeInTheDocument();
  });

  it('should call onCopy from more menu', () => {
    const onCopy = vi.fn();
    render(<MessageActionsMenu {...defaultProps} onCopy={onCopy} />);

    fireEvent.click(screen.getByTitle('More actions'));
    fireEvent.click(screen.getByText('Copy'));

    expect(onCopy).toHaveBeenCalled();
  });

  it('should call onPin from more menu', () => {
    const onPin = vi.fn();
    render(<MessageActionsMenu {...defaultProps} onPin={onPin} />);

    fireEvent.click(screen.getByTitle('More actions'));
    fireEvent.click(screen.getByText('Pin'));

    expect(onPin).toHaveBeenCalled();
  });
});
