/**
 * CookieConsent Banner
 *
 * UK PECR / UK GDPR compliant cookie consent notice.
 * Shows on first visit; remembers preference in localStorage.
 * Appears as a bottom banner so it doesn't block the page.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'cookie_consent_v1';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      // Slight delay so it doesn't flash instantly on page load
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept(type: 'all' | 'essential') {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ type, date: new Date().toISOString() })
    );
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent notice"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t border-gray-200 shadow-2xl"
    >
      <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        {/* Message */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <Cookie className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700 leading-relaxed">
            We use cookies to keep you signed in, remember your preferences, and analyse site usage.
            By clicking <strong>"Accept All"</strong> you consent to our use of analytics cookies.{' '}
            <Link
              to="/cookies"
              className="text-red-600 underline hover:text-red-700 font-medium whitespace-nowrap"
            >
              Cookie Policy
            </Link>
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0 w-full sm:w-auto">
          <button
            onClick={() => accept('essential')}
            className="flex-1 sm:flex-none px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
          >
            Essential Only
          </button>
          <button
            onClick={() => accept('all')}
            className="flex-1 sm:flex-none px-5 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-orange-500 rounded-lg hover:from-red-600 hover:to-orange-600 transition-all whitespace-nowrap"
          >
            Accept All
          </button>
          <button
            onClick={() => accept('essential')}
            aria-label="Dismiss — essential cookies only"
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
