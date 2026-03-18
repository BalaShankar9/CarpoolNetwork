// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

/* ─── hoisted mocks ─── */
const mocks = vi.hoisted(() => ({
  language: 'en' as string,
  setLanguage: vi.fn(),
}));

vi.mock('../../src/contexts/I18nContext', () => ({
  useI18n: () => ({
    language: mocks.language,
    setLanguage: mocks.setLanguage,
    languageInfo: {
      en: { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
      es: { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
      fr: { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
      de: { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
    }[mocks.language] || { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    t: (key: string) => key,
  }),
  SUPPORTED_LANGUAGES: [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  ],
  SupportedLanguage: {},
}));

vi.mock('framer-motion', () => {
  const React = require('react');
  return {
    motion: new Proxy({}, {
      get: (_t: any, prop: string) =>
        React.forwardRef((p: any, ref: any) => {
          const { initial, animate, transition, whileHover, whileTap, exit, variants, ...rest } = p;
          return React.createElement(prop, { ...rest, ref });
        }),
    }),
    AnimatePresence: ({ children }: any) => children,
  };
});

vi.mock('lucide-react', () => {
  const React = require('react');
  const s = (n: string) => (props: any) => React.createElement('span', { 'data-testid': `icon-${n}`, ...props });
  return {
    Globe: s('Globe'), Check: s('Check'), ChevronDown: s('ChevronDown'), Search: s('Search'),
  };
});

import { LanguageSelector } from '../../src/components/i18n/LanguageSelector';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.language = 'en';
  mocks.setLanguage = vi.fn();
});
afterEach(cleanup);

/* ═══════════════════════════════════════
   Dropdown variant (default)
   ═══════════════════════════════════════ */
describe('LanguageSelector – dropdown', () => {
  it('shows current language name', () => {
    render(<LanguageSelector />);
    // English appears as both name and nativeName
    expect(screen.getAllByText('English').length).toBeGreaterThanOrEqual(1);
  });

  it('shows current language flag', () => {
    render(<LanguageSelector />);
    expect(screen.getByText('🇬🇧')).toBeTruthy();
  });

  it('opens dropdown on click', () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getAllByText('English')[0]);
    expect(screen.getByText('Español')).toBeTruthy();
    expect(screen.getByText('Français')).toBeTruthy();
    expect(screen.getByText('Deutsch')).toBeTruthy();
  });

  it('shows search input in dropdown', () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getAllByText('English')[0]);
    // The placeholder uses t('common.search') which returns the key
    expect(screen.getAllByPlaceholderText('common.search').length).toBeGreaterThanOrEqual(1);
  });

  it('selects a language', () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getAllByText('English')[0]);
    fireEvent.click(screen.getByText('Español'));
    expect(mocks.setLanguage).toHaveBeenCalledWith('es');
  });

  it('shows check mark next to current language', () => {
    render(<LanguageSelector />);
    fireEvent.click(screen.getAllByText('English')[0]);
    const checks = document.querySelectorAll('[data-testid="icon-Check"]');
    expect(checks.length).toBeGreaterThanOrEqual(1);
  });

  it('shows Globe icon', () => {
    render(<LanguageSelector />);
    expect(document.querySelector('[data-testid="icon-Globe"]')).toBeTruthy();
  });

  it('hides native name when showNativeName=false', () => {
    render(<LanguageSelector showNativeName={false} />);
    // With showNativeName=false only one 'English' should show (the name, not the nativeName)
    const matches = screen.getAllByText('English');
    expect(matches.length).toBe(1);
  });
});

/* ═══════════════════════════════════════
   List variant
   ═══════════════════════════════════════ */
describe('LanguageSelector – list', () => {
  it('shows all languages without needing to click', () => {
    render(<LanguageSelector variant="list" />);
    expect(screen.getAllByText('English').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Español')).toBeTruthy();
    expect(screen.getByText('Français')).toBeTruthy();
    expect(screen.getByText('Deutsch')).toBeTruthy();
  });

  it('shows search input', () => {
    render(<LanguageSelector variant="list" />);
    expect(screen.getByPlaceholderText('common.search')).toBeTruthy();
  });

  it('filters languages by search', () => {
    render(<LanguageSelector variant="list" />);
    const input = screen.getByPlaceholderText('common.search');
    fireEvent.change(input, { target: { value: 'Fran' } });
    expect(screen.getByText('Français')).toBeTruthy();
    expect(screen.queryByText('Deutsch')).toBeNull();
  });

  it('shows "No languages found" for no match', () => {
    render(<LanguageSelector variant="list" />);
    const input = screen.getByPlaceholderText('common.search');
    fireEvent.change(input, { target: { value: 'zzzzz' } });
    expect(screen.getByText('No languages found')).toBeTruthy();
  });

  it('selects language on click', () => {
    render(<LanguageSelector variant="list" />);
    fireEvent.click(screen.getByText('Français'));
    expect(mocks.setLanguage).toHaveBeenCalledWith('fr');
  });

  it('shows flags', () => {
    render(<LanguageSelector variant="list" />);
    expect(screen.getByText('🇪🇸')).toBeTruthy();
    expect(screen.getByText('🇫🇷')).toBeTruthy();
  });

  it('hides flags when showFlag=false', () => {
    render(<LanguageSelector variant="list" showFlag={false} />);
    expect(screen.queryByText('🇪🇸')).toBeNull();
  });
});

/* ═══════════════════════════════════════
   Compact variant
   ═══════════════════════════════════════ */
describe('LanguageSelector – compact', () => {
  it('shows flag button', () => {
    render(<LanguageSelector variant="compact" />);
    expect(screen.getByText('🇬🇧')).toBeTruthy();
  });

  it('opens dropdown on click', () => {
    render(<LanguageSelector variant="compact" />);
    const btn = screen.getByLabelText('settings.language');
    fireEvent.click(btn);
    expect(screen.getByText('Español')).toBeTruthy();
  });

  it('selects language in compact dropdown', () => {
    render(<LanguageSelector variant="compact" />);
    const btn = screen.getByLabelText('settings.language');
    fireEvent.click(btn);
    fireEvent.click(screen.getByText('Deutsch'));
    expect(mocks.setLanguage).toHaveBeenCalledWith('de');
  });

  it('shows ChevronDown icon', () => {
    render(<LanguageSelector variant="compact" />);
    expect(document.querySelector('[data-testid="icon-ChevronDown"]')).toBeTruthy();
  });
});
