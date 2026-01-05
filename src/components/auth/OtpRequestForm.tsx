import { useState, useEffect, useRef } from 'react';
import { Mail, Phone, Loader2 } from 'lucide-react';
import { getRuntimeConfig } from '../../lib/runtimeConfig';
import { normalizePhoneNumber } from '../../utils/phone';

interface OtpRequestFormProps {
  onSendOTP: (identifier: string, isPhone: boolean) => Promise<void>;
  disabled?: boolean;
}

const REGION_TO_COUNTRY_CODE: Record<string, string> = {
  AU: '+61',
  CA: '+1',
  DE: '+49',
  ES: '+34',
  FR: '+33',
  GB: '+44',
  IN: '+91',
  IT: '+39',
  NG: '+234',
  SG: '+65',
  US: '+1',
  ZA: '+27',
  AE: '+971',
};

const resolveCountryCodeFromLocale = () => {
  if (typeof navigator === 'undefined') return null;

  const locale = (navigator.languages && navigator.languages[0]) || navigator.language || '';
  let region = '';

  try {
    const LocaleCtor = (Intl as any)?.Locale;
    if (LocaleCtor) {
      const intlLocale = new LocaleCtor(locale);
      region = intlLocale.region ? intlLocale.region.toUpperCase() : '';
    }
  } catch {
    region = '';
  }

  if (!region) {
    const match = locale.match(/[-_](\w{2})\b/);
    if (match) {
      region = match[1].toUpperCase();
    }
  }

  if (!region) return null;
  return REGION_TO_COUNTRY_CODE[region] || null;
};

const lookupCountryCodeFromCoords = async (lat: number, lng: number, apiKey: string) => {
  if (!apiKey) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&result_type=country&key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) return null;

  const data: any = await response.json();
  const results = data.results || [];

  for (const result of results) {
    const components = result.address_components || [];
    const country = components.find((component: any) => component.types?.includes('country'));
    const region = country?.short_name?.toUpperCase();
    if (region && REGION_TO_COUNTRY_CODE[region]) {
      return REGION_TO_COUNTRY_CODE[region];
    }
  }

  return null;
};

export default function OtpRequestForm({ onSendOTP, disabled = false }: OtpRequestFormProps) {
  const [identifier, setIdentifier] = useState('');
  const [countryCode, setCountryCode] = useState('+44');
  const [manualCountryCode, setManualCountryCode] = useState(false);
  const [locationLookupState, setLocationLookupState] = useState<'idle' | 'pending' | 'done'>('idle');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');
  const [mapsApiKey, setMapsApiKey] = useState('');
  const manualCountryCodeRef = useRef(manualCountryCode);

  const OTP_COOLDOWN_SECONDS = 60;

  useEffect(() => {
    manualCountryCodeRef.current = manualCountryCode;
  }, [manualCountryCode]);

  useEffect(() => {
    let active = true;

    getRuntimeConfig()
      .then((config) => {
        if (active) {
          setMapsApiKey(config.mapsApiKey);
        }
      })
      .catch(() => {
        if (active) {
          setMapsApiKey('');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const trimmedIdentifier = identifier.trim();
  const digitsOnly = trimmedIdentifier.replace(/\D/g, '');
  const hasEmailToken = trimmedIdentifier.includes('@');
  const isPhone = !hasEmailToken && (trimmedIdentifier.startsWith('+') || digitsOnly.length > 0);
  const phoneNormalization = isPhone ? normalizePhoneNumber(trimmedIdentifier, countryCode) : null;
  const normalizedPhone = phoneNormalization?.e164 || '';
  const phoneFormatValid = !isPhone || !!phoneNormalization?.isValid;

  useEffect(() => {
    if (manualCountryCode) return;
    if (typeof navigator === 'undefined') return;

    const code = resolveCountryCodeFromLocale();
    if (code) setCountryCode(code);
  }, [manualCountryCode]);

  useEffect(() => {
    if (!isPhone) return;
    if (manualCountryCode) return;
    if (locationLookupState !== 'idle') return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    if (!mapsApiKey) return;

    let cancelled = false;

    const markDone = () => {
      if (!cancelled) {
        setLocationLookupState('done');
      }
    };

    const resolveFromPosition = async (position: GeolocationPosition) => {
      const code = await lookupCountryCodeFromCoords(
        position.coords.latitude,
        position.coords.longitude,
        mapsApiKey
      );

      if (cancelled) return;

      if (code && !manualCountryCodeRef.current) {
        setCountryCode(code);
      }

      setLocationLookupState('done');
    };

    const requestLocation = async () => {
      try {
        if (navigator.permissions?.query) {
          const status = await navigator.permissions.query({ name: 'geolocation' });
          if (status.state === 'denied') {
            markDone();
            return;
          }
        }
      } catch {
        // Ignore permissions query errors.
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolveFromPosition(position).catch(markDone);
        },
        () => {
          markDone();
        },
        { maximumAge: 600000, timeout: 8000 }
      );
    };

    setLocationLookupState('pending');
    requestLocation();

    return () => {
      cancelled = true;
    };
  }, [isPhone, manualCountryCode, locationLookupState, mapsApiKey]);

  const countryOptions = [
    { code: '+44', label: 'UK (+44)' },
    { code: '+1', label: 'US/Canada (+1)' },
    { code: '+61', label: 'Australia (+61)' },
    { code: '+91', label: 'India (+91)' },
    { code: '+971', label: 'UAE (+971)' },
    { code: '+65', label: 'Singapore (+65)' },
    { code: '+49', label: 'Germany (+49)' },
    { code: '+33', label: 'France (+33)' },
    { code: '+34', label: 'Spain (+34)' },
    { code: '+39', label: 'Italy (+39)' },
    { code: '+27', label: 'South Africa (+27)' },
    { code: '+234', label: 'Nigeria (+234)' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmedIdentifier || cooldown > 0) return;

    if (isPhone && !phoneFormatValid) {
      setError(phoneNormalization?.error || 'Enter a valid phone number with country code (e.g., +44 7700 900000).');
      return;
    }

    setLoading(true);
    try {
      const payload = isPhone ? normalizedPhone : trimmedIdentifier;
      await onSendOTP(payload, isPhone);
      setCooldown(OTP_COOLDOWN_SECONDS);
      const interval = setInterval(() => {
        setCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="identifier" className="block text-sm font-medium text-gray-700 mb-2">
          Email or Phone Number
        </label>
        {isPhone && (
          <div className="mb-2">
            <label htmlFor="countryCode" className="block text-xs font-medium text-gray-500 mb-1">
              Country code
            </label>
            <select
              id="countryCode"
              value={countryCode}
              onChange={(e) => {
                setCountryCode(e.target.value);
                setManualCountryCode(true);
              }}
              disabled={disabled || loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
            >
              {countryOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="relative">
          {isPhone ? (
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          ) : (
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          )}
          <input
            id="identifier"
            type="text"
            value={identifier}
            onChange={(e) => {
              setIdentifier(e.target.value);
              if (error) setError('');
            }}
            placeholder="Email or phone"
            required
            disabled={disabled || loading}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          {isPhone
            ? 'Include country code (e.g., +44 7700 900000)'
            : "We'll send a one-time code to your email"}
        </p>
        {isPhone && digitsOnly.length > 0 && normalizedPhone && (
          <p className="mt-1 text-xs text-gray-500">
            Sending to: {normalizedPhone}
          </p>
        )}
        {error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </div>

      {cooldown > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2.5 rounded-lg text-sm">
          Please wait {cooldown} seconds before requesting another code.
        </div>
      )}

      <button
        type="submit"
        disabled={disabled || loading || !trimmedIdentifier || cooldown > 0 || !phoneFormatValid}
        className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Sending code...
          </>
        ) : (
          'Send Code'
        )}
      </button>
    </form>
  );
}
