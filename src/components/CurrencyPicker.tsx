import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  SUPPORTED_CURRENCIES,
  POPULAR_CURRENCIES,
  CurrencyInfo,
  normalizeCurrencyCode,
} from '../utils/currency';
import { Search, ChevronDown, Check, Sparkles, X } from 'lucide-react';

interface CurrencyPickerProps {
  value: string;
  onChange: (currencyCode: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'button' | 'input-group';
}

export const CurrencyPicker: React.FC<CurrencyPickerProps> = ({
  value,
  onChange,
  className = '',
  size = 'md',
  variant = 'button',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCode = normalizeCurrencyCode(value);
  const selectedInfo = SUPPORTED_CURRENCIES[selectedCode] || {
    code: selectedCode,
    symbol: selectedCode,
    name: selectedCode,
    rateToUSD: 1.0,
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  const allCurrenciesList = Object.values(SUPPORTED_CURRENCIES);

  const filteredCurrencies = allCurrenciesList.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      c.symbol.toLowerCase().includes(q)
    );
  });

  const handleSelect = (code: string) => {
    onChange(code);
    setIsOpen(false);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    const clean = searchQuery.toUpperCase().trim();
    onChange(clean);
    setIsOpen(false);
  };

  const isCustomQuery =
    searchQuery.trim().length >= 2 &&
    filteredCurrencies.length === 0;

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between gap-1.5 font-semibold text-slate-900 dark:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-2xl transition-all cursor-pointer select-none ${
          size === 'sm'
            ? 'px-2.5 py-1.5 text-xs'
            : size === 'lg'
            ? 'px-4 py-3.5 text-sm md:text-base'
            : 'px-3 py-2.5 text-xs md:text-sm'
        }`}
        title="Select currency"
      >
        <span className="flex items-center gap-1.5 truncate">
          {selectedInfo.flag && <span className="text-sm">{selectedInfo.flag}</span>}
          <span className="font-mono font-bold">{selectedInfo.code}</span>
          <span className="text-slate-500 dark:text-slate-400 font-normal">
            ({selectedInfo.symbol})
          </span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Popover Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
            className="absolute z-50 mt-2 right-0 sm:right-auto sm:left-0 w-72 sm:w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-3 flex flex-col gap-2.5"
            style={{ maxWidth: 'calc(100vw - 32px)' }}
          >
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search rupee, dollar, CAD, INR..."
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 text-xs font-medium pl-8 pr-7 py-2 rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Popular Currencies Quick Chips */}
            {!searchQuery && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 px-1">
                  Popular
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {POPULAR_CURRENCIES.map((popCode) => {
                    const info = SUPPORTED_CURRENCIES[popCode];
                    const isSelected = selectedCode === popCode;
                    return (
                      <button
                        key={popCode}
                        type="button"
                        onClick={() => handleSelect(popCode)}
                        className={`px-2.5 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs'
                            : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {info.flag && <span>{info.flag}</span>}
                        <span>{info.code}</span>
                        <span className="text-[10px] opacity-75">{info.symbol}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Currencies List */}
            <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto pr-1">
              {filteredCurrencies.map((c) => {
                const isSelected = selectedCode === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleSelect(c.code)}
                    className={`flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {c.flag ? (
                        <span className="text-base shrink-0">{c.flag}</span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] flex items-center justify-center font-bold">
                          {c.code.slice(0, 2)}
                        </span>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs font-semibold truncate flex items-center gap-1">
                          <span>{c.code}</span>
                          <span className="text-slate-400 font-normal font-mono">
                            ({c.symbol})
                          </span>
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate">
                          {c.name}
                        </span>
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                    )}
                  </button>
                );
              })}

              {/* If user typed custom code that isn't listed */}
              {isCustomQuery && (
                <form
                  onSubmit={handleCustomSubmit}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-dashed border-slate-300 dark:border-slate-700 flex flex-col gap-1.5"
                >
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    Use custom currency code:
                  </span>
                  <button
                    type="submit"
                    className="flex items-center justify-between w-full text-xs font-bold text-slate-900 dark:text-white bg-slate-200 dark:bg-slate-700 py-1.5 px-3 rounded-lg hover:opacity-90 cursor-pointer"
                  >
                    <span>Use "{searchQuery.toUpperCase().trim()}"</span>
                    <Sparkles className="w-3 h-3" />
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
