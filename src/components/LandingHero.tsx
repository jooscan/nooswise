import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Group } from '../types';
import { Logo } from './Logo';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import { ThemeToggle } from './ThemeToggle';
import { Theme } from '../utils/theme';
import { formatCurrency } from '../utils/debtSimplification';
import { CurrencyPicker } from './CurrencyPicker';
import { BrandPhilosophyModal } from './BrandPhilosophyModals';
import {
  ArrowRight,
  Sparkles,
  Heart,
  HelpCircle,
  Smartphone,
  Archive,
} from 'lucide-react';

interface LandingHeroProps {
  existingGroups: Group[];
  onSelectGroup: (group: Group) => void;
  onCreateGroup: (name: string, yourName: string, members: string[], currency?: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export const LandingHero: React.FC<LandingHeroProps> = ({
  existingGroups,
  onSelectGroup,
  onCreateGroup,
  theme,
  onToggleTheme,
}) => {
  const [yourName, setYourName] = useState('');
  const [splitName, setSplitName] = useState('');
  const [currency, setCurrency] = useState('CAD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [philosophyModal, setPhilosophyModal] = useState<'how-it-works' | 'why-no-app' | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!splitName.trim() || !yourName.trim()) return;

    setIsSubmitting(true);
    const cleanYourName = yourName.trim();
    const cleanSplitName = splitName.trim();

    setTimeout(() => {
      onCreateGroup(cleanSplitName, cleanYourName, [], currency);
      setIsSubmitting(false);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-[#F7FAFD] dark:bg-[#090d16] text-[#16273F] dark:text-slate-100 flex flex-col justify-between p-5 sm:p-8 md:p-12 relative overflow-hidden antialiased selection:bg-[#B4D0EE] dark:selection:bg-slate-800 transition-colors">
      {/* Ambient gradient glows */}
      <div
        className="absolute -top-32 -left-32 w-96 h-96 bg-[#B4D0EE]/30 dark:bg-sky-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/3 -right-32 w-96 h-96 bg-[#E7F0FB] dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* Top Header - The top bar for the landing page */}
      <header className="flex justify-between items-center w-full max-w-5xl mx-auto z-10 gap-3">
        <div className="flex items-center gap-3.5">
          <Logo size={40} />
          <div>
            <span className="font-display text-2xl md:text-3xl text-[#16273F] dark:text-slate-100 tracking-tight block leading-none lowercase">
              nooswise
            </span>
            <span className="text-[11px] text-[#6E8CB4] dark:text-slate-400 font-medium tracking-wide">
              split bills, stay friends ✨
            </span>
          </div>
        </div>

        {/* Action Links & Philosophy Modals */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setPhilosophyModal('how-it-works')}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#16273F]/80 dark:text-slate-300 hover:text-[#16273F] dark:hover:text-white px-3 py-1.5 rounded-full hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-[#6E8CB4]" />
            <span>how it works</span>
          </button>

          <button
            type="button"
            onClick={() => setPhilosophyModal('why-no-app')}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#16273F]/80 dark:text-slate-300 hover:text-[#16273F] dark:hover:text-white px-3 py-1.5 rounded-full hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <Smartphone className="w-3.5 h-3.5 text-[#6E8CB4]" />
            <span>why no app</span>
          </button>

          <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-white/90 dark:bg-slate-900/90 text-[#16273F] dark:text-slate-300 border border-[#DCE6F2] dark:border-slate-800 shadow-2xs">
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>no account needed</span>
          </span>

          <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="compact" />
        </div>
      </header>

      {/* Hero Body */}
      <main className="flex-1 flex flex-col items-center justify-center text-center my-8 md:my-12 z-10 max-w-3xl mx-auto w-full">
        {/* Emotional headline */}
        <h1 className="font-display text-5xl sm:text-6xl md:text-7xl text-[#16273F] dark:text-slate-100 font-normal tracking-tight leading-[1.08] mb-4">
          Split bills,
          <br />
          <span className="italic font-normal text-[#6E8CB4] dark:text-[#B4D0EE]">
            stay friends.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-[#16273F]/80 dark:text-slate-400 font-medium max-w-lg mb-8 leading-relaxed">
          No account. No app download. No spreadsheets needed ✨
        </p>

        {/* 2-INPUT FRICTIONLESS FORM */}
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-white dark:bg-slate-900/95 rounded-[32px] p-6 sm:p-8 soft-shadow border border-[#DCE6F2] dark:border-slate-800 flex flex-col gap-4 text-left transition-all shadow-md backdrop-blur-sm"
        >
          {/* 1. Your Name */}
          <div>
            <label
              htmlFor="your-name-input"
              className="text-[11px] font-bold uppercase tracking-wider text-[#6E8CB4] dark:text-slate-400 block mb-1.5"
            >
              Your name
            </label>
            <input
              id="your-name-input"
              type="text"
              required
              autoFocus
              placeholder="e.g. Joyce"
              value={yourName}
              onChange={(e) => setYourName(e.target.value)}
              className="w-full bg-[#F7FAFD] dark:bg-slate-800/80 text-[#16273F] dark:text-slate-100 placeholder:text-slate-400 rounded-2xl px-5 py-3.5 text-base font-medium border border-[#DCE6F2] dark:border-slate-700/80 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B4D0EE] transition-all shadow-2xs"
            />
          </div>

          {/* 2. What are you splitting? + Currency Picker */}
          <div>
            <label
              htmlFor="split-name-input"
              className="text-[11px] font-bold uppercase tracking-wider text-[#6E8CB4] dark:text-slate-400 block mb-1.5"
            >
              What are we splitting?
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <input
                id="split-name-input"
                type="text"
                required
                placeholder="e.g. Barcelona 2026, Dinner"
                value={splitName}
                onChange={(e) => setSplitName(e.target.value)}
                className="flex-1 bg-[#F7FAFD] dark:bg-slate-800/80 text-[#16273F] dark:text-slate-100 placeholder:text-slate-400 rounded-2xl px-5 py-3.5 text-base font-medium border border-[#DCE6F2] dark:border-slate-700/80 focus:bg-white dark:focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#B4D0EE] transition-all shadow-2xs"
              />

              <CurrencyPicker
                value={currency}
                onChange={(newCurr) => setCurrency(newCurr)}
                size="lg"
              />
            </div>
          </div>

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.025, y: -1 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 450, damping: 22 }}
            type="submit"
            disabled={isSubmitting || !splitName.trim() || !yourName.trim()}
            className="w-full mt-2 bg-[#16273F] dark:bg-slate-100 text-white dark:text-[#16273F] hover:opacity-90 disabled:opacity-50 py-4 px-8 rounded-full font-semibold text-sm tracking-wide transition-opacity shadow-md flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Create my split</span>
            <ArrowRight className="w-4 h-4" />
          </motion.button>

          <p className="text-xs text-center text-[#6E8CB4] dark:text-slate-400 font-medium">
            Send the link. We'll do the rest.
          </p>
        </form>

        {/* Existing Splits in Browser */}
        {existingGroups.length > 0 && (
          <div className="w-full max-w-md mt-10 text-left">
            <div className="flex items-center justify-between mb-3 px-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#6E8CB4] dark:text-slate-400">
                Your Splits in this Browser
              </span>
              <span className="text-xs text-[#6E8CB4] dark:text-slate-400">
                {existingGroups.length} split{existingGroups.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {existingGroups.map((g) => {
                const total = (g.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
                return (
                  <motion.div
                    key={g.id}
                    whileHover={{
                      scale: 1.03,
                      y: -3,
                      boxShadow: '0 12px 24px -8px rgba(0, 0, 0, 0.12), 0 4px 8px -4px rgba(0, 0, 0, 0.06)',
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                    onClick={() => onSelectGroup(g)}
                    className={`p-4 rounded-2xl border transition-colors cursor-pointer flex flex-col justify-between group shadow-2xs ${
                      g.isArchived
                        ? 'bg-[#F7FAFD]/90 dark:bg-slate-900/60 border-[#DCE6F2]/90 dark:border-slate-800/80 hover:bg-[#E7F0FB] dark:hover:bg-slate-800/60'
                        : 'bg-white dark:bg-slate-900/90 hover:bg-[#F7FAFD] dark:hover:bg-slate-800 border-[#DCE6F2] dark:border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h3 className="font-display text-lg text-[#16273F] dark:text-slate-100 truncate">
                            {g.name}
                          </h3>
                          {g.isArchived && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0 border border-slate-300 dark:border-slate-700">
                              <Archive className="w-2.5 h-2.5 text-sky-500" />
                              <span>Archived</span>
                            </span>
                          )}
                        </div>
                        <span className="text-xs font-semibold text-[#16273F] dark:text-slate-100 shrink-0">
                          {formatCurrency(total, g.currency)}
                        </span>
                      </div>
                      <p className="text-xs text-[#6E8CB4] dark:text-slate-400">
                        {g.isArchived && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-medium mr-1">
                            ✓ All square ·
                          </span>
                        )}
                        {(g.members || []).length} friends • {(g.expenses || []).length} items
                      </p>
                    </div>

                    <div className="flex items-center gap-1 mt-3">
                      {(g.members || []).slice(0, 4).map((m) => (
                        <CuteAvatarBadge
                          key={m.id}
                          member={m}
                          size="sm"
                          showEmoji={false}
                        />
                      ))}
                      {(g.members || []).length > 4 && (
                        <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                          +{(g.members || []).length - 4}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center z-10 text-xs text-[#6E8CB4] dark:text-slate-500 font-medium py-4">
        <p>nooswise • instant zero-spreadsheet bill splitting ✨</p>
      </footer>

      {/* Philosophy Modals on Landing */}
      <BrandPhilosophyModal
        type={philosophyModal}
        onClose={() => setPhilosophyModal(null)}
      />
    </div>
  );
};
