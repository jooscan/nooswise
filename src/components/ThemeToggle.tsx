import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { Theme } from '../utils/theme';

interface ThemeToggleProps {
  theme: Theme;
  onToggle: () => void;
  className?: string;
  variant?: 'compact' | 'segmented' | 'icon-only';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({
  theme,
  onToggle,
  className = '',
  variant = 'compact',
}) => {
  const isDark = theme === 'dark';

  if (variant === 'segmented') {
    return (
      <div
        className={`inline-flex items-center p-1 bg-slate-100 dark:bg-slate-800/80 rounded-full border border-slate-200 dark:border-slate-700/80 transition-colors ${className}`}
        role="radiogroup"
        aria-label="Color theme switcher"
      >
        <button
          type="button"
          onClick={() => isDark && onToggle()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
            !isDark
              ? 'bg-white text-slate-900 shadow-2xs font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-checked={!isDark}
          role="radio"
        >
          <Sun className="w-3.5 h-3.5" />
          <span>Light</span>
        </button>
        <button
          type="button"
          onClick={() => !isDark && onToggle()}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
            isDark
              ? 'bg-slate-900 text-white shadow-2xs font-semibold'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-checked={isDark}
          role="radio"
        >
          <Moon className="w-3.5 h-3.5" />
          <span>Dark</span>
        </button>
      </div>
    );
  }

  if (variant === 'icon-only') {
    return (
      <button
        type="button"
        onClick={onToggle}
        className={`w-8 h-8 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-2xs ${className}`}
        title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-300" />
        ) : (
          <Moon className="w-4 h-4 text-slate-600" />
        )}
      </button>
    );
  }

  // Compact variant (default)
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 transition-all cursor-pointer shadow-2xs ${className}`}
      title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
    >
      {isDark ? (
        <>
          <Sun className="w-3.5 h-3.5 text-amber-300" />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon className="w-3.5 h-3.5 text-slate-500" />
          <span>Dark</span>
        </>
      )}
    </button>
  );
};
