'use client';

import React, { useEffect, useState } from 'react';
import { ChevronDown, Globe } from 'lucide-react';
import { LanguageInfo } from '@/types/translation';
import { libreTranslateService } from '@/services/libreTranslateService';

interface LanguageSelectorProps {
  value: string;
  onChange: (language: string) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  showAutoDetect?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  value,
  onChange,
  label,
  placeholder = "Select language",
  disabled = false,
  showAutoDetect = false
}) => {
  const [languages, setLanguages] = useState<LanguageInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const langs = await libreTranslateService.getLanguages();
        let filteredLangs = langs;
        
        if (!showAutoDetect) {
          filteredLangs = langs.filter(lang => lang.code !== 'auto');
        }
        
        setLanguages(filteredLangs);
      } catch (error) {
        console.error('Failed to load languages:', error);
        // Fallback languages
        const fallbackLangs = [
          { code: 'en', name: 'English' },
          { code: 'vi', name: 'Vietnamese' },
          { code: 'es', name: 'Spanish' },
          { code: 'fr', name: 'French' },
          { code: 'de', name: 'German' },
          { code: 'it', name: 'Italian' },
          { code: 'pt', name: 'Portuguese' },
          { code: 'ru', name: 'Russian' },
          { code: 'ja', name: 'Japanese' },
          { code: 'ko', name: 'Korean' },
          { code: 'zh', name: 'Chinese' }
        ];
        
        if (showAutoDetect) {
          fallbackLangs.unshift({ code: 'auto', name: 'Auto Detect' });
        }
        
        setLanguages(fallbackLangs);
      } finally {
        setLoading(false);
      }
    };

    loadLanguages();
  }, [showAutoDetect]);

  const selectedLanguage = languages.find(lang => lang.code === value);

  const handleSelect = (languageCode: string) => {
    onChange(languageCode);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        <Globe className="inline h-4 w-4 mr-1" />
        {label}
      </label>
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && !loading && setIsOpen(!isOpen)}
          disabled={disabled || loading}
          className={`
            relative w-full bg-white border border-gray-300 rounded-md pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm
            ${disabled || loading ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'hover:bg-gray-50'}
          `}
        >
          <span className="block truncate">
            {loading ? 'Loading languages...' : selectedLanguage?.name || placeholder}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </span>
        </button>

        {isOpen && !disabled && !loading && (
          <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
            {languages.map((language) => (
              <button
                key={language.code}
                onClick={() => handleSelect(language.code)}
                className={`
                  block w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer
                  ${language.code === value ? 'bg-blue-50 text-blue-900' : 'text-gray-900'}
                `}
              >
                <span className="block font-medium">{language.name}</span>
                <span className="block text-xs text-gray-500">{language.code}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Overlay to close dropdown when clicking outside */}
      {isOpen && (
        <div
          className="fixed inset-0 z-5"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
};
