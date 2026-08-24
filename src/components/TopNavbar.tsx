import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Theme } from '../utils/theme';
import { Group, Member } from '../types';
import { ActiveTab } from './Sidebar';
import {
  ReceiptText,
  HandCoins,
  SlidersHorizontal,
  Plus,
  Share2,
  ChevronDown,
  UserCheck,
  HelpCircle,
  Sparkles,
  Info,
  Archive,
  Edit2,
  Check,
} from 'lucide-react';

interface TopNavbarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onBackToLanding: () => void;
  group: Group;
  groups: Group[];
  onSelectGroup: (group: Group) => void;
  onCreateNewSplit: () => void;
  onOpenShareModal: () => void;
  onOpenAddExpense: () => void;
  onOpenJoinModal: () => void;
  onOpenHowItWorks: () => void;
  onOpenWhyNoApp: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onRenameGroup: (newName: string) => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activeTab,
  onTabChange,
  onBackToLanding,
  group,
  groups,
  onSelectGroup,
  onCreateNewSplit,
  onOpenShareModal,
  onOpenAddExpense,
  onOpenJoinModal,
  onOpenHowItWorks,
  onOpenWhyNoApp,
  theme,
  onToggleTheme,
  onRenameGroup,
}) => {
  const currentMember = group.members.find((m) => m.isCurrentUser) || group.members[0];
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renamedTitle, setRenamedTitle] = useState(group.name);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setRenamedTitle(group.name);
  }, [group.name]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsGroupDropdownOpen(false);
        setIsRenaming(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSaveRename = (e: React.FormEvent) => {
    e.preventDefault();
    if (!renamedTitle.trim()) return;
    onRenameGroup(renamedTitle.trim());
    setIsRenaming(false);
    setIsGroupDropdownOpen(false);
  };

  return (
    <header className="w-full sticky top-0 z-40 bg-[#F8F9FB]/90 dark:bg-[#0c1524]/90 backdrop-blur-md border-b border-[#DCE6F1] dark:border-[#1E3352] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-3">
        {/* Left Side: Brand Wordmark + Philosophy Links */}
        <div className="flex items-center gap-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={onBackToLanding}
            className="flex items-center gap-2.5 cursor-pointer text-left select-none group"
            title="Go to Home / Overview"
          >
            <Logo size={36} />
            <span className="font-display text-2xl sm:text-3xl text-[#11213C] dark:text-[#F8F9FB] lowercase font-normal tracking-tight group-hover:opacity-85">
              nooswise
            </span>
          </motion.button>

          {/* Philosophy / Info Links */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={onOpenHowItWorks}
              className="text-xs font-semibold px-3 py-1.5 rounded-full text-[#6FA4EA] hover:text-[#11213C] dark:text-[#A5CFF6] dark:hover:text-white hover:bg-[#E9EFF8] dark:hover:bg-[#203652]/60 transition-colors cursor-pointer"
            >
              how it works
            </button>
            <button
              onClick={onOpenWhyNoApp}
              className="text-xs font-semibold px-3 py-1.5 rounded-full text-[#6FA4EA] hover:text-[#11213C] dark:text-[#A5CFF6] dark:hover:text-white hover:bg-[#E9EFF8] dark:hover:bg-[#203652]/60 transition-colors cursor-pointer"
            >
              why no app
            </button>
          </div>
        </div>

        {/* Center: Split Switcher Pill */}
        <div className="relative" ref={dropdownRef}>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              setRenamedTitle(group.name);
              setIsGroupDropdownOpen(!isGroupDropdownOpen);
            }}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E9EFF8] dark:bg-[#11213C] border border-[#DCE6F1] dark:border-[#2A4365] text-[#11213C] dark:text-white text-xs sm:text-sm font-semibold cursor-pointer shadow-2xs hover:bg-[#A5CFF6]/30 dark:hover:bg-[#203652] transition-colors"
          >
            <span className="truncate max-w-[130px] sm:max-w-[200px]">{group.name}</span>
            {group.isArchived && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-[#A5CFF6] text-[#11213C] px-1.5 py-0.5 rounded-full">
                Archived
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 text-[#6FA4EA] transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          {/* Split Switcher Dropdown */}
          <AnimatePresence>
            {isGroupDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.96 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-72 sm:w-80 bg-white dark:bg-[#11213C] rounded-[22px] p-4 shadow-2xl border border-[#DCE6F1] dark:border-[#2A4365] z-50 text-[#11213C] dark:text-white"
              >
                {isRenaming ? (
                  <form onSubmit={handleSaveRename} className="flex flex-col gap-2 mb-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#6FA4EA]">
                      Rename Split
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renamedTitle}
                        onChange={(e) => setRenamedTitle(e.target.value)}
                        autoFocus
                        className="flex-1 bg-[#E9EFF8] dark:bg-[#203652] text-xs font-semibold px-3 py-2 rounded-xl border border-[#DCE6F1] dark:border-[#2A4365] focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="bg-[#11213C] dark:bg-white text-white dark:text-[#11213C] text-xs px-3 py-2 rounded-xl font-semibold cursor-pointer"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsRenaming(false)}
                        className="text-xs text-[#6FA4EA] hover:text-[#11213C] px-2 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#DCE6F1] dark:border-[#2A4365]">
                    <span className="text-xs font-bold text-[#11213C] dark:text-white">
                      Your Splits
                    </span>
                    <button
                      onClick={() => setIsRenaming(true)}
                      className="text-xs text-[#6FA4EA] hover:text-[#11213C] dark:hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Rename</span>
                    </button>
                  </div>
                )}

                <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-1">
                  {groups.map((g) => {
                    const isCurrent = g.id === group.id;
                    return (
                      <button
                        key={g.id}
                        onClick={() => {
                          onSelectGroup(g);
                          setIsGroupDropdownOpen(false);
                        }}
                        className={`p-2.5 rounded-xl flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#E9EFF8] dark:bg-[#203652] text-[#11213C] dark:text-white font-semibold'
                            : 'hover:bg-[#F8F9FB] dark:hover:bg-[#203652]/40 text-[#6FA4EA] dark:text-slate-300'
                        }`}
                      >
                        <span className="text-xs truncate">{g.name}</span>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-[#11213C] dark:text-white" />}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setIsGroupDropdownOpen(false);
                    onCreateNewSplit();
                  }}
                  className="w-full mt-3 pt-2.5 border-t border-[#DCE6F1] dark:border-[#2A4365] text-xs font-semibold text-[#11213C] dark:text-white flex items-center justify-center gap-1.5 cursor-pointer hover:opacity-80"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Start new split</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Side: Identity + Share + Add Expense + Theme */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Identity Pill */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenJoinModal}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs text-[#11213C] dark:text-slate-200 bg-[#E9EFF8] dark:bg-[#11213C] hover:bg-[#A5CFF6]/40 dark:hover:bg-[#203652] border border-[#DCE6F1] dark:border-[#2A4365] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
            title="Change who you are in this split"
          >
            <UserCheck className="w-3.5 h-3.5 text-[#6FA4EA]" />
            <span>I'm <strong>{currentMember?.name || 'You'}</strong></span>
          </motion.button>

          {/* Share Split Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onOpenShareModal}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#11213C] dark:text-white bg-white dark:bg-[#11213C] hover:bg-[#E9EFF8] dark:hover:bg-[#203652] border border-[#DCE6F1] dark:border-[#2A4365] px-3.5 py-1.5 sm:py-2 rounded-full transition-colors cursor-pointer shadow-2xs"
            title="Share this split link with friends"
          >
            <Share2 className="w-3.5 h-3.5 text-[#6FA4EA]" />
            <span className="hidden sm:inline">Share link</span>
          </motion.button>

          {/* Primary Action: Add Expense (Solid Midnight Ink Pill) */}
          <motion.button
            whileHover={{ scale: 1.04, y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={onOpenAddExpense}
            className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 bg-[#11213C] dark:bg-white text-white dark:text-[#11213C] rounded-full text-xs sm:text-sm font-semibold transition-all shadow-md cursor-pointer hover:opacity-90"
          >
            <Plus className="w-4 h-4" />
            <span>Add expense</span>
          </motion.button>

          {/* Theme Toggle */}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="icon-only" />
        </div>
      </div>
    </header>
  );
};
