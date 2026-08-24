import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { Group, Expense, SettlementRecord, Member } from './types';
import {
  loadAllGroups,
  getActiveGroupId,
  parseCurrentRoute,
  updateBrowserUrl,
  crossTabSyncChannel,
  STORAGE_KEY,
} from './utils/storage';
import { useGroups } from './hooks/useGroups';
import { hydrateGroups } from './utils/identity';
import { calculateSimplifiedDebts } from './utils/debtSimplification';
import { getInitialTheme, applyTheme, Theme } from './utils/theme';
import { LandingHero } from './components/LandingHero';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { HeroBalanceCard } from './components/HeroBalanceCard';
import { ExpenseCard } from './components/ExpenseCard';
import { FriendsListCard } from './components/FriendsListCard';
import { AddExpenseModal } from './components/AddExpenseModal';
import { SettleUpView } from './components/SettleUpView';
import { SettingsView } from './components/SettingsView';
import { ShareModal } from './components/ShareModal';
import { ExpenseDetailModal } from './components/ExpenseDetailModal';
import { JoinGroupModal } from './components/JoinGroupModal';
import { RemindModal } from './components/RemindModal';
import { TripWrapUpModal } from './components/TripWrapUpModal';
import { PaymentSummaryModal } from './components/PaymentSummaryModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { BrandPhilosophyModal } from './components/BrandPhilosophyModals';
import { Logo } from './components/Logo';
import {
  Plus,
  Share2,
  ChevronDown,
  Check,
  Edit2,
  Receipt,
  UserCheck,
  Archive,
  RotateCcw,
  Sparkles,
  Loader2,
  SearchX,
} from 'lucide-react';

const TAB_ORDER: Record<ActiveTab, number> = {
  'expenses': 0,
  'settle-up': 1,
  'settings': 2,
};

// Liquid glass gliding animation variants
const liquidGlassVariants: Variants = {
  initial: (direction: number) => ({
    opacity: 0,
    y: direction >= 0 ? 28 : -28,
    scale: 0.985,
    filter: 'blur(10px)',
  }),
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      type: 'spring' as const,
      stiffness: 320,
      damping: 28,
      mass: 0.8,
      opacity: { duration: 0.28, ease: 'easeOut' },
      filter: { duration: 0.32, ease: 'easeOut' },
    },
  },
  exit: (direction: number) => ({
    opacity: 0,
    y: direction >= 0 ? -22 : 22,
    scale: 0.988,
    filter: 'blur(8px)',
    transition: {
      duration: 0.2,
      ease: [0.32, 0, 0.67, 0] as [number, number, number, number],
    },
  }),
};

export default function App() {
  const [theme, setTheme] = useState<Theme>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    const nextTheme: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  // Initial Route Check
  const initialRoute = parseCurrentRoute();

  // Declared before useGroups: the hook reports failed writes and remote changes
  // through this, so it has to exist first.
  const [liveToast, setLiveToast] = useState<{ id: number; message: string; icon?: string } | null>(null);

  const showLiveToast = useCallback((message: string, icon: string = '✨') => {
    const id = Date.now();
    setLiveToast({ id, message, icon });
    setTimeout(() => {
      setLiveToast((current) => (current?.id === id ? null : current));
    }, 4500);
  }, []);

  const [showLanding, setShowLanding] = useState<boolean>(() => {
    // Root URL ('/' or '#/welcome') strictly opens the welcome landing screen
    if (initialRoute.isHome) return true;
    if (initialRoute.groupId || initialRoute.isSummary) return false;
    return loadAllGroups().length === 0;
  });

  const initialGroupId = useRef<string>(
    (() => {
      if (initialRoute.groupId) return initialRoute.groupId;
      const all = loadAllGroups();
      const stored = getActiveGroupId();
      if (stored && all.some((g) => g.id === stored)) return stored;
      return all.length > 0 ? all[0].id : '';
    })()
  ).current;

  const handleGroupVanished = useCallback((groupId: string) => {
    showLiveToast('That split was deleted.', '🗑️');
    setIsJoinModalOpen(false);
    setShowLanding(true);
    updateBrowserUrl({ isHome: true });
  }, [showLiveToast]);

  // All split state and every action that changes one now lives here, backed by the API.
  const {
    groups,
    activeGroup,
    activeGroupId,
    isResolvingSharedGroup,
    selectGroup,
    refresh: refreshGroup,
    createGroup,
    updateGroupInfo,
    deleteGroup: deleteGroupOnServer,
    addMember,
    updateMember,
    removeMember,
    saveExpense: saveExpenseOnServer,
    deleteExpense: deleteExpenseOnServer,
    recordSettlement,
    undoSettlement,
    claimIdentity,
    setGroups,
  } = useGroups({
    initialGroupId,
    onToast: showLiveToast,
    onIdentityNeeded: () => setIsJoinModalOpen(true),
    onGroupDeleted: handleGroupVanished,
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (initialRoute.tab) return initialRoute.tab;
    if (initialRoute.isSummary) return 'settle-up';
    return 'expenses';
  });

  const [tabDirection, setTabDirection] = useState<number>(1);

  const handleTabChange = (nextTab: ActiveTab) => {
    if (nextTab === activeTab) return;
    const currentIdx = TAB_ORDER[activeTab] ?? 0;
    const nextIdx = TAB_ORDER[nextTab] ?? 0;
    setTabDirection(nextIdx >= currentIdx ? 1 : -1);
    setActiveTab(nextTab);
    updateBrowserUrl({ isHome: false, groupId: activeGroupId, tab: nextTab });
  };

  const handleGoHome = () => {
    setShowLanding(true);
    updateBrowserUrl({ isHome: true });
  };

  // Group Switcher / Edit popover dropdown state
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isRenamingGroup, setIsRenamingGroup] = useState(false);
  const [renamedTitle, setRenamedTitle] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Modals
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [inspectingExpense, setInspectingExpense] = useState<Expense | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [isTripWrapUpOpen, setIsTripWrapUpOpen] = useState(false);
  const [isPaymentSummaryOpen, setIsPaymentSummaryOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [brandPhilosophyModalType, setBrandPhilosophyModalType] = useState<'how-it-works' | 'why-no-app' | null>(null);

  // Remind Modal state
  const [remindTarget, setRemindTarget] = useState<{
    debtor: Member;
    amount: number;
  } | null>(null);


  // Global Keyboard Shortcuts (seamless keyboard controls)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Handle Escape globally to dismiss open overlays/modals
      if (e.key === 'Escape') {
        if (isGroupDropdownOpen) {
          setIsGroupDropdownOpen(false);
          setIsRenamingGroup(false);
          return;
        }
        if (isShortcutsOpen) {
          setIsShortcutsOpen(false);
          return;
        }
      }

      // If user is typing in an input/form, don't trigger navigation keys
      if (isInputFocused) return;

      // Toggle shortcuts help with '?' or Shift+/
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setIsShortcutsOpen((prev) => !prev);
        return;
      }

      // Quick Add Expense: 'e', 'n', 'a', or Cmd/Ctrl+K, Cmd/Ctrl+N
      if (
        e.key.toLowerCase() === 'e' ||
        e.key.toLowerCase() === 'n' ||
        e.key.toLowerCase() === 'a' ||
        ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.key.toLowerCase() === 'n'))
      ) {
        e.preventDefault();
        setEditingExpense(null);
        setIsAddExpenseOpen(true);
        return;
      }

      // Quick Settle tab: 's'
      if (e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleTabChange('settle-up');
        return;
      }

      // Quick toggle dark theme: 'd'
      if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        handleToggleTheme();
        return;
      }

      // Tab navigation numbers: 1 = Expenses, 2 = Settle Up, 3 = Recap, 4 = Settings
      if (e.key === '1') {
        e.preventDefault();
        handleTabChange('expenses');
      } else if (e.key === '2') {
        e.preventDefault();
        handleTabChange('settle-up');
      } else if (e.key === '3') {
        e.preventDefault();
        setIsTripWrapUpOpen(true);
      } else if (e.key === '4') {
        e.preventDefault();
        handleTabChange('settings');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isGroupDropdownOpen, isShortcutsOpen, handleToggleTheme]);

  // Close group dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsGroupDropdownOpen(false);
        setIsRenamingGroup(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Browser back / forward navigation. Fetching the split named in the URL, live
  // syncing, and the legacy localStorage import are all handled inside useGroups.
  useEffect(() => {
    const handlePopState = () => {
      const currentRoute = parseCurrentRoute();
      if (currentRoute.isHome) {
        setShowLanding(true);
        return;
      }

      if (currentRoute.groupId) {
        selectGroup(currentRoute.groupId, false);
        setShowLanding(false);
        if (currentRoute.tab) {
          setActiveTab(currentRoute.tab);
        }
      } else if (currentRoute.isSummary) {
        setShowLanding(false);
        setActiveTab('settle-up');
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, [selectGroup]);

  // Cross-tab sync. Another tab on this device writes the cache and broadcasts; we
  // re-hydrate so each tab still resolves "You" from its own stored identity.
  useEffect(() => {
    if (!crossTabSyncChannel) return;

    const handleSyncMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GROUPS_UPDATED' && Array.isArray(event.data?.groups)) {
        setGroups(hydrateGroups(event.data.groups as Group[]));
      }
    };

    crossTabSyncChannel.addEventListener('message', handleSyncMessage);
    return () => {
      crossTabSyncChannel.removeEventListener('message', handleSyncMessage);
    };
  }, [setGroups]);

  // Same idea for browsers without BroadcastChannel, via the storage event.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || !e.newValue) return;
      try {
        const parsed = JSON.parse(e.newValue);
        if (Array.isArray(parsed)) setGroups(hydrateGroups(parsed as Group[]));
      } catch (err) {
        console.error('Storage sync error', err);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [setGroups]);

  // Sync browser URL bar whenever activeGroupId, activeTab, or showLanding changes
  useEffect(() => {
    if (showLanding) {
      updateBrowserUrl({ isHome: true });
    } else if (activeGroupId) {
      updateBrowserUrl({ isHome: false, groupId: activeGroupId, tab: activeTab });
    }
  }, [showLanding, activeGroupId, activeTab]);


  const currentMember =
    activeGroup?.members?.find((m) => m.isCurrentUser) || activeGroup?.members?.[0];

  const handleCreateGroup = async (
    name: string,
    yourName: string,
    memberNames: string[],
    currency: string = 'CAD'
  ) => {
    const group = await createGroup(name, yourName, memberNames, currency);
    if (!group) return;

    setShowLanding(false);
    setActiveTab('expenses');

    // Pop the share sheet so the creator can send the link straight away.
    setTimeout(() => setIsShareModalOpen(true), 100);
  };

  // Purely local: which member you are is a property of this device, never of the split.
  const handleClaimIdentity = (memberId: string) => {
    if (!activeGroup) return;
    claimIdentity(activeGroup.id, memberId);
  };

  const handleAddMemberToGroup = async (
    name: string,
    claimAsCurrentUser: boolean = false
  ) => {
    if (!activeGroup) return null;
    return addMember(activeGroup.id, name, claimAsCurrentUser);
  };

  const handleSelectGroup = (group: Group) => {
    selectGroup(group.id);
    setShowLanding(false);
    setIsGroupDropdownOpen(false);
    setActiveTab('expenses');
    // Pull the latest in case another device changed it while this one was elsewhere.
    void refreshGroup(group.id);
  };

  const handleToggleArchive = async (groupId: string = activeGroupId) => {
    const target = groups.find((g) => g.id === groupId);
    if (!target) return;
    await updateGroupInfo(groupId, { isArchived: !target.isArchived });
  };

  const handleSaveRename = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renamedTitle.trim() || !activeGroup) return;
    setIsRenamingGroup(false);
    setIsGroupDropdownOpen(false);
    await updateGroupInfo(activeGroup.id, { name: renamedTitle.trim() });
  };

  const handleDeleteGroup = async (groupId: string) => {
    const ok = await deleteGroupOnServer(groupId);
    if (!ok) return;

    const remaining = groups.filter((g) => g.id !== groupId);
    if (remaining.length === 0) {
      selectGroup('');
      setShowLanding(true);
    } else {
      selectGroup(remaining[0].id);
    }
    setActiveTab('expenses');
  };

  /**
   * Previously dropped a hardcoded sample group into local state. Now it creates a real
   * split on the server, since local-only data no longer exists.
   */
  const handleResetSampleData = async () => {
    await handleCreateGroup('Weekend Trip', 'You', ['Alex', 'Sam'], 'CAD');
  };

  const handleSaveExpense = async (expenseData: Omit<Expense, 'id'>) => {
    if (!activeGroup) return;
    const editingId = editingExpense?.id ?? null;
    setEditingExpense(null);
    await saveExpenseOnServer(activeGroup.id, expenseData, editingId);
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!activeGroup) return;
    await deleteExpenseOnServer(activeGroup.id, expenseId);
  };

  const handleRecordSettlement = async (settlementData: Omit<SettlementRecord, 'id'>) => {
    if (!activeGroup) return;
    await recordSettlement(activeGroup.id, settlementData);
  };

  const handleUndoSettlement = async (settlementId: string) => {
    if (!activeGroup) return;
    await undoSettlement(activeGroup.id, settlementId);
  };

  const handleUpdateMemberPaymentEmail = async (memberId: string, email: string) => {
    if (!activeGroup) return;
    const clean = email.trim();
    await updateMember(activeGroup.id, memberId, {
      paymentHandle: clean,
      email: clean,
    });
  };

  const handleRenameGroup = async (newName: string) => {
    if (!activeGroup || !newName.trim()) return;
    await updateGroupInfo(activeGroup.id, { name: newName.trim() });
  };

  // A split-specific URL is still being fetched from the cloud — show a neutral
  // loading state rather than any locally-cached (and unrelated) split.
  if (!showLanding && !activeGroup && isResolvingSharedGroup) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#090d16] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Logo size={40} />
        <Loader2 className="w-5 h-5 text-[#779DD2] dark:text-[#8FD4F2] animate-spin" />
        <p className="text-xs text-[#779DD2] dark:text-[#8FD4F2] font-medium">
          Loading this split…
        </p>
      </div>
    );
  }

  // The URL pointed at a split that couldn't be found (bad link, or one that's never
  // been synced to the cloud from its creator's device).
  if (!showLanding && !activeGroup && !isResolvingSharedGroup) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#090d16] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Logo size={40} />
        <div className="w-14 h-14 rounded-full bg-[#EAF3FB] dark:bg-[#203652] text-[#13223D] dark:text-[#8FD4F2] flex items-center justify-center border border-[#DCEAF5] dark:border-[#2A4365]">
          <SearchX className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-display text-2xl text-[#13223D] dark:text-white">
            Split not found
          </h2>
          <p className="text-xs text-[#779DD2] dark:text-[#8FD4F2] mt-1 max-w-xs">
            This link doesn't match any split we can find. Double-check the link, or start a new one.
          </p>
        </div>
        <button
          onClick={handleGoHome}
          className="mt-2 px-6 py-3 bg-[#13223D] dark:bg-white text-white dark:text-[#13223D] rounded-full text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
        >
          Go to nooswise home
        </button>
      </div>
    );
  }

  // If user navigated to landing screen or no split is selected
  if (showLanding) {
    return (
      <LandingHero
        existingGroups={groups}
        onSelectGroup={handleSelectGroup}
        onCreateGroup={handleCreateGroup}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#F7F9FC] dark:bg-[#0c1524] text-[#13223D] dark:text-[#F7F9FC] flex flex-col md:flex-row antialiased selection:bg-[#8FD4F2] dark:selection:bg-[#203652] transition-colors">
      {/* Side Navigation for Desktop & Mobile Tabs */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onNewGroup={() => setShowLanding(true)}
        onBackToLanding={() => setShowLanding(true)}
        groupName={activeGroup.name}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        group={activeGroup}
        onInviteFriends={() => setIsShareModalOpen(true)}
        onMemberClick={(m) => handleClaimIdentity(m.id)}
        onSwitchIdentityClick={() => setIsJoinModalOpen(true)}
        onAddMember={(name) => handleAddMemberToGroup(name)}
        onRemoveMember={(memberId) => removeMember(activeGroup.id, memberId)}
      />

      {/* Main Content Area */}
      <main className="flex-1 px-4 sm:px-6 md:px-8 lg:px-10 py-6 md:py-8 w-full max-w-7xl mx-auto pb-28 md:pb-12 overflow-hidden">
        {/* Clean Split Header in Main View */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          {/* Split Title with Switcher / Rename */}
          <div className="flex items-center gap-3 relative" ref={dropdownRef}>
            {isRenamingGroup ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (renamedTitle.trim()) {
                    handleRenameGroup(renamedTitle.trim());
                  }
                  setIsRenamingGroup(false);
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  autoFocus
                  value={renamedTitle}
                  onChange={(e) => setRenamedTitle(e.target.value)}
                  className="bg-white dark:bg-[#13223D] text-[#13223D] dark:text-white font-display text-2xl sm:text-3xl px-3 py-1 rounded-xl border border-[#DCEAF5] dark:border-[#2A4365] focus:outline-none focus:ring-2 focus:ring-[#8FD4F2]"
                />
                <button
                  type="submit"
                  className="w-8 h-8 rounded-full bg-[#13223D] dark:bg-white text-white dark:text-[#13223D] flex items-center justify-center cursor-pointer shadow-xs"
                >
                  <Check className="w-4 h-4" />
                </button>
              </form>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setRenamedTitle(activeGroup.name);
                  setIsGroupDropdownOpen(!isGroupDropdownOpen);
                }}
                className="flex items-center gap-2 text-left group cursor-pointer"
                title="Switch or rename split"
              >
                <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-[#13223D] dark:text-white tracking-tight group-hover:opacity-85 transition-opacity">
                  {activeGroup.name}
                </h2>
                <ChevronDown
                  className={`w-4 h-4 text-[#779DD2] transition-transform ${
                    isGroupDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
            )}

            {/* Split Switcher Dropdown */}
            <AnimatePresence>
              {isGroupDropdownOpen && !isRenamingGroup && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.96 }}
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                  className="absolute z-50 left-0 top-full mt-2 w-72 bg-white dark:bg-[#13223D] rounded-2xl shadow-2xl border border-[#DCEAF5] dark:border-[#2A4365] p-2 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#DCEAF5] dark:border-[#2A4365]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#779DD2]">
                      Your Splits
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRenamingGroup(true);
                        setIsGroupDropdownOpen(false);
                      }}
                      className="text-[11px] font-semibold text-[#13223D] dark:text-white hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-[#779DD2]" />
                      <span>Rename</span>
                    </button>
                  </div>

                  <div className="flex flex-col gap-0.5 max-h-56 overflow-y-auto">
                    {groups.map((g) => {
                      const isSelected = g.id === activeGroup.id;
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            handleSelectGroup(g);
                            setIsGroupDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between p-2 rounded-xl text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#EAF3FB] dark:bg-[#203652] text-[#13223D] dark:text-white font-semibold'
                              : 'hover:bg-[#F7F9FC] dark:hover:bg-[#203652]/60 text-[#13223D] dark:text-[#F7F9FC]'
                          }`}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold truncate">
                              {g.name}
                            </span>
                            <span className="text-[10px] text-[#779DD2]">
                              {(g.members || []).length} friends • {(g.expenses || []).length} items
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-[#13223D] dark:text-[#8FD4F2]" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowLanding(true);
                      setIsGroupDropdownOpen(false);
                    }}
                    className="mt-1 flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#F7F9FC] dark:bg-[#203652] hover:bg-[#EAF3FB] dark:hover:bg-[#2A4365] text-xs font-semibold text-[#13223D] dark:text-white border border-[#DCEAF5] dark:border-[#2A4365] cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create new split</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Action Buttons: Share Link */}
          <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white dark:bg-[#13223D] hover:bg-[#EAF3FB] dark:hover:bg-[#203652] text-[#13223D] dark:text-white border border-[#DCEAF5] dark:border-[#2A4365] shadow-2xs transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#779DD2]" />
              <span>Share link</span>
            </motion.button>
          </div>
        </div>

        <AnimatePresence mode="wait" custom={tabDirection}>
            {/* TAB 1: EXPENSES VIEW (WITH FULL-WIDTH HERO BALANCE CARD ON TOP) */}
            {activeTab === 'expenses' && (
              <motion.div
                key="expenses"
                custom={tabDirection}
                variants={liquidGlassVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex flex-col gap-6"
              >
                {/* ARCHIVED TRIP BANNER */}
                {activeGroup.isArchived && (
                  <div className="bg-[#EAF3FB] dark:bg-[#13223D] border border-[#DCEAF5] dark:border-[#2A4365] rounded-[22px] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
                    <div className="flex items-center gap-2.5 text-[#13223D] dark:text-[#F7F9FC]">
                      <span className="w-8 h-8 rounded-full bg-[#8FD4F2] dark:bg-[#203652] text-[#13223D] dark:text-[#8FD4F2] flex items-center justify-center shrink-0">
                        <Archive className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="font-bold block sm:inline mr-1.5">
                          This trip is archived and all square.
                        </span>
                        <span className="text-[#779DD2] dark:text-slate-400">
                          All receipts are preserved in read-only mode.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setIsTripWrapUpOpen(true)}
                        className="px-3.5 py-1.5 rounded-full bg-[#5FA985] text-[#13223D] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        View Recap
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleToggleArchive(activeGroup.id)}
                        className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#203652] text-[#13223D] dark:text-white border border-[#DCEAF5] dark:border-[#2A4365] font-semibold hover:bg-[#F7F9FC] transition-colors cursor-pointer"
                      >
                        Unarchive
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* 1. HERO: "YOU'RE ALL SQUARE" / BALANCE CARD STRETCHING ACROSS THE SCREEN */}
                <HeroBalanceCard
                  group={activeGroup}
                  onSettleClick={() => handleTabChange('settle-up')}
                  onRemindClick={(debtor, amount) => setRemindTarget({ debtor, amount })}
                  onPayPersonClick={() => handleTabChange('settle-up')}
                  onSwitchIdentityClick={() => setIsJoinModalOpen(true)}
                  onUpdateMemberPaymentEmail={handleUpdateMemberPaymentEmail}
                  onOpenWrapUp={() => setIsTripWrapUpOpen(true)}
                  onOpenPaymentSummary={() => setIsPaymentSummaryOpen(true)}
                />

                {/* 2. RECENT TRANSACTIONS & EXPENSES LIST */}
                <div className="flex flex-col gap-5 pt-1">
                  {/* Mobile-only Who's Here compact card (Desktop has it permanently in the left sidebar) */}
                  <div className="block md:hidden">
                    <FriendsListCard
                      group={activeGroup}
                      onInviteClick={() => setIsShareModalOpen(true)}
                      onSwitchIdentityClick={() => setIsJoinModalOpen(true)}
                      onMemberClick={(m) => handleClaimIdentity(m.id)}
                      onAddMember={(name) => handleAddMemberToGroup(name)}
                      onRemoveMember={(memberId) => removeMember(activeGroup.id, memberId)}
                    />
                  </div>

                  {/* Expenses Header & Action Bar */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg md:text-xl text-[#13223D] dark:text-white">
                        What we spent
                      </h3>
                      <p className="text-xs text-[#779DD2] dark:text-[#8FD4F2]">
                        {(activeGroup.expenses || []).length} item{(activeGroup.expenses || []).length === 1 ? '' : 's'} recorded
                      </p>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.035, y: -1 }}
                      whileTap={{ scale: 0.96 }}
                      onClick={() => {
                        setEditingExpense(null);
                        setIsAddExpenseOpen(true);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#13223D] dark:bg-white text-white dark:text-[#13223D] rounded-full text-xs md:text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer group"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add expense</span>
                      <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20 dark:bg-[#13223D]/20 text-white/90 dark:text-[#13223D]/90 font-semibold ml-0.5">
                        E
                      </kbd>
                    </motion.button>
                  </div>

                  {/* Expense List */}
                  {(activeGroup.expenses || []).length === 0 ? (
                    <div className="bg-white dark:bg-[#13223D] rounded-[30px] p-10 text-center border border-[#DCEAF5] dark:border-[#2A4365] flex flex-col items-center justify-center gap-3 brand-card-shadow">
                      <div className="w-12 h-12 rounded-full bg-[#EAF3FB] dark:bg-[#203652] flex items-center justify-center text-[#13223D] dark:text-[#8FD4F2] border border-[#DCEAF5] dark:border-[#2A4365]">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <h4 className="font-display text-2xl text-[#13223D] dark:text-white font-normal">
                        Nothing recorded yet
                      </h4>
                      <p className="text-xs text-[#779DD2] dark:text-[#8FD4F2] max-w-sm">
                        Wrapping up your trip? Start adding your dinners, Uber rides, groceries, or stays.
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.04, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          setEditingExpense(null);
                          setIsAddExpenseOpen(true);
                        }}
                        className="mt-2 bg-[#13223D] dark:bg-white text-white dark:text-[#13223D] text-xs font-semibold px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add expense</span>
                      </motion.button>
                    </div>
                  ) : (
                    <motion.div layout className="flex flex-col gap-3">
                      <AnimatePresence mode="popLayout">
                        {activeGroup.expenses.map((expense) => (
                          <motion.div
                            key={expense.id}
                            layout
                            initial={{ opacity: 0, y: 12, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.94, y: -8 }}
                            transition={{
                              type: 'spring',
                              stiffness: 400,
                              damping: 30,
                            }}
                          >
                            <ExpenseCard
                              expense={expense}
                              group={activeGroup}
                              onSelect={(exp) => setInspectingExpense(exp)}
                            />
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            )}

            {/* TAB 2: SETTLE UP VIEW */}
            {activeTab === 'settle-up' && (
              <motion.div
                key="settle-up"
                custom={tabDirection}
                variants={liquidGlassVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <SettleUpView
                  group={activeGroup}
                  onRecordSettlement={handleRecordSettlement}
                  onUpdateMemberPaymentEmail={handleUpdateMemberPaymentEmail}
                  onUndoSettlement={handleUndoSettlement}
                  onSwitchIdentityClick={() => setIsJoinModalOpen(true)}
                  onBackToExpenses={() => handleTabChange('expenses')}
                  onOpenWrapUp={() => setIsTripWrapUpOpen(true)}
                  onOpenPaymentSummary={() => setIsPaymentSummaryOpen(true)}
                />
              </motion.div>
            )}

            {/* TAB 3: SETTINGS VIEW */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                custom={tabDirection}
                variants={liquidGlassVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <SettingsView
                  group={activeGroup}
                  onPatchGroup={(patch) => updateGroupInfo(activeGroup.id, patch)}
                  onUpdateMember={(memberId, patch) =>
                    updateMember(activeGroup.id, memberId, patch)
                  }
                  onAddMember={(name) => handleAddMemberToGroup(name)}
                  onRemoveMember={(memberId) => removeMember(activeGroup.id, memberId)}
                  onClaimIdentity={handleClaimIdentity}
                  onDeleteGroup={handleDeleteGroup}
                  onResetSampleData={handleResetSampleData}
                  theme={theme}
                  onToggleTheme={handleToggleTheme}
                  onToggleArchive={() => handleToggleArchive(activeGroup.id)}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>

      {/* MODALS */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => {
          setIsAddExpenseOpen(false);
          setEditingExpense(null);
        }}
        group={activeGroup}
        onSaveExpense={handleSaveExpense}
        onDeleteExpense={handleDeleteExpense}
        editingExpense={editingExpense}
        onAddMember={(name) => addMember(activeGroupId, name)}
      />

      <ExpenseDetailModal
        expense={inspectingExpense}
        group={activeGroup}
        onClose={() => setInspectingExpense(null)}
        onEdit={(exp) => {
          setEditingExpense(exp);
          setIsAddExpenseOpen(true);
        }}
        onDelete={handleDeleteExpense}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        group={activeGroup}
      />

      <JoinGroupModal
        isOpen={isJoinModalOpen}
        onClose={() => setIsJoinModalOpen(false)}
        group={activeGroup}
        onClaimIdentity={handleClaimIdentity}
        onAddMember={handleAddMemberToGroup}
      />

      <TripWrapUpModal
        isOpen={isTripWrapUpOpen}
        onClose={() => setIsTripWrapUpOpen(false)}
        group={activeGroup}
        onToggleArchive={() => handleToggleArchive(activeGroup.id)}
        onGoToSettleUp={() => {
          setIsTripWrapUpOpen(false);
          setActiveTab('settle-up');
        }}
      />

      <PaymentSummaryModal
        isOpen={isPaymentSummaryOpen}
        onClose={() => setIsPaymentSummaryOpen(false)}
        group={activeGroup}
      />

      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <BrandPhilosophyModal
        type={brandPhilosophyModalType}
        onClose={() => setBrandPhilosophyModalType(null)}
      />

      {remindTarget && (
        <RemindModal
          isOpen={!!remindTarget}
          onClose={() => setRemindTarget(null)}
          debtor={remindTarget.debtor}
          creditor={currentMember}
          amount={remindTarget.amount}
          currency={activeGroup.currency}
          splitName={activeGroup.name}
          debtorIndex={0}
          totalRemainingDebtors={activeGroup ? calculateSimplifiedDebts(activeGroup).length : 1}
        />
      )}

      {/* Floating Live Sync Toast Notification */}
      <AnimatePresence>
        {liveToast && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 450, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#13223D]/95 dark:bg-white/95 text-white dark:text-[#13223D] rounded-full shadow-xl border border-[#3B5B88] dark:border-slate-200 backdrop-blur-md text-xs font-semibold pointer-events-none"
          >
            <span className="text-base">{liveToast.icon || '✨'}</span>
            <span>{liveToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
