// @vitest-environment jsdom
/**
 * Profile module – Batch 3
 *  • DocumentUploadCenter     (10 tests)
 *  • EmergencyContactsManager (12 tests)
 *  • VehicleManager           (13 tests)
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import {
  FAKE_USER,
  FAKE_PROFILE,
  FAKE_DRIVER_LICENSE,
  FAKE_INSURANCE,
  FAKE_VEHICLE,
  FAKE_EMERGENCY_CONTACT,
  buildMockChain,
  makeVehicle,
  makeEmergencyContact,
  makeInsurance,
} from './helpers';

// ---- hoisted mocks --------------------------------------------------------

const mocks = vi.hoisted(() => ({
  mockProfile: null as any,
  mockUser: null as any,
  mockNavigate: vi.fn(),
  mockGetUserVehicles: vi.fn(),
  mockDeactivateVehicle: vi.fn(),
  mockSupabase: {
    from: vi.fn(),
    rpc: vi.fn(),
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'tok' } } }) },
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn().mockResolvedValue({ error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://img.example.com/car.jpg' } }),
      })),
    },
  },
}));

// ---- module mocks ---------------------------------------------------------

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mocks.mockUser, profile: mocks.mockProfile }),
}));

vi.mock('../../src/lib/supabase', () => ({
  supabase: mocks.mockSupabase,
}));

vi.mock('../../src/services/vehicleService', () => ({
  getUserVehicles: mocks.mockGetUserVehicles,
  deactivateVehicle: mocks.mockDeactivateVehicle,
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.mockNavigate,
  Link: ({ to, children, ...p }: any) => <a href={to} {...p}>{children}</a>,
}));

vi.mock('lucide-react', () => {
  const stub = (name: string) => {
    const C = (p: any) => <span data-testid={`icon-${name}`} {...p} />;
    C.displayName = name;
    return C;
  };
  return {
    FileText: stub('FileText'), Upload: stub('Upload'), CheckCircle: stub('CheckCircle'),
    Clock: stub('Clock'), XCircle: stub('XCircle'), AlertTriangle: stub('AlertTriangle'),
    Calendar: stub('Calendar'), Shield: stub('Shield'), Car: stub('Car'), X: stub('X'),
    Edit: stub('Edit'), Trash2: stub('Trash2'), Plus: stub('Plus'), Search: stub('Search'),
    AlertCircle: stub('AlertCircle'), Loader: stub('Loader'), Check: stub('Check'),
    Phone: stub('Phone'), UserPlus: stub('UserPlus'),
  };
});

// ---- imports under test ---------------------------------------------------

import DocumentUploadCenter from '../../src/components/profile/DocumentUploadCenter';
import EmergencyContactsManager from '../../src/components/profile/EmergencyContactsManager';
import VehicleManager from '../../src/components/profile/VehicleManager';

// ===========================================================================
// DocumentUploadCenter
// ===========================================================================
describe('DocumentUploadCenter', () => {
  beforeEach(() => {
    mocks.mockProfile = { ...FAKE_PROFILE };
    mocks.mockUser = { ...FAKE_USER };
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  function setupDocs(license: any = null, insurances: any[] = []) {
    mocks.mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'driver_licenses') return buildMockChain(license ? [license] : []);
      if (table === 'vehicle_insurance') return buildMockChain(insurances);
      return buildMockChain([]);
    });
  }

  it('shows loading spinner initially', () => {
    mocks.mockSupabase.from.mockImplementation(() => {
      const c = buildMockChain([]);
      c.maybeSingle = vi.fn().mockReturnValue(new Promise(() => {}));
      c.then = () => new Promise(() => {});
      return c;
    });
    render(<DocumentUploadCenter />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders "Document Verification" heading', async () => {
    setupDocs();
    render(<DocumentUploadCenter />);
    await waitFor(() => {
      expect(screen.getByText('Document Verification')).toBeInTheDocument();
    });
  });

  it('shows "Upload Driver\'s License" when no license', async () => {
    setupDocs(null, []);
    render(<DocumentUploadCenter />);
    await waitFor(() => {
      expect(screen.getByText("Upload Driver's License")).toBeInTheDocument();
    });
  });

  it('shows license details when license exists', async () => {
    setupDocs(FAKE_DRIVER_LICENSE, []);
    render(<DocumentUploadCenter />);
    await waitFor(() => {
      expect(screen.getByText('SMITH90106AB1CD')).toBeInTheDocument();
    });
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('UK')).toBeInTheDocument();
  });

  it('shows Verified badge for verified license', async () => {
    setupDocs(FAKE_DRIVER_LICENSE, []);
    render(<DocumentUploadCenter />);
    await waitFor(() => {
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });
  });

  it('shows rejection reason for rejected license', async () => {
    const rejected = { ...FAKE_DRIVER_LICENSE, status: 'rejected', rejection_reason: 'Blurry image' };
    setupDocs(rejected, []);
    render(<DocumentUploadCenter />);
    await waitFor(() => {
      expect(screen.getByText('Blurry image')).toBeInTheDocument();
    });
  });

  it('shows "No insurance documents" when empty', async () => {
    setupDocs(null, []);
    render(<DocumentUploadCenter />);
    await waitFor(() => {
      expect(screen.getByText('No insurance documents uploaded yet')).toBeInTheDocument();
    });
  });

  it('shows insurance card details', async () => {
    setupDocs(null, [FAKE_INSURANCE]);
    render(<DocumentUploadCenter />);
    await waitFor(() => {
      expect(screen.getByText('Aviva')).toBeInTheDocument();
    });
    expect(screen.getByText(/POL-123456/)).toBeInTheDocument();
  });

  it('opens license form on button click', async () => {
    setupDocs(null, []);
    render(<DocumentUploadCenter />);
    await waitFor(() => {
      expect(screen.getByText("Upload Driver's License")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText("Upload Driver's License"));
    await waitFor(() => {
      expect(screen.getByText('License Number')).toBeInTheDocument();
    });
  });

  it('opens insurance form on Add Insurance click', async () => {
    setupDocs(null, []);
    render(<DocumentUploadCenter />);
    await waitFor(() => {
      expect(screen.getByText('Add Insurance')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add Insurance'));
    await waitFor(() => {
      expect(screen.getByText('Policy Number')).toBeInTheDocument();
    });
  });
});

// ===========================================================================
// EmergencyContactsManager
// ===========================================================================
describe('EmergencyContactsManager', () => {
  beforeEach(() => {
    mocks.mockProfile = { ...FAKE_PROFILE };
    mocks.mockUser = { ...FAKE_USER };
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  function setupContacts(contacts: any[] = []) {
    mocks.mockSupabase.from.mockImplementation(() => buildMockChain(contacts));
  }

  it('shows loading spinner initially', () => {
    mocks.mockSupabase.from.mockImplementation(() => {
      const c = buildMockChain([]);
      c.then = () => new Promise(() => {});
      return c;
    });
    render(<EmergencyContactsManager />);
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders heading', async () => {
    setupContacts([]);
    render(<EmergencyContactsManager />);
    await waitFor(() => {
      expect(screen.getByText('Emergency Contacts')).toBeInTheDocument();
    });
  });

  it('shows empty state when no contacts', async () => {
    setupContacts([]);
    render(<EmergencyContactsManager />);
    await waitFor(() => {
      expect(screen.getByText('No emergency contacts added')).toBeInTheDocument();
    });
    expect(screen.getByText('Add First Contact')).toBeInTheDocument();
  });

  it('renders contact card with name, phone, primary badge', async () => {
    setupContacts([FAKE_EMERGENCY_CONTACT]);
    render(<EmergencyContactsManager />);
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    expect(screen.getByText('+447700900002')).toBeInTheDocument();
    expect(screen.getByText('Primary')).toBeInTheDocument();
  });

  it('shows relationship', async () => {
    setupContacts([FAKE_EMERGENCY_CONTACT]);
    render(<EmergencyContactsManager />);
    await waitFor(() => {
      expect(screen.getByText('spouse')).toBeInTheDocument();
    });
  });

  it('shows Edit and Delete buttons', async () => {
    setupContacts([FAKE_EMERGENCY_CONTACT]);
    render(<EmergencyContactsManager />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('opens add form when clicking Add Contact', async () => {
    setupContacts([FAKE_EMERGENCY_CONTACT]);
    render(<EmergencyContactsManager />);
    await waitFor(() => {
      expect(screen.getByText('Add Contact')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add Contact'));
    expect(screen.getByText('Add New Contact')).toBeInTheDocument();
  });

  it('opens edit form when clicking Edit', async () => {
    setupContacts([FAKE_EMERGENCY_CONTACT]);
    render(<EmergencyContactsManager />);
    await waitFor(() => {
      expect(screen.getByText('Edit')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Edit'));
    expect(screen.getByText('Edit Contact')).toBeInTheDocument();
  });

  it('shows cancel button in form', async () => {
    setupContacts([]);
    render(<EmergencyContactsManager />);
    await waitFor(() => {
      expect(screen.getByText('Add First Contact')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add First Contact'));
    const cancelButtons = screen.getAllByText('Cancel');
    expect(cancelButtons.length).toBeGreaterThan(0);
  });

  it('shows relationship dropdown in form', async () => {
    setupContacts([]);
    render(<EmergencyContactsManager />);
    await waitFor(() => {
      expect(screen.getByText('Add First Contact')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add First Contact'));
    expect(screen.getByText('Relationship')).toBeInTheDocument();
    expect(screen.getByText('Spouse')).toBeInTheDocument();
  });

  it('shows notification note when contacts exist', async () => {
    setupContacts([FAKE_EMERGENCY_CONTACT]);
    render(<EmergencyContactsManager />);
    await waitFor(() => {
      expect(screen.getByText(/emergency contacts will be notified/)).toBeInTheDocument();
    });
  });

  it('renders multiple contacts', async () => {
    const contacts = [
      FAKE_EMERGENCY_CONTACT,
      makeEmergencyContact({ name: 'Jane Doe', phone: '+447700900003', is_primary: false, relationship: 'friend' }),
    ];
    setupContacts(contacts);
    render(<EmergencyContactsManager />);
    await waitFor(() => {
      expect(screen.getByText('John Smith')).toBeInTheDocument();
    });
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });
});

// ===========================================================================
// VehicleManager
// ===========================================================================
describe('VehicleManager', () => {
  beforeEach(() => {
    mocks.mockProfile = { ...FAKE_PROFILE };
    mocks.mockUser = { ...FAKE_USER };
    mocks.mockGetUserVehicles.mockResolvedValue({ data: [], error: null });
    mocks.mockDeactivateVehicle.mockResolvedValue({ data: null, error: null });
    vi.clearAllMocks();
  });
  afterEach(cleanup);

  function setupVehicles(vehicles: any[] = []) {
    mocks.mockGetUserVehicles.mockResolvedValue({ data: vehicles, error: null });
  }

  it('renders "My Vehicles" heading', async () => {
    setupVehicles([]);
    render(<VehicleManager />);
    await waitFor(() => {
      expect(screen.getByText('My Vehicles')).toBeInTheDocument();
    });
  });

  it('shows empty state when no vehicles', async () => {
    setupVehicles([]);
    render(<VehicleManager />);
    await waitFor(() => {
      expect(screen.getByText('No vehicles yet')).toBeInTheDocument();
    });
    expect(screen.getByText('Add Your First Vehicle')).toBeInTheDocument();
  });

  it('shows "Add Vehicle" button', async () => {
    setupVehicles([]);
    render(<VehicleManager />);
    await waitFor(() => {
      expect(screen.getByText('Add Vehicle')).toBeInTheDocument();
    });
  });

  it('renders vehicle card with details', async () => {
    setupVehicles([FAKE_VEHICLE]);
    render(<VehicleManager />);
    await waitFor(() => {
      expect(screen.getByText('Toyota Corolla')).toBeInTheDocument();
    });
    expect(screen.getByText(/2022/)).toBeInTheDocument();
    expect(screen.getByText(/Silver/)).toBeInTheDocument();
    expect(screen.getByText(/AB12CDE/)).toBeInTheDocument();
  });

  it('shows capacity and fuel type', async () => {
    setupVehicles([FAKE_VEHICLE]);
    render(<VehicleManager />);
    await waitFor(() => {
      expect(screen.getByText(/4 seats/)).toBeInTheDocument();
    });
    expect(screen.getByText(/petrol/)).toBeInTheDocument();
  });

  it('opens form when clicking Add Vehicle', async () => {
    setupVehicles([]);
    render(<VehicleManager />);
    await waitFor(() => {
      expect(screen.getByText('Add Vehicle')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add Vehicle'));
    expect(screen.getByText('Add New Vehicle')).toBeInTheDocument();
  });

  it('shows lookup mode by default in add form', async () => {
    setupVehicles([]);
    render(<VehicleManager />);
    await waitFor(() => {
      expect(screen.getByText('Add Vehicle')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add Vehicle'));
    expect(screen.getByPlaceholderText('e.g., BV67FHU')).toBeInTheDocument();
    expect(screen.getByText('Lookup')).toBeInTheDocument();
  });

  it('switches to manual entry mode', async () => {
    setupVehicles([]);
    render(<VehicleManager />);
    await waitFor(() => {
      expect(screen.getByText('Add Vehicle')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('Add Vehicle'));
    fireEvent.click(screen.getByText(/enter details manually/));
    expect(screen.getByPlaceholderText('e.g., Toyota')).toBeInTheDocument();
  });

  it('renders multiple vehicles', async () => {
    const vehicles = [
      FAKE_VEHICLE,
      makeVehicle({ make: 'Honda', model: 'Civic', year: 2023, color: 'Blue', license_plate: 'XY34ZZZ' }),
    ];
    setupVehicles(vehicles);
    render(<VehicleManager />);
    await waitFor(() => {
      expect(screen.getByText('Toyota Corolla')).toBeInTheDocument();
    });
    expect(screen.getByText('Honda Civic')).toBeInTheDocument();
  });

  it('shows delete confirmation dialog', async () => {
    setupVehicles([FAKE_VEHICLE]);
    render(<VehicleManager />);
    await waitFor(() => {
      expect(screen.getByText('Toyota Corolla')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByLabelText('Delete vehicle'));
    expect(screen.getAllByText('Delete Vehicle').length).toBeGreaterThan(0);
    expect(screen.getByText(/This action cannot be undone/)).toBeInTheDocument();
  });

  it('shows vehicle image when photo url exists', async () => {
    setupVehicles([FAKE_VEHICLE]);
    render(<VehicleManager />);
    await waitFor(() => {
      const img = screen.getByAltText('Toyota Corolla');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://example.com/car.jpg');
    });
  });

  it('shows car icon placeholder when no photo', async () => {
    setupVehicles([{ ...FAKE_VEHICLE, vehicle_photo_url: null, image_url: null }]);
    render(<VehicleManager />);
    await waitFor(() => {
      expect(screen.getByText('Toyota Corolla')).toBeInTheDocument();
    });
    // Car icon placeholder is present
    expect(screen.getAllByTestId('icon-Car').length).toBeGreaterThan(0);
  });
});
