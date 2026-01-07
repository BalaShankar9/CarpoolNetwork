import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, Check, ChevronDown, Search } from 'lucide-react';
import { useI18n, SUPPORTED_LANGUAGES, SupportedLanguage } from '../../contexts/I18nContext';

interface LanguageSelectorProps {
  variant?: 'dropdown' | 'list' | 'compact';
  showFlag?: boolean;
  showNativeName?: boolean;
  className?: string;
}

export function LanguageSelector({
  variant = 'dropdown',
  showFlag = true,
  showNativeName = true,
  className = '',
}: LanguageSelectorProps) {
  const { language, setLanguage, languageInfo, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLanguages = SUPPORTED_LANGUAGES.filter(
    (lang) =>
      lang.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lang.nativeName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (langCode: SupportedLanguage) => {
    setLanguage(langCode);
    setIsOpen(false);
    setSearchQuery('');
  };

  // Compact variant - just icon button
  if (variant === 'compact') {
    return (
      <div className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1"
          aria-label={t('settings.language')}
        >
          <span className="text-lg">{languageInfo.flag}</span>
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden"
              >
                <div className="max-h-64 overflow-y-auto py-1">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => handleSelect(lang.code)}
                      className={`w-full px-4 py-2 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                        lang.code === language ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-lg">{lang.flag}</span>
                      <span className="flex-1">{lang.nativeName}</span>
                      {lang.code === language && <Check className="w-4 h-4 text-blue-600" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // List variant - shows all languages
  if (variant === 'list') {
    return (
      <div className={`space-y-2 ${className}`}>
        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('common.search')}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Language list */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleSelect(lang.code)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                lang.code === language
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                {showFlag && <span className="text-2xl">{lang.flag}</span>}
                <div className="flex-1">
                  <p className={`font-medium ${lang.code === language ? 'text-blue-700' : 'text-gray-900'}`}>
                    {showNativeName ? lang.nativeName : lang.name}
                  </p>
                  {showNativeName && (
                    <p className="text-sm text-gray-500">{lang.name}</p>
                  )}
                </div>
                {lang.code === language && (
                  <Check className="w-5 h-5 text-blue-600" />
                )}
              </div>
            </button>
          ))}
        </div>

        {filteredLanguages.length === 0 && (
          <p className="text-center text-gray-500 py-8">No languages found</p>
        )}
      </div>
    );
  }

  // Default dropdown variant
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-gray-300 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-gray-400" />
          {showFlag && <span className="text-lg">{languageInfo.flag}</span>}
          <div className="text-left">
            <p className="font-medium text-gray-900">
              {showNativeName ? languageInfo.nativeName : languageInfo.name}
            </p>
            {showNativeName && (
              <p className="text-sm text-gray-500">{languageInfo.name}</p>
            )}
          </div>
        </div>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden"
            >
              {/* Search in dropdown */}
              <div className="p-2 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('common.search')}
                    className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>

              <div className="max-h-64 overflow-y-auto py-1">
                {filteredLanguages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => handleSelect(lang.code)}
                    className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-50 transition-colors ${
                      lang.code === language ? 'bg-blue-50' : ''
                    }`}
                  >
                    {showFlag && <span className="text-lg">{lang.flag}</span>}
                    <div className="flex-1">
                      <p className={`font-medium ${lang.code === language ? 'text-blue-700' : 'text-gray-900'}`}>
                        {showNativeName ? lang.nativeName : lang.name}
                      </p>
                      {showNativeName && (
                        <p className="text-sm text-gray-500">{lang.name}</p>
                      )}
                    </div>
                    {lang.code === language && <Check className="w-5 h-5 text-blue-600" />}
                  </button>
                ))}

                {filteredLanguages.length === 0 && (
                  <p className="text-center text-gray-500 py-4 text-sm">No languages found</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
