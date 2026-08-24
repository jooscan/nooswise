import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { Theme } from '../utils/theme';
import { Group, Member } from '../types';
import { CuteAvatarBadge } from './CuteAvatarBadge';
import { calculateMemberBalances, formatCurrency } from '../utils/debtSimplification';
import {
  ReceiptText,
  HandCoins,
  SlidersHorizontal,
  Plus,
  ArrowUpRight,
  Keyboard,
  UserPlus,
  Check,
  ArrowUp,
  ArrowDown,
  X,
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
  group?: Group;
  onInviteFriends?: () => void;
  onMemberClick?: (member: Member) => void;
  onSwitchIdentityClick?: () => void;
  onAddMember?: (name: string) => void;
  onRemoveMember?: (memberId: string) => void;
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
  group,
  onInviteFriends,
  onMemberClick,
  onSwitchIdentityClick,
  onAddMember,
  onRemoveMember,
}) => {
  const [hoveredTab, setHoveredTab] = useState<ActiveTab | null>(null);
  const [mobileHoveredTab, setMobileHoveredTab] = useState<ActiveTab | null>(null);
  const [isAddingPerson, setIsAddingPerson] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const addPersonInputRef = useRef<HTMLInputElement>(null);

  const handleRemoveMember = (e: React.MouseEvent, member: Member) => {
    e.stopPropagation();
    if (!onRemoveMember) return;
    if (!confirm(`Remove ${member.name} from this split?`)) return;
    onRemoveMember(member.id);
  };

  const handleAddPerson = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newPersonName.trim();
    if (!name || !onAddMember) return;
    onAddMember(name);
    setNewPersonName('');
    // Keep the bar open and refocused so [type] [enter] [type] [enter] adds people back-to-back.
    addPersonInputRef.current?.focus();
  };

  const navItems = [
    { id: 'expenses' as const, label: 'Expenses', icon: ReceiptText },
    { id: 'settle-up' as const, label: 'Settle Up', icon: HandCoins },
    { id: 'settings' as const, label: 'Settings', icon: SlidersHorizontal },
  ];

  const highlightedTab = hoveredTab || activeTab;
  const mobileHighlightedTab = mobileHoveredTab || activeTab;

  const memberBalances = group ? calculateMemberBalances(group) : [];

  return (
    <>
      {/* SideNavBar (Desktop) */}
      <aside className="hidden md:flex flex-col p-5 lg:p-6 bg-white/95 dark:bg-[#0f1a2e]/95 text-slate-900 dark:text-slate-100 h-screen w-64 lg:w-72 shrink-0 sticky top-0 border-r border-[#DCEAF5] dark:border-[#203652] z-40 select-none shadow-2xs backdrop-blur-md transition-colors overflow-hidden">
        {/* Brand Header */}
        <div className="mb-6">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            onClick={onBackToLanding}
            className="flex items-center gap-3 text-left group transition-transform cursor-pointer"
            title="Go to Home"
          >
            <Logo size={36} />
            <div>
              <h1 className="font-serif-display text-2xl lg:text-3xl text-slate-900 dark:text-slate-100 tracking-tight font-normal leading-none group-hover:opacity-85 lowercase">
                nooswise
              </h1>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium tracking-wide mt-1">
                split bills, stay friends ✨
              </p>
            </div>
          </motion.button>
        </div>

        {/* GROUP NAVIGATION */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#779DD2] px-3 mb-1">
            Group
          </span>
          <nav
            onMouseLeave={() => setHoveredTab(null)}
            className="flex flex-col gap-1 relative"
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
                  whileHover={{ scale: 1.02, x: 2 }}
                  whileTap={{ scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 25 }}
                  className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                    isActive || isHovered
                      ? 'text-[#13223D] dark:text-white font-semibold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {/* Gliding Grey Pill */}
                  {isHighlighted && (
                    <motion.div
                      layoutId="desktop-sidebar-gliding-pill"
                      transition={{
                        type: 'spring',
                        stiffness: 420,
                        damping: 30,
                        mass: 0.7,
                      }}
                      className={`absolute inset-0 rounded-xl border transition-colors ${
                        isActive
                          ? 'bg-[#EAF3FB] dark:bg-[#203652] border-[#DCEAF5] dark:border-[#2A4365] shadow-2xs'
                          : 'bg-[#F7F9FC] dark:bg-[#203652]/60 border-[#DCEAF5]/60 dark:border-[#2A4365]/60'
                      }`}
                    />
                  )}

                  <div className="flex items-center gap-2.5 relative z-10">
                    <div
                      className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                        isActive || isHovered
                          ? 'bg-white dark:bg-[#13223D] text-[#13223D] dark:text-white shadow-2xs'
                          : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.85} />
                    </div>
                    <span className="tracking-tight">{item.label}</span>
                  </div>

                  {isActive && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                      className="w-1.5 h-1.5 rounded-full bg-[#13223D] dark:bg-[#8FD4F2] shrink-0 relative z-10"
                    />
                  )}
                </motion.button>
              );
            })}
          </nav>
        </div>

        {/* WHO'S HERE SECTION (SCREENSHOT 3 ARCHETYPE) */}
        {group && (
          <div className="flex flex-col mt-5 pt-4 border-t border-[#DCEAF5] dark:border-[#203652] min-h-0 flex-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#779DD2]">
                Who's here ({group.members.length})
              </span>
              {onInviteFriends && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={onInviteFriends}
                  className="text-[11px] font-semibold text-[#13223D] dark:text-[#8FD4F2] hover:underline flex items-center gap-1 cursor-pointer"
                  title="Invite or add friends to split"
                >
                  <UserPlus className="w-3 h-3 text-[#779DD2]" />
                  <span>Invite</span>
                </motion.button>
              )}
            </div>

            {/* Scrollable list of members with avatars & live balances in Plus Jakarta Sans */}
            <div className="flex flex-col gap-1 overflow-y-auto pr-1 flex-1">
              {memberBalances.map(({ member, netBalance }) => {
                const isPositive = netBalance > 0.009;
                const isNegative = netBalance < -0.009;
                const isSettled = !isPositive && !isNegative;

                return (
                  <motion.div
                    key={member.id}
                    whileHover={{ x: 2 }}
                    onClick={() => onMemberClick && onMemberClick(member)}
                    title={member.isCurrentUser ? 'Your profile' : `Click to switch view to ${member.name}`}
                    className={`flex items-center justify-between py-1.5 px-2 rounded-xl transition-all cursor-pointer group ${
                      member.isCurrentUser
                        ? 'bg-[#EAF3FB]/80 dark:bg-[#203652]/80 border border-[#DCEAF5] dark:border-[#2A4365]'
                        : 'hover:bg-[#F7F9FC] dark:hover:bg-[#203652]/40'
                    }`}
                  >
                    {/* Avatar & Name */}
                    <div className="flex items-center gap-2 min-w-0">
                      <CuteAvatarBadge member={member} size="xs" showEmoji={false} />
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="text-xs font-medium text-[#13223D] dark:text-white truncate max-w-[85px] lg:max-w-[105px]">
                          {member.name}
                        </span>
                        {member.isCurrentUser && (
                          <span className="text-[8px] bg-[#13223D] dark:bg-white text-white dark:text-[#13223D] font-semibold px-1.5 py-0.2 rounded-full shrink-0">
                            You
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Balance State in Plus Jakarta Sans font */}
                    <div className="flex items-center gap-1 shrink-0 pl-1.5">
                      <div className="text-right font-sans font-semibold">
                        {isPositive && (
                          <span className="text-[11px] text-[#D96872] dark:text-[#D96872] tracking-tight">
                            +{formatCurrency(netBalance, group.currency)}
                          </span>
                        )}

                        {isNegative && (
                          <span className="text-[11px] text-[#779DD2] dark:text-[#8FD4F2] tracking-tight">
                            -{formatCurrency(Math.abs(netBalance), group.currency)}
                          </span>
                        )}

                        {isSettled && (
                          <span className="text-[10px] text-[#2b5927] dark:text-[#5FA985] lowercase">
                            square
                          </span>
                        )}
                      </div>

                      {onRemoveMember && (
                        <button
                          type="button"
                          onClick={(e) => handleRemoveMember(e, member)}
                          title={`Remove ${member.name} from this split`}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 w-5 h-5 rounded-full flex items-center justify-center text-[#779DD2] hover:text-white hover:bg-rose-500 transition-all cursor-pointer shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Manually add someone who isn't going to use the app themselves */}
            {onAddMember && (
              <div className="pt-1.5 mt-1.5 border-t border-[#DCEAF5]/70 dark:border-[#203652]/70">
                {isAddingPerson ? (
                  <form onSubmit={handleAddPerson} className="flex items-center gap-1.5">
                    <input
                      ref={addPersonInputRef}
                      type="text"
                      autoFocus
                      value={newPersonName}
                      onChange={(e) => setNewPersonName(e.target.value)}
                      onBlur={() => {
                        if (!newPersonName.trim()) setIsAddingPerson(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setNewPersonName('');
                          setIsAddingPerson(false);
                        }
                      }}
                      placeholder="Name..."
                      className="flex-1 min-w-0 bg-[#F7F9FC] dark:bg-[#203652] text-xs font-medium px-2.5 py-1.5 rounded-full border border-[#DCEAF5] dark:border-[#2A4365] focus:outline-none focus:ring-2 focus:ring-[#8FD4F2] dark:focus:ring-[#3B5B88] text-[#13223D] dark:text-white placeholder:text-[#779DD2]"
                    />
                    <button
                      type="submit"
                      disabled={!newPersonName.trim()}
                      className="w-7 h-7 rounded-full bg-[#13223D] dark:bg-white text-white dark:text-[#13223D] flex items-center justify-center shrink-0 disabled:opacity-40 cursor-pointer"
                      title="Add person"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingPerson(true);
                      setTimeout(() => addPersonInputRef.current?.focus(), 50);
                    }}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-semibold text-[#779DD2] hover:text-[#13223D] dark:hover:text-white hover:bg-[#F7F9FC] dark:hover:bg-[#203652]/60 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add person</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Group Selector & Bottom Controls */}
        <div className="mt-auto flex flex-col gap-2.5 pt-4 border-t border-[#DCEAF5] dark:border-[#203652]">
          {/* Current Group Info & Theme Toggle Row */}
          <div className="flex items-center justify-between px-1">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#779DD2] block">
                Active Split
              </span>
              <p className="text-xs font-medium text-[#13223D] dark:text-white truncate mt-0.5">
                {groupName}
              </p>
            </div>

            <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="icon-only" />
          </div>

          {onOpenShortcuts && (
            <motion.button
              whileHover={{ scale: 1.02, x: 1 }}
              whileTap={{ scale: 0.97 }}
              onClick={onOpenShortcuts}
              className="flex items-center justify-between px-2 py-1 text-xs text-[#779DD2] hover:text-[#13223D] dark:hover:text-white transition-colors cursor-pointer rounded-xl hover:bg-[#F7F9FC] dark:hover:bg-[#203652]/60"
            >
              <div className="flex items-center gap-1.5">
                <Keyboard className="w-3.5 h-3.5" />
                <span className="text-[11px]">Shortcuts</span>
              </div>
              <kbd className="font-mono text-[9px] font-semibold bg-[#EAF3FB] dark:bg-[#203652] px-1.5 py-0.5 rounded border border-[#DCEAF5] dark:border-[#2A4365] text-[#13223D] dark:text-[#8FD4F2]">
                ?
              </kbd>
            </motion.button>
          )}

          <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.96 }}
            onClick={onNewGroup}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-[#13223D] dark:bg-white text-white dark:text-[#13223D] rounded-full font-semibold text-xs tracking-wide hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Start a split</span>
          </motion.button>
        </div>
      </aside>

      {/* Mobile Top App Bar */}
      <header className="md:hidden flex justify-between items-center w-full px-4 py-3 bg-white/95 dark:bg-[#0f1a2e]/95 backdrop-blur-md sticky top-0 z-40 border-b border-[#DCEAF5] dark:border-[#203652] shadow-2xs transition-colors">
        <button
          onClick={onBackToLanding}
          className="flex items-center gap-2.5 text-left cursor-pointer"
        >
          <Logo size={28} />
          <span className="font-serif-display text-lg text-[#13223D] dark:text-white tracking-tight lowercase">
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
              className="w-8 h-8 rounded-full bg-[#EAF3FB] dark:bg-[#203652] text-[#13223D] dark:text-[#8FD4F2] flex items-center justify-center cursor-pointer"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </motion.button>
          )}
          <ThemeToggle theme={theme} onToggle={onToggleTheme} variant="icon-only" />

          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
            onClick={onNewGroup}
            className="flex items-center gap-1 bg-[#13223D] dark:bg-white text-white dark:text-[#13223D] text-xs font-semibold px-3 py-1.5 rounded-full hover:opacity-90 transition-opacity shadow-2xs"
          >
            <Plus className="w-3 h-3" />
            <span>New Split</span>
          </motion.button>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        onMouseLeave={() => setMobileHoveredTab(null)}
        className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-5 pt-2 md:hidden bg-white/95 dark:bg-[#0f1a2e]/95 backdrop-blur-lg border-t border-[#DCEAF5] dark:border-[#203652] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.3)] transition-colors"
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
                  ? 'text-[#13223D] dark:text-white font-semibold'
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
                      ? 'bg-[#EAF3FB] dark:bg-[#203652] border-[#DCEAF5] dark:border-[#2A4365] shadow-2xs'
                      : 'bg-[#F7F9FC] dark:bg-[#203652]/70 border-[#DCEAF5]/60 dark:border-[#2A4365]/60'
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
