import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Theme } from '../utils/theme';
import {
  ReceiptText,
  HandCoins,
  SlidersHorizontal,
  Plus,
  ArrowUpRight,
  Keyboard,
} from 'lucide-react';

export type ActiveTab = 'expenses' | 'settle-up' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onNewGroup: () => void;
  onBackToLanding: () => void;
  groupName: string;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenShortcuts?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onNewGroup,
  onBackToLanding,
  groupName,
  theme,
  onToggleTheme,
  onOpenShortcuts,
}) => {
  const [hoveredTab, setHoveredTab] = useState<ActiveTab | null>(null);
  const [mobileHoveredTab, setMobileHoveredTab] = useState<ActiveTab | null>(null);

  const navItems = [
    { id: 'expenses' as const, label: 'Expenses', icon: ReceiptText },
    { id: 'settle-up' as const, label: 'Settle Up', icon: HandCoins },
    { id: 'settings' as const, label: 'Settings', icon: SlidersHorizontal },
  ];

  const highlightedTab = hoveredTab || activeTab;
  const mobileHighlightedTab = mobileHoveredTab || activeTab;

  return (
    <>
      {/* SideNavBar (Desktop) */}
      <aside className="hidden md:flex flex-col p-6 lg:p-7 bg-white/95 dark:bg-slate-900/90 text-slate-900 dark:text-slate-100 h-screen w-64 lg:w-72 shrink-0 sticky top-0 border-r border-slate-200/90 dark:border-slate-800/90 z-40 select-none shadow-2xs backdrop-blur-md transition-colors">
        {/* Brand Header */}
        <div className="mb-8">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onBackToLanding}
            className="flex items-center gap-3 text-left group transition-transform cursor-pointer"
            title="Go to Home"
          >
            <Logo size={40} />
            <div>
              <h1 className="font-serif-display text-2xl lg:text-3xl text-slate-900 dark:text-slate-100 tracking-tight font-normal leading-none group-hover:opacity-85 lowercase">
                nooswise
              </h1>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 font-medium tracking-wide mt-1">
                split bills, stay friends ✨
              </p>
            </div>
          </motion.button>
        </div>

        {/* Navigation Items with Gliding Hover & Active Pill */}
        <nav
          onMouseLeave={() => setHoveredTab(null)}
          className="flex flex-col gap-1.5 flex-1 relative"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const isHighlighted = highlightedTab === item.id;
            const isHovered = hoveredTab === item.id;
            const Icon = item.icon;

            return (
              <motion.button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                onMouseEnter={() => setHoveredTab(item.id)}
                onFocus={() => setHoveredTab(item.id)}
                onBlur={() => setHoveredTab(null)}
                whileHover={{ scale: 1.035, x: 4 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                className={`group relative flex items-center justify-between px-3.5 py-3 rounded-2xl text-sm font-medium transition-colors cursor-pointer ${
                  isActive || isHovered
                    ? 'text-slate-900 dark:text-slate-100 font-semibold'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                {/* Gliding Grey Pill that smoothly follows cursor on hover and springs back to active */}
                {isHighlighted && (
                  <motion.div
                    layoutId="desktop-sidebar-gliding-pill"
                    transition={{
                      type: 'spring',
                      stiffness: 420,
                      damping: 30,
                      mass: 0.7,
                    }}
                    className={`absolute inset-0 rounded-2xl border transition-colors ${
                      isActive
                        ? 'bg-slate-100/90 dark:bg-slate-800/90 border-slate-200/90 dark:border-slate-700/80 shadow-xs backdrop-blur-xs'
                        : 'bg-slate-100/60 dark:bg-slate-800/60 border-slate-200/70 dark:border-slate-700/60 shadow-2xs backdrop-blur-xs'
                    }`}
                  />
                )}

                <div className="flex items-center gap-3 relative z-10">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center transition-all ${
                      isActive || isHovered
                        ? 'bg-white dark:bg-slate-700/90 text-slate-900 dark:text-slate-100 shadow-2xs'
                        : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" strokeWidth={1.85} />
                  </div>
                  <span className="tracking-tight">{item.label}</span>
                </div>

                {isActive && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-slate-200 shrink-0 relative z-10"
                  />
                )}
              </motion.button>
            );
          })}
        </nav>

        {/* Group Selector & Bottom Controls */}
        <div className="mt-auto flex flex-col gap-3 pt-5 border-t border-slate-200/90 dark:border-slate-800/90">
          {/* Current Group Info & Theme Toggle Row */}
          <div className="flex items-center justify-between px-1">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                Active Split
              </span>
              <p className="text-xs font-serif-display font-medium text-slate-900 dark:text-slate-100 truncate mt-0.5">
                {groupName}
              </p>
            </div>

            <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="icon-only" />
          </div>

          {onOpenShortcuts && (
            <motion.button
              whileHover={{ scale: 1.025, x: 2 }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              onClick={onOpenShortcuts}
              className="flex items-center justify-between px-2 py-1.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/60"
            >
              <div className="flex items-center gap-2">
                <Keyboard className="w-3.5 h-3.5" />
                <span>Shortcuts</span>
              </div>
              <kbd className="font-mono text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                ?
              </kbd>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.03, y: -1.5 }}
            whileTap={{ scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 450, damping: 22 }}
            onClick={onNewGroup}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-full font-semibold text-xs tracking-wide hover:bg-slate-800 dark:hover:bg-white transition-colors cursor-pointer shadow-2xs hover:shadow-md"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Start a split</span>
          </motion.button>
        </div>
      </aside>

      {/* Mobile Top App Bar */}
      <header className="md:hidden flex justify-between items-center w-full px-4 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/90 dark:border-slate-800/90 shadow-2xs transition-colors">
        <button
          onClick={onBackToLanding}
          className="flex items-center gap-2.5 text-left cursor-pointer"
        >
          <Logo size={28} />
          <span className="font-serif-display text-lg text-slate-900 dark:text-slate-100 tracking-tight lowercase">
            nooswise
          </span>
        </button>

        <div className="flex items-center gap-2">
          {onOpenShortcuts && (
            <motion.button
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              onClick={onOpenShortcuts}
              aria-label="Keyboard shortcuts"
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </motion.button>
          )}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="icon-only" />

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNewGroup}
            className="flex items-center gap-1 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-full hover:bg-slate-800 dark:hover:bg-white transition-opacity shadow-2xs"
          >
            <Plus className="w-3 h-3" />
            <span>New Split</span>
          </motion.button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar with Sliding Liquid Glass Active Pill */}
      <nav
        onMouseLeave={() => setMobileHoveredTab(null)}
        className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-5 pt-2 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)] transition-colors"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const isHighlighted = mobileHighlightedTab === item.id;
          const isHovered = mobileHoveredTab === item.id;
          const Icon = item.icon;

          return (
            <motion.button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              onMouseEnter={() => setMobileHoveredTab(item.id)}
              onFocus={() => setMobileHoveredTab(item.id)}
              onBlur={() => setMobileHoveredTab(null)}
              whileHover={{ scale: 1.06, y: -2 }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: 'spring', stiffness: 450, damping: 25 }}
              className={`relative flex flex-col items-center justify-center px-5 py-2 rounded-2xl transition-colors cursor-pointer ${
                isActive || isHovered
                  ? 'text-slate-900 dark:text-slate-100 font-semibold'
                  : 'text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              {isHighlighted && (
                <motion.div
                  layoutId="mobile-sidebar-gliding-pill"
                  transition={{
                    type: 'spring',
                    stiffness: 450,
                    damping: 32,
                    mass: 0.8,
                  }}
                  className={`absolute inset-0 rounded-2xl border transition-colors ${
                    isActive
                      ? 'bg-slate-100 dark:bg-slate-800 border-slate-200/80 dark:border-slate-700/80 shadow-2xs'
                      : 'bg-slate-100/70 dark:bg-slate-800/70 border-slate-200/60 dark:border-slate-700/60 shadow-2xs'
                  }`}
                />
              )}
              <div className="relative z-10 flex flex-col items-center">
                <Icon className="w-4 h-4 mb-0.5" strokeWidth={1.85} />
                <span className="text-[11px]">{item.label}</span>
              </div>
            </motion.button>
          );
        })}
      </nav>
    </>
  );
};
