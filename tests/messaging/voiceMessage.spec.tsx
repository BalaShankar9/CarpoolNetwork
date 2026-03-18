/**
 * voiceMessage.spec.tsx — Tests for VoiceMessagePlayer and VoiceMessageRecorder
 */

// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { VoiceMessagePlayer } from '../../src/components/messaging/VoiceMessagePlayer';
import { VoiceMessageRecorder } from '../../src/components/messaging/VoiceMessageRecorder';

afterEach(() => cleanup());

// ============================================================
// VoiceMessagePlayer
// ============================================================

describe('VoiceMessagePlayer', () => {
  const defaultProps = {
    audioUrl: 'https://example.com/audio.webm',
    duration: 45,
    senderName: 'Alice',
    isOwn: false,
  };

  it('should render play button', () => {
    render(<VoiceMessagePlayer {...defaultProps} />);
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
  });

  it('should render time display', () => {
    render(<VoiceMessagePlayer {...defaultProps} />);
    expect(screen.getByText('0:00 / 0:45')).toBeInTheDocument();
  });

  it('should render playback rate button starting at 1x', () => {
    render(<VoiceMessagePlayer {...defaultProps} />);
    expect(screen.getByText('1x')).toBeInTheDocument();
  });

  it('should render audio element with correct src', () => {
    const { container } = render(<VoiceMessagePlayer {...defaultProps} />);
    const audio = container.querySelector('audio');
    expect(audio).toBeTruthy();
    expect(audio!.getAttribute('src')).toBe('https://example.com/audio.webm');
  });

  it('should format duration correctly for > 60s', () => {
    render(<VoiceMessagePlayer {...defaultProps} duration={125} />);
    expect(screen.getByText('0:00 / 2:05')).toBeInTheDocument();
  });

  it('should format duration correctly for 0s', () => {
    render(<VoiceMessagePlayer {...defaultProps} duration={0} />);
    expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument();
  });

  it('should render 30 waveform bars', () => {
    const { container } = render(<VoiceMessagePlayer {...defaultProps} />);
    // Each bar has w-1 class
    const bars = container.querySelectorAll('.w-1');
    expect(bars).toHaveLength(30);
  });

  it('should apply different styles for own vs other messages', () => {
    const { container: ownContainer } = render(
      <VoiceMessagePlayer {...defaultProps} isOwn={true} />,
    );
    expect(ownContainer.querySelector('.bg-emerald-500\\/20')).toBeTruthy();

    cleanup();

    const { container: otherContainer } = render(
      <VoiceMessagePlayer {...defaultProps} isOwn={false} />,
    );
    expect(otherContainer.querySelector('.bg-slate-700\\/50')).toBeTruthy();
  });

  it('should toggle play/pause label', () => {
    render(<VoiceMessagePlayer {...defaultProps} />);

    const playBtn = screen.getByLabelText('Play');
    expect(playBtn).toBeInTheDocument();

    // Note: actual play won't work without real audio, but state toggles
    fireEvent.click(playBtn);

    // After click, label should change to Pause
    expect(screen.getByLabelText('Pause')).toBeInTheDocument();
  });
});

// ============================================================
// VoiceMessageRecorder
// ============================================================

describe('VoiceMessageRecorder', () => {
  const defaultProps = {
    onRecordingComplete: vi.fn(),
    maxDuration: 60,
    disabled: false,
  };

  it('should render mic button in idle state', () => {
    render(<VoiceMessageRecorder {...defaultProps} />);
    expect(screen.getByLabelText('Start voice recording')).toBeInTheDocument();
  });

  it('should disable mic button when disabled=true', () => {
    render(<VoiceMessageRecorder {...defaultProps} disabled />);
    expect(screen.getByLabelText('Start voice recording')).toBeDisabled();
  });

  it('should use custom maxDuration', () => {
    // Just verify it renders without error with custom duration
    render(<VoiceMessageRecorder {...defaultProps} maxDuration={30} />);
    expect(screen.getByLabelText('Start voice recording')).toBeInTheDocument();
  });

  it('should handle missing getUserMedia gracefully', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Mock getUserMedia to reject
    const mockGetUserMedia = vi.fn().mockRejectedValue(new Error('Not allowed'));
    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    });

    render(<VoiceMessageRecorder {...defaultProps} />);
    fireEvent.click(screen.getByLabelText('Start voice recording'));

    // Should not crash
    consoleSpy.mockRestore();
  });
});
