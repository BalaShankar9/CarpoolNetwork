// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PhoneInputWithOTP from '../src/components/auth/PhoneInputWithOTP';
import { supabase } from '../src/lib/supabase';

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      signInWithOtp: vi.fn(),
      verifyOtp: vi.fn(),
    },
  },
}));

describe('PhoneInputWithOTP', () => {
  it('shows a clear message when OTP signups are disabled', async () => {
    const supabaseMock = supabase as unknown as {
      auth: { signInWithOtp: ReturnType<typeof vi.fn> };
    };
    supabaseMock.auth.signInWithOtp.mockResolvedValue({
      error: { message: 'Signups not allowed for otp' },
    });

    render(<PhoneInputWithOTP onVerified={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('7700 900000'), {
      target: { value: '7700 900000' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Send Verification Code/i }));

    expect(
      await screen.findByText(/Signups are currently disabled/i)
    ).toBeInTheDocument();
  });
});
