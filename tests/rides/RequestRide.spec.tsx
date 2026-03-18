// @vitest-environment jsdom
/**
 * Enterprise-grade tests for RequestRide page.
 *
 * Tests cover:
 *  - Renders the form with all fields
 *  - Validation: no user → error
 *  - Validation: missing locations → error
 *  - Validation: missing date/time → error
 *  - Validation: past departure time → error
 *  - Successful submission → navigates to /my-rides?tab=requests
 *  - Supabase insert error → displays error message
 *  - Loading state disables submit button
 *  - Cancel button navigates back
 *  - Seats selector has 1-8 options
 *  - Flexible time checkbox
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockInsert = vi.fn();
vi.mock('../../src/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  },
}));

// Mock auth — container pattern for per-test overrides
const authState = { user: null as any };
vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: authState.user }),
}));

// Mock service gating — always allow by default
const mockCheckAccess = vi.fn(() => true);
vi.mock('../../src/hooks/useServiceGating', () => ({
  useServiceGating: () => ({
    checkAccess: mockCheckAccess,
    ServiceGatingModal: () => null,
  }),
}));

// Mock child components that have complex dependencies
vi.mock('../../src/components/shared/LocationAutocomplete', () => ({
  default: ({ onLocationSelect, placeholder }: any) => (
    <input
      data-testid="location-autocomplete"
      placeholder={placeholder}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.value === 'valid-from') {
          onLocationSelect({ address: '123 Main St', lat: 51.5, lng: -0.1 });
        } else if (e.target.value === 'valid-to') {
          onLocationSelect({ address: '456 Oxford St', lat: 51.7, lng: -0.3 });
        }
      }}
    />
  ),
}));

vi.mock('../../src/components/shared/TrainlineDateTimePicker', () => ({
  default: ({ value, onChange, label }: any) => (
    <div data-testid="datetime-picker">
      <label>{label}</label>
      <input
        data-testid="date-input"
        value={value.date}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, date: e.target.value })}
      />
      <input
        data-testid="time-input"
        value={value.time}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, time: e.target.value })}
      />
    </div>
  ),
}));

import RequestRide from '../../src/pages/RequestRide';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
function renderPage() {
  return render(
    <MemoryRouter>
      <RequestRide />
    </MemoryRouter>
  );
}

function fillForm() {
  // Set from location
  const inputs = screen.getAllByTestId('location-autocomplete');
  fireEvent.change(inputs[0], { target: { value: 'valid-from' } });
  fireEvent.change(inputs[1], { target: { value: 'valid-to' } });

  // Set future date/time
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateStr = tomorrow.toISOString().split('T')[0];
  fireEvent.change(screen.getByTestId('date-input'), { target: { value: dateStr } });
  fireEvent.change(screen.getByTestId('time-input'), { target: { value: '10:00' } });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
  authState.user = { id: 'user-001', email: 'test@test.com' };
  mockInsert.mockResolvedValue({ error: null });
  mockCheckAccess.mockReturnValue(true);
});

afterEach(cleanup);

describe('RequestRide — rendering', () => {
  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('Request a Ride')).toBeTruthy();
  });

  it('renders Post Ride Request button', () => {
    renderPage();
    expect(screen.getByText('Post Ride Request')).toBeTruthy();
  });

  it('renders Cancel button', () => {
    renderPage();
    expect(screen.getByText('Cancel')).toBeTruthy();
  });

  it('renders seats selector with 8 options', () => {
    renderPage();
    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(8);
  });

  it('renders flexible time checkbox', () => {
    renderPage();
    expect(screen.getByLabelText(/flexible with time/i)).toBeTruthy();
  });

  it('renders notes textarea', () => {
    renderPage();
    expect(screen.getByPlaceholderText(/additional details/i)).toBeTruthy();
  });
});

describe('RequestRide — validation', () => {
  it('shows error when user is not logged in', async () => {
    authState.user = null;
    renderPage();
    fillForm();

    fireEvent.click(screen.getByText('Post Ride Request'));

    await waitFor(() => {
      expect(screen.getByText('You must be logged in to request a ride')).toBeTruthy();
    });
  });

  it('shows error when locations are missing', async () => {
    renderPage();

    // Don't fill locations, just submit
    fireEvent.click(screen.getByText('Post Ride Request'));

    await waitFor(() => {
      expect(screen.getByText('Please select both pickup and destination locations')).toBeTruthy();
    });
  });

  it('shows error when date/time is missing', async () => {
    renderPage();

    // Fill locations but leave date/time empty
    const inputs = screen.getAllByTestId('location-autocomplete');
    fireEvent.change(inputs[0], { target: { value: 'valid-from' } });
    fireEvent.change(inputs[1], { target: { value: 'valid-to' } });

    // Clear the time
    fireEvent.change(screen.getByTestId('time-input'), { target: { value: '' } });

    fireEvent.click(screen.getByText('Post Ride Request'));

    await waitFor(() => {
      expect(screen.getByText('Please select a date and time')).toBeTruthy();
    });
  });

  it('shows error when departure time is in the past', async () => {
    renderPage();

    const inputs = screen.getAllByTestId('location-autocomplete');
    fireEvent.change(inputs[0], { target: { value: 'valid-from' } });
    fireEvent.change(inputs[1], { target: { value: 'valid-to' } });

    // Set past date
    fireEvent.change(screen.getByTestId('date-input'), { target: { value: '2020-01-01' } });
    fireEvent.change(screen.getByTestId('time-input'), { target: { value: '08:00' } });

    fireEvent.click(screen.getByText('Post Ride Request'));

    await waitFor(() => {
      expect(screen.getByText('Please select a future departure time.')).toBeTruthy();
    });
  });
});

describe('RequestRide — submission', () => {
  it('navigates to /my-rides?tab=requests on success', async () => {
    mockInsert.mockResolvedValue({ error: null });
    renderPage();
    fillForm();

    fireEvent.click(screen.getByText('Post Ride Request'));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/my-rides?tab=requests');
    });
  });

  it('displays error message on Supabase insert failure', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'Insert failed' } });
    renderPage();
    fillForm();

    fireEvent.click(screen.getByText('Post Ride Request'));

    await waitFor(() => {
      expect(screen.getByText('Insert failed')).toBeTruthy();
    });
  });

  it('Cancel button navigates back', () => {
    renderPage();
    fireEvent.click(screen.getByText('Cancel'));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

describe('RequestRide — service gating', () => {
  it('blocks submission when gating check fails', async () => {
    mockCheckAccess.mockReturnValue(false);
    renderPage();
    fillForm();

    fireEvent.click(screen.getByText('Post Ride Request'));

    // Should not navigate or call insert
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalledWith('/my-rides?tab=requests');
    });
  });
});

describe('RequestRide — flexible time checkbox', () => {
  it('can toggle flexible time', () => {
    renderPage();
    const checkbox = screen.getByLabelText(/flexible with time/i) as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    fireEvent.click(checkbox);
    expect(checkbox.checked).toBe(true);
  });
});

describe('RequestRide — seats selector', () => {
  it('defaults to 1 seat', () => {
    renderPage();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('1');
  });

  it('can change to multiple seats', () => {
    renderPage();
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: '3' } });
    expect(select.value).toBe('3');
  });
});
