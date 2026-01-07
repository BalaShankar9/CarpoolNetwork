// Accessibility Context and Utilities
// High contrast mode, font sizing, reduced motion preferences

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AccessibilitySettings {
    highContrast: boolean;
    fontSize: 'small' | 'medium' | 'large' | 'xlarge';
    reducedMotion: boolean;
    screenReaderOptimized: boolean;
    colorBlindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
}

interface AccessibilityContextType {
    settings: AccessibilitySettings;
    updateSetting: <K extends keyof AccessibilitySettings>(
        key: K,
        value: AccessibilitySettings[K]
    ) => void;
    resetSettings: () => void;
    announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
}

const defaultSettings: AccessibilitySettings = {
    highContrast: false,
    fontSize: 'medium',
    reducedMotion: false,
    screenReaderOptimized: false,
    colorBlindMode: 'none'
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = 'carpool-accessibility-settings';

export function AccessibilityProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AccessibilitySettings>(() => {
        // Load from localStorage
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                try {
                    return { ...defaultSettings, ...JSON.parse(stored) };
                } catch {
                    return defaultSettings;
                }
            }
        }
        return defaultSettings;
    });

    // Check system preferences on mount
    useEffect(() => {
        // Check for reduced motion preference
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        if (motionQuery.matches && !localStorage.getItem(STORAGE_KEY)) {
            setSettings(prev => ({ ...prev, reducedMotion: true }));
        }

        // Check for high contrast preference
        const contrastQuery = window.matchMedia('(prefers-contrast: more)');
        if (contrastQuery.matches && !localStorage.getItem(STORAGE_KEY)) {
            setSettings(prev => ({ ...prev, highContrast: true }));
        }
    }, []);

    // Apply settings to document
    useEffect(() => {
        const root = document.documentElement;

        // Font size
        const fontSizes = {
            small: '14px',
            medium: '16px',
            large: '18px',
            xlarge: '20px'
        };
        root.style.setProperty('--base-font-size', fontSizes[settings.fontSize]);
        root.classList.toggle('text-sm', settings.fontSize === 'small');
        root.classList.toggle('text-lg', settings.fontSize === 'large');
        root.classList.toggle('text-xl', settings.fontSize === 'xlarge');

        // High contrast
        root.classList.toggle('high-contrast', settings.highContrast);

        // Reduced motion
        root.classList.toggle('reduce-motion', settings.reducedMotion);

        // Color blind modes
        root.classList.remove('colorblind-protanopia', 'colorblind-deuteranopia', 'colorblind-tritanopia');
        if (settings.colorBlindMode !== 'none') {
            root.classList.add(`colorblind-${settings.colorBlindMode}`);
        }

        // Save to localStorage
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    const updateSetting = <K extends keyof AccessibilitySettings>(
        key: K,
        value: AccessibilitySettings[K]
    ) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
        localStorage.removeItem(STORAGE_KEY);
    };

    // Screen reader announcement
    const announceToScreenReader = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
        const announcement = document.createElement('div');
        announcement.setAttribute('role', 'status');
        announcement.setAttribute('aria-live', priority);
        announcement.setAttribute('aria-atomic', 'true');
        announcement.className = 'sr-only';
        announcement.textContent = message;

        document.body.appendChild(announcement);

        // Remove after announcement
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    };

    return (
        <AccessibilityContext.Provider
            value={{
                settings,
                updateSetting,
                resetSettings,
                announceToScreenReader
            }}
        >
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (!context) {
        throw new Error('useAccessibility must be used within AccessibilityProvider');
    }
    return context;
}

// CSS for accessibility modes (add to index.css)
export const accessibilityCss = `
/* High Contrast Mode */
.high-contrast {
  --bg-primary: #000000;
  --bg-secondary: #1a1a1a;
  --text-primary: #ffffff;
  --text-secondary: #e5e5e5;
  --border-color: #ffffff;
  --accent-color: #00ff00;
}

.high-contrast .bg-slate-800 {
  background-color: #000 !important;
  border: 2px solid #fff !important;
}

.high-contrast .text-slate-400 {
  color: #e5e5e5 !important;
}

.high-contrast .border-slate-700 {
  border-color: #fff !important;
}

.high-contrast button:focus,
.high-contrast a:focus,
.high-contrast input:focus {
  outline: 3px solid #00ff00 !important;
  outline-offset: 2px !important;
}

/* Reduced Motion */
.reduce-motion * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
}

/* Color Blind Modes */
.colorblind-protanopia {
  filter: url('#protanopia-filter');
}

.colorblind-deuteranopia {
  filter: url('#deuteranopia-filter');
}

.colorblind-tritanopia {
  filter: url('#tritanopia-filter');
}

/* Screen Reader Only */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Focus Visible */
:focus-visible {
  outline: 2px solid #10B981;
  outline-offset: 2px;
}

/* Skip Link */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: #10B981;
  color: white;
  padding: 8px 16px;
  z-index: 100;
  transition: top 0.3s;
}

.skip-link:focus {
  top: 0;
}
`;

export default AccessibilityProvider;
