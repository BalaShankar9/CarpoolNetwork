import React from 'react';
import { motion } from 'framer-motion';
import {
    Eye, Type, Zap, Palette, RotateCcw,
    Check, Sun, Moon, Volume2
} from 'lucide-react';
import { useAccessibility } from '@/contexts/AccessibilityContext';

export function AccessibilitySettings() {
    const { settings, updateSetting, resetSettings } = useAccessibility();

    const fontSizeOptions = [
        { value: 'small', label: 'Small', size: 'text-sm' },
        { value: 'medium', label: 'Medium', size: 'text-base' },
        { value: 'large', label: 'Large', size: 'text-lg' },
        { value: 'xlarge', label: 'Extra Large', size: 'text-xl' }
    ] as const;

    const colorBlindOptions = [
        { value: 'none', label: 'None' },
        { value: 'protanopia', label: 'Protanopia (Red-Blind)' },
        { value: 'deuteranopia', label: 'Deuteranopia (Green-Blind)' },
        { value: 'tritanopia', label: 'Tritanopia (Blue-Blind)' }
    ] as const;

    return (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50">
            {/* Header */}
            <div className="p-4 border-b border-slate-700/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                        <Eye className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-white">Accessibility</h3>
                        <p className="text-sm text-slate-400">Customize your experience</p>
                    </div>
                </div>
                <button
                    onClick={resetSettings}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                >
                    <RotateCcw className="w-4 h-4" />
                    Reset
                </button>
            </div>

            <div className="p-4 space-y-6">
                {/* Font Size */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Type className="w-4 h-4 text-slate-400" />
                        <label className="text-sm font-medium text-white">Text Size</label>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                        {fontSizeOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => updateSetting('fontSize', option.value)}
                                className={`p-3 rounded-xl transition-all ${settings.fontSize === option.value
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-slate-700 text-slate-400 hover:text-white'
                                    }`}
                            >
                                <span className={option.size}>{option.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* High Contrast */}
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                            <Sun className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <div className="font-medium text-white">High Contrast</div>
                            <div className="text-sm text-slate-400">Increase visual contrast</div>
                        </div>
                    </div>
                    <button
                        onClick={() => updateSetting('highContrast', !settings.highContrast)}
                        className={`w-12 h-6 rounded-full transition-colors ${settings.highContrast ? 'bg-blue-500' : 'bg-slate-600'
                            }`}
                    >
                        <motion.div
                            animate={{ x: settings.highContrast ? 24 : 2 }}
                            className="w-5 h-5 bg-white rounded-full shadow"
                        />
                    </button>
                </div>

                {/* Reduced Motion */}
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                            <Zap className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <div className="font-medium text-white">Reduce Motion</div>
                            <div className="text-sm text-slate-400">Minimize animations</div>
                        </div>
                    </div>
                    <button
                        onClick={() => updateSetting('reducedMotion', !settings.reducedMotion)}
                        className={`w-12 h-6 rounded-full transition-colors ${settings.reducedMotion ? 'bg-blue-500' : 'bg-slate-600'
                            }`}
                    >
                        <motion.div
                            animate={{ x: settings.reducedMotion ? 24 : 2 }}
                            className="w-5 h-5 bg-white rounded-full shadow"
                        />
                    </button>
                </div>

                {/* Screen Reader Optimized */}
                <div className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                            <Volume2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <div className="font-medium text-white">Screen Reader Mode</div>
                            <div className="text-sm text-slate-400">Optimize for assistive tech</div>
                        </div>
                    </div>
                    <button
                        onClick={() => updateSetting('screenReaderOptimized', !settings.screenReaderOptimized)}
                        className={`w-12 h-6 rounded-full transition-colors ${settings.screenReaderOptimized ? 'bg-blue-500' : 'bg-slate-600'
                            }`}
                    >
                        <motion.div
                            animate={{ x: settings.screenReaderOptimized ? 24 : 2 }}
                            className="w-5 h-5 bg-white rounded-full shadow"
                        />
                    </button>
                </div>

                {/* Color Blind Mode */}
                <div>
                    <div className="flex items-center gap-2 mb-3">
                        <Palette className="w-4 h-4 text-slate-400" />
                        <label className="text-sm font-medium text-white">Color Vision</label>
                    </div>
                    <div className="space-y-2">
                        {colorBlindOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => updateSetting('colorBlindMode', option.value)}
                                className={`w-full p-3 rounded-xl flex items-center justify-between transition-all ${settings.colorBlindMode === option.value
                                        ? 'bg-blue-500/20 border-2 border-blue-500'
                                        : 'bg-slate-700/50 hover:bg-slate-700'
                                    }`}
                            >
                                <span className={`text-sm ${settings.colorBlindMode === option.value ? 'text-blue-300' : 'text-slate-300'
                                    }`}>
                                    {option.label}
                                </span>
                                {settings.colorBlindMode === option.value && (
                                    <Check className="w-4 h-4 text-blue-400" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Info */}
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <p className="text-sm text-blue-300">
                        💡 These settings are saved automatically and will persist across sessions.
                        Press Tab to navigate, Enter to select.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default AccessibilitySettings;
