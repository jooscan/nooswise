import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, type Variants } from 'motion/react';
import { Group, Expense, SettlementRecord, Member } from './types';
import {
  loadAllGroups,
  saveAllGroups,
  getActiveGroupId,
  setActiveGroupId,
  decodeGroupFromUrl,
  getSplitIdFromUrl,
  parseCurrentRoute,
  updateBrowserUrl,
  encodeGroupToUrl,
  INITIAL_DEFAULT_GROUP,
  crossTabSyncChannel,
  STORAGE_KEY,
} from './utils/storage';
import {
  pushGroupToCloud,
  fetchGroupFromCloud,
  pollGroupUpdates,
  subscribeToSplitEvents,
  mergeRemoteGroupWithLocal,
} from './utils/cloudSync';
import { formatCurrency, calculateSimplifiedDebts } from './utils/debtSimplification';
import { getRandomAvatar } from './utils/avatars';
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

  const [groups, setGroups] = useState<Group[]>(() => {
    return loadAllGroups();
  });

  const [activeGroupId, setCurrentActiveGroupId] = useState<string>(() => {
    if (initialRoute.groupId) return initialRoute.groupId;
    const all = loadAllGroups();
    const stored = getActiveGroupId();
    if (stored && all.some((g) => g.id === stored)) return stored;
    return all.length > 0 ? all[0].id : '';
  });

  // True while we're fetching a URL-specified split that isn't already cached locally.
  // Prevents briefly (or permanently, on fetch failure) rendering an unrelated local
  // split in its place while the real one loads.
  const [isResolvingSharedGroup, setIsResolvingSharedGroup] = useState<boolean>(() => {
    if (!initialRoute.groupId) return false;
    const all = loadAllGroups();
    return !all.some((g) => g.id === initialRoute.groupId);
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (initialRoute.tab) return initialRoute.tab;
    if (initialRoute.isSummary) return 'settle-up';
    return 'expenses';
  });

  const [tabDirection, setTabDirection] = useState<number>(1);
  const [showLanding, setShowLanding] = useState<boolean>(() => {
    // Root URL ('/' or '#/welcome') strictly opens the welcome landing screen
    if (initialRoute.isHome) return true;
    if (initialRoute.groupId || initialRoute.isSummary) return false;
    const all = loadAllGroups();
    return all.length === 0;
  });

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

  // Live Toast Notification
  const [liveToast, setLiveToast] = useState<{ id: number; message: string; icon?: string } | null>(null);

  const showLiveToast = (message: string, icon: string = '✨') => {
    const id = Date.now();
    setLiveToast({ id, message, icon });
    setTimeout(() => {
      setLiveToast((current) => (current?.id === id ? null : current));
    }, 4500);
  };

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

  // 1. Initial mount and browser back/forward route synchronization
  useEffect(() => {
    const route = parseCurrentRoute();
    const targetGroupId = route.groupId || (route.rawLegacyGroup ? route.rawLegacyGroup.id : null);

    // A. Sync initial local groups to cloud so backend is populated
    const local = loadAllGroups();
    if (local.length > 0) {
      local.forEach((g) => pushGroupToCloud(g));
    }

    // B. If a specific split is requested via URL, fetch latest state from Cloud
    if (targetGroupId) {
      fetchGroupFromCloud(targetGroupId).then((remoteGroup) => {
        setIsResolvingSharedGroup(false);
        if (remoteGroup) {
          const savedClaimedId = localStorage.getItem(`nooswise_identity_${remoteGroup.id}`);
          const merged = mergeRemoteGroupWithLocal(null, remoteGroup, savedClaimedId);
          setGroups((prev) => {
            const exists = prev.some((g) => g.id === merged.id);
            const updated = exists
              ? prev.map((g) => (g.id === merged.id ? merged : g))
              : [merged, ...prev];
            saveAllGroups(updated, false);
            return updated;
          });
          setCurrentActiveGroupId(merged.id);
          setActiveGroupId(merged.id, false);

          if (!route.isHome) {
            setShowLanding(false);
          }

          if (!savedClaimedId && !route.isHome) {
            setIsJoinModalOpen(true);
          }
        }
      });
    }

    // C. Listen for browser back / forward navigation
    const handlePopState = () => {
      const currentRoute = parseCurrentRoute();
      if (currentRoute.isHome) {
        setShowLanding(true);
        return;
      }

      if (currentRoute.groupId) {
        setCurrentActiveGroupId(currentRoute.groupId);
        setActiveGroupId(currentRoute.groupId, false);
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
  }, []);

  // 2. Real-Time Cloud Synchronization via Server-Sent Events (SSE) + active polling fallback
  useEffect(() => {
    if (!activeGroupId || showLanding) return;

    // A. Subscribe to real-time Server-Sent Events (instant live broadcast across devices/tabs)
    const unsubscribeSSE = subscribeToSplitEvents(activeGroupId, (remoteGroup) => {
      const savedClaimedId = localStorage.getItem(`nooswise_identity_${remoteGroup.id}`);
      setGroups((prev) => {
        const currentActive = prev.find((g) => g.id === activeGroupId);
        const merged = mergeRemoteGroupWithLocal(currentActive || null, remoteGroup, savedClaimedId);

        // Friendly live notifications
        if (currentActive) {
          if (remoteGroup.members.length > currentActive.members.length) {
            const newMem = remoteGroup.members.find(
              (rm) => !currentActive.members.some((lm) => lm.id === rm.id || lm.name.toLowerCase() === rm.name.toLowerCase())
            );
            if (newMem) showLiveToast(`✨ ${newMem.name} joined the split!`, '👋');
          } else if ((remoteGroup.settlements?.length || 0) > (currentActive.settlements?.length || 0)) {
            showLiveToast(`🎉 Settle-up payment recorded live!`, '✓');
          } else if (remoteGroup.expenses.length > currentActive.expenses.length) {
            showLiveToast(`💸 New expense: "${remoteGroup.expenses[0]?.title}"`, '✨');
          }
        }

        const exists = prev.some((g) => g.id === merged.id);
        const updated = exists ? prev.map((g) => (g.id === merged.id ? merged : g)) : [merged, ...prev];
        saveAllGroups(updated, false);
        return updated;
      });
    });

    // B. Fast polling fallback every 1.5 seconds
    const intervalId = setInterval(async () => {
      const currentActive = groups.find((g) => g.id === activeGroupId);
      if (!currentActive) return;

      const pollRes = await pollGroupUpdates(activeGroupId, currentActive.updatedAt);
      if (pollRes.updated && pollRes.group) {
        const remote = pollRes.group;
        const savedClaimedId = localStorage.getItem(`nooswise_identity_${remote.id}`);
        const merged = mergeRemoteGroupWithLocal(currentActive, remote, savedClaimedId);

        if (remote.members.length > currentActive.members.length) {
          const newMem = remote.members.find(
            (rm) => !currentActive.members.some((lm) => lm.id === rm.id)
          );
          if (newMem) showLiveToast(`✨ ${newMem.name} joined the split!`, '👋');
        } else if ((remote.settlements?.length || 0) > (currentActive.settlements?.length || 0)) {
          showLiveToast(`🎉 Settle-up payment recorded!`, '✓');
        }

        setGroups((prev) => {
          const updated = prev.map((g) => (g.id === merged.id ? merged : g));
          saveAllGroups(updated, false);
          return updated;
        });
      }
    }, 1500);

    // C. Instant sync on window focus / visibility
    const handleFocus = () => {
      fetchGroupFromCloud(activeGroupId).then((remote) => {
        if (remote) {
          const savedClaimedId = localStorage.getItem(`nooswise_identity_${remote.id}`);
          setGroups((prev) => {
            const cur = prev.find((g) => g.id === activeGroupId);
            const merged = mergeRemoteGroupWithLocal(cur || null, remote, savedClaimedId);
            const updated = prev.map((g) => (g.id === merged.id ? merged : g));
            saveAllGroups(updated, false);
            return updated;
          });
        }
      });
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      unsubscribeSSE();
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [activeGroupId, showLanding]);

  // 2. Multi-Window / Multi-Tab Synchronization via BroadcastChannel
  useEffect(() => {
    if (!crossTabSyncChannel) return;

    const handleSyncMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GROUPS_UPDATED' && Array.isArray(event.data?.groups)) {
        const incomingGroups: Group[] = event.data.groups;
        setGroups(() => {
          return incomingGroups.map((g) => {
            const savedClaimedId = localStorage.getItem(`nooswise_identity_${g.id}`);
            if (savedClaimedId) {
              return {
                ...g,
                members: g.members.map((m) => ({
                  ...m,
                  isCurrentUser: m.id === savedClaimedId,
                })),
              };
            }
            return g;
          });
        });
      }
    };

    crossTabSyncChannel.addEventListener('message', handleSyncMessage);
    return () => {
      crossTabSyncChannel.removeEventListener('message', handleSyncMessage);
    };
  }, []);

  // 3. Multi-Window / Multi-Tab Synchronization via Storage Events
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setGroups(
              parsed.map((g: Group) => {
                const savedClaimedId = localStorage.getItem(`nooswise_identity_${g.id}`);
                if (savedClaimedId) {
                  return {
                    ...g,
                    members: g.members.map((m) => ({
                      ...m,
                      isCurrentUser: m.id === savedClaimedId,
                    })),
                  };
                }
                return g;
              })
            );
          }
        } catch (err) {
          console.error('Storage sync error', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 4. Listen for URL changes via hash or popstate
  useEffect(() => {
    const handleUrlChange = () => {
      const route = parseCurrentRoute();
      if (route.isHome) {
        setShowLanding(true);
        return;
      }
      if (route.groupId) {
        setCurrentActiveGroupId(route.groupId);
        setActiveGroupId(route.groupId, false);
        setShowLanding(false);
        if (route.tab) {
          setActiveTab(route.tab);
        }
      }
    };

    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  // Sync browser URL bar whenever activeGroupId, activeTab, or showLanding changes
  useEffect(() => {
    if (showLanding) {
      updateBrowserUrl({ isHome: true });
    } else if (activeGroupId) {
      updateBrowserUrl({ isHome: false, groupId: activeGroupId, tab: activeTab });
    }
  }, [showLanding, activeGroupId, activeTab]);

  // Save changes to storage whenever groups change
  useEffect(() => {
    saveAllGroups(groups, false);
  }, [groups]);

  // Current active group. Deliberately does NOT fall back to groups[0]: activeGroupId
  // may point at a split that's still being fetched from the cloud (isResolvingSharedGroup)
  // or that doesn't exist, and silently substituting a different local split there was the
  // cause of shared links opening the wrong group.
  const activeGroup = groups.find((g) => g.id === activeGroupId);

  const currentMember =
    activeGroup?.members?.find((m) => m.isCurrentUser) || activeGroup?.members?.[0];

  const handleCreateGroup = (
    name: string,
    yourName: string,
    memberNames: string[],
    currency: string = 'CAD'
  ) => {
    const newId = `split-${Date.now()}`;
    const cleanYourName = yourName.trim() || 'You';

    // Creator member
    const creatorCute = getRandomAvatar(cleanYourName);
    const creatorMember: Member = {
      id: `m-0-${Date.now()}`,
      name: cleanYourName,
      isCurrentUser: true,
      initials: cleanYourName.slice(0, 2).toUpperCase(),
      avatarUrl: creatorCute.spriteUrl,
      avatarEmoji: creatorCute.emoji,
      avatarBg: creatorCute.bgGradient,
      characterName: creatorCute.characterName,
      email: '',
      paymentHandle: '',
    };

    // Other members only if user explicitly provided names
    const otherMembers: Member[] = memberNames
      .filter((n) => n.toLowerCase() !== cleanYourName.toLowerCase())
      .map((mName, idx) => {
        const cute = getRandomAvatar(mName + idx);
        return {
          id: `m-${idx + 1}-${Date.now()}`,
          name: mName,
          isCurrentUser: false,
          initials: mName.slice(0, 2).toUpperCase(),
          avatarUrl: cute.spriteUrl,
          avatarEmoji: cute.emoji,
          avatarBg: cute.bgGradient,
          characterName: cute.characterName,
          email: '',
          paymentHandle: '',
        };
      });

    // ONLY add the creator and any explicitly provided friends (no random strangers auto-added)
    const finalMembers = [creatorMember, ...otherMembers];

    const newGroup: Group = {
      id: newId,
      name,
      currency,
      members: finalMembers,
      expenses: [],
      settlements: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      myETransferEmail: '',
    };

    localStorage.setItem(`nooswise_identity_${newId}`, creatorMember.id);

    const updated = [newGroup, ...groups];
    setGroups(updated);
    saveAllGroups(updated, true);
    pushGroupToCloud(newGroup);
    setCurrentActiveGroupId(newId);
    setActiveGroupId(newId, true);
    setShowLanding(false);
    setActiveTab('expenses');

    // Automatically pop up the share window with link & QR code so user can share with friends!
    setTimeout(() => {
      setIsShareModalOpen(true);
    }, 100);
  };

  const handleClaimIdentity = (memberId: string) => {
    localStorage.setItem(`nooswise_identity_${activeGroup.id}`, memberId);
    const updatedMembers = activeGroup.members.map((m) => ({
      ...m,
      isCurrentUser: m.id === memberId,
    }));
    handleUpdateGroup({
      ...activeGroup,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleAddMemberToGroup = (name: string, claimAsCurrentUser: boolean = false) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    const newId = `m-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const cute = getRandomAvatar(cleanName);
    const newMember: Member = {
      id: newId,
      name: cleanName,
      isCurrentUser: claimAsCurrentUser,
      initials: cleanName.slice(0, 2).toUpperCase(),
      avatarUrl: cute.spriteUrl,
      avatarEmoji: cute.emoji,
      avatarBg: cute.bgGradient,
      characterName: cute.characterName,
      email: '',
      paymentHandle: '',
    };

    let updatedMembers = [...activeGroup.members];
    if (claimAsCurrentUser) {
      localStorage.setItem(`nooswise_identity_${activeGroup.id}`, newId);
      updatedMembers = updatedMembers.map((m) => ({ ...m, isCurrentUser: false }));
    }
    updatedMembers.push(newMember);

    handleUpdateGroup({
      ...activeGroup,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSelectGroup = (group: Group) => {
    const savedClaimedId = localStorage.getItem(`nooswise_identity_${group.id}`);
    const normalizedGroup: Group = {
      ...group,
      members: group.members.map((m) => ({
        ...m,
        isCurrentUser: savedClaimedId ? m.id === savedClaimedId : m.isCurrentUser,
      })),
    };

    setCurrentActiveGroupId(normalizedGroup.id);
    setActiveGroupId(normalizedGroup.id, true);
    setShowLanding(false);
    setIsGroupDropdownOpen(false);
    setActiveTab('expenses');
  };

  const handleUpdateGroup = (updatedGroup: Group) => {
    const groupWithTimestamp = {
      ...updatedGroup,
      updatedAt: new Date().toISOString(),
    };
    const updated = groups.map((g) => (g.id === groupWithTimestamp.id ? groupWithTimestamp : g));
    setGroups(updated);
    saveAllGroups(updated, true);
    pushGroupToCloud(groupWithTimestamp);
  };

  const handleToggleArchive = (groupId: string = activeGroupId) => {
    const targetGroup = groups.find((g) => g.id === groupId);
    if (!targetGroup) return;
    const isArchived = !targetGroup.isArchived;
    handleUpdateGroup({
      ...targetGroup,
      isArchived,
      archivedAt: isArchived ? new Date().toISOString() : undefined,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleSaveRename = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!renamedTitle.trim()) return;
    handleUpdateGroup({
      ...activeGroup,
      name: renamedTitle.trim(),
      updatedAt: new Date().toISOString(),
    });
    setIsRenamingGroup(false);
    setIsGroupDropdownOpen(false);
  };

  const handleDeleteGroup = (groupId: string) => {
    const remaining = groups.filter((g) => g.id !== groupId);
    setGroups(remaining);
    saveAllGroups(remaining, true);
    if (remaining.length === 0) {
      setCurrentActiveGroupId('');
      setActiveGroupId('', true);
      setShowLanding(true);
    } else {
      setCurrentActiveGroupId(remaining[0].id);
      setActiveGroupId(remaining[0].id, true);
    }
    setActiveTab('expenses');
  };

  const handleResetSampleData = () => {
    setGroups([INITIAL_DEFAULT_GROUP]);
    saveAllGroups([INITIAL_DEFAULT_GROUP], true);
    setCurrentActiveGroupId(INITIAL_DEFAULT_GROUP.id);
    setActiveGroupId(INITIAL_DEFAULT_GROUP.id, true);
    setShowLanding(false);
  };

  // Add / Edit Expense
  const handleSaveExpense = (expenseData: Omit<Expense, 'id'>) => {
    if (editingExpense) {
      const updatedExpense: Expense = {
        ...expenseData,
        id: editingExpense.id,
      };
      const updatedExpenses = activeGroup.expenses.map((e) =>
        e.id === editingExpense.id ? updatedExpense : e
      );
      handleUpdateGroup({
        ...activeGroup,
        expenses: updatedExpenses,
        updatedAt: new Date().toISOString(),
      });
      setEditingExpense(null);
    } else {
      const newExpense: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}`,
      };
      handleUpdateGroup({
        ...activeGroup,
        expenses: [newExpense, ...activeGroup.expenses],
        updatedAt: new Date().toISOString(),
      });
    }
  };

  const handleDeleteExpense = (expenseId: string) => {
    const updated = activeGroup.expenses.filter((e) => e.id !== expenseId);
    handleUpdateGroup({
      ...activeGroup,
      expenses: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  // Settlements
  const handleRecordSettlement = (settlementData: Omit<SettlementRecord, 'id'>) => {
    const newSettlement: SettlementRecord = {
      ...settlementData,
      id: `set-${Date.now()}`,
    };
    handleUpdateGroup({
      ...activeGroup,
      settlements: [newSettlement, ...(activeGroup.settlements || [])],
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUndoSettlement = (settlementId: string) => {
    const updated = (activeGroup.settlements || []).filter((s) => s.id !== settlementId);
    handleUpdateGroup({
      ...activeGroup,
      settlements: updated,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleUpdateMemberPaymentEmail = (memberId: string, email: string) => {
    const cleanEmail = email.trim();
    const updatedMembers = activeGroup.members.map((m) =>
      m.id === memberId
        ? { ...m, paymentHandle: cleanEmail, email: cleanEmail }
        : m
    );
    handleUpdateGroup({
      ...activeGroup,
      members: updatedMembers,
      updatedAt: new Date().toISOString(),
    });
  };

  const handleRenameGroup = (newName: string) => {
    if (!activeGroup || !newName.trim()) return;
    const updated = {
      ...activeGroup,
      name: newName.trim(),
      updatedAt: new Date().toISOString(),
    };
    handleUpdateGroup(updated);
  };

  // A split-specific URL is still being fetched from the cloud — show a neutral
  // loading state rather than any locally-cached (and unrelated) split.
  if (!showLanding && !activeGroup && isResolvingSharedGroup) {
    return (
      <div className="min-h-screen bg-[#F7FAFD] dark:bg-[#090d16] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Logo size={40} />
        <Loader2 className="w-5 h-5 text-[#6E8CB4] dark:text-[#B4D0EE] animate-spin" />
        <p className="text-xs text-[#6E8CB4] dark:text-[#B4D0EE] font-medium">
          Loading this split…
        </p>
      </div>
    );
  }

  // The URL pointed at a split that couldn't be found (bad link, or one that's never
  // been synced to the cloud from its creator's device).
  if (!showLanding && !activeGroup && !isResolvingSharedGroup) {
    return (
      <div className="min-h-screen bg-[#F7FAFD] dark:bg-[#090d16] flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Logo size={40} />
        <div className="w-14 h-14 rounded-full bg-[#E7F0FB] dark:bg-[#203652] text-[#16273F] dark:text-[#B4D0EE] flex items-center justify-center border border-[#DCE6F2] dark:border-[#2A4365]">
          <SearchX className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-display text-2xl text-[#16273F] dark:text-white">
            Split not found
          </h2>
          <p className="text-xs text-[#6E8CB4] dark:text-[#B4D0EE] mt-1 max-w-xs">
            This link doesn't match any split we can find. Double-check the link, or start a new one.
          </p>
        </div>
        <button
          onClick={handleGoHome}
          className="mt-2 px-6 py-3 bg-[#16273F] dark:bg-white text-white dark:text-[#16273F] rounded-full text-xs font-semibold hover:opacity-90 transition-opacity cursor-pointer"
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
    <div className="min-h-screen bg-[#F7FAFD] dark:bg-[#0c1524] text-[#16273F] dark:text-[#F7FAFD] flex flex-col md:flex-row antialiased selection:bg-[#B4D0EE] dark:selection:bg-[#203652] transition-colors">
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
                  className="bg-white dark:bg-[#16273F] text-[#16273F] dark:text-white font-display text-2xl sm:text-3xl px-3 py-1 rounded-xl border border-[#DCE6F2] dark:border-[#2A4365] focus:outline-none focus:ring-2 focus:ring-[#B4D0EE]"
                />
                <button
                  type="submit"
                  className="w-8 h-8 rounded-full bg-[#16273F] dark:bg-white text-white dark:text-[#16273F] flex items-center justify-center cursor-pointer shadow-xs"
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
                <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl text-[#16273F] dark:text-white tracking-tight group-hover:opacity-85 transition-opacity">
                  {activeGroup.name}
                </h2>
                <ChevronDown
                  className={`w-4 h-4 text-[#6E8CB4] transition-transform ${
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
                  className="absolute z-50 left-0 top-full mt-2 w-72 bg-white dark:bg-[#16273F] rounded-2xl shadow-2xl border border-[#DCE6F2] dark:border-[#2A4365] p-2 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between px-2 py-1.5 border-b border-[#DCE6F2] dark:border-[#2A4365]">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#6E8CB4]">
                      Your Splits
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRenamingGroup(true);
                        setIsGroupDropdownOpen(false);
                      }}
                      className="text-[11px] font-semibold text-[#16273F] dark:text-white hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3 text-[#6E8CB4]" />
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
                              ? 'bg-[#E7F0FB] dark:bg-[#203652] text-[#16273F] dark:text-white font-semibold'
                              : 'hover:bg-[#F7FAFD] dark:hover:bg-[#203652]/60 text-[#16273F] dark:text-[#F7FAFD]'
                          }`}
                        >
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs font-semibold truncate">
                              {g.name}
                            </span>
                            <span className="text-[10px] text-[#6E8CB4]">
                              {(g.members || []).length} friends • {(g.expenses || []).length} items
                            </span>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-[#16273F] dark:text-[#B4D0EE]" />
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
                    className="mt-1 flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#F7FAFD] dark:bg-[#203652] hover:bg-[#E7F0FB] dark:hover:bg-[#2A4365] text-xs font-semibold text-[#16273F] dark:text-white border border-[#DCE6F2] dark:border-[#2A4365] cursor-pointer transition-colors"
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
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-white dark:bg-[#16273F] hover:bg-[#E7F0FB] dark:hover:bg-[#203652] text-[#16273F] dark:text-white border border-[#DCE6F2] dark:border-[#2A4365] shadow-2xs transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-[#6E8CB4]" />
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
                  <div className="bg-[#E7F0FB] dark:bg-[#16273F] border border-[#DCE6F2] dark:border-[#2A4365] rounded-[22px] p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-2xs">
                    <div className="flex items-center gap-2.5 text-[#16273F] dark:text-[#F7FAFD]">
                      <span className="w-8 h-8 rounded-full bg-[#B4D0EE] dark:bg-[#203652] text-[#16273F] dark:text-[#B4D0EE] flex items-center justify-center shrink-0">
                        <Archive className="w-4 h-4" />
                      </span>
                      <div>
                        <span className="font-bold block sm:inline mr-1.5">
                          This trip is archived and all square.
                        </span>
                        <span className="text-[#6E8CB4] dark:text-slate-400">
                          All receipts are preserved in read-only mode.
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <motion.button
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setIsTripWrapUpOpen(true)}
                        className="px-3.5 py-1.5 rounded-full bg-[#A9C1A5] text-[#16273F] font-semibold hover:opacity-90 transition-opacity cursor-pointer"
                      >
                        View Recap
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.03, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => handleToggleArchive(activeGroup.id)}
                        className="px-3.5 py-1.5 rounded-full bg-white dark:bg-[#203652] text-[#16273F] dark:text-white border border-[#DCE6F2] dark:border-[#2A4365] font-semibold hover:bg-[#F7FAFD] transition-colors cursor-pointer"
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
                    />
                  </div>

                  {/* Expenses Header & Action Bar */}
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-semibold text-lg md:text-xl text-[#16273F] dark:text-white">
                        What we spent
                      </h3>
                      <p className="text-xs text-[#6E8CB4] dark:text-[#B4D0EE]">
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
                      className="flex items-center gap-2 px-5 py-2.5 bg-[#16273F] dark:bg-white text-white dark:text-[#16273F] rounded-full text-xs md:text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm cursor-pointer group"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add expense</span>
                      <kbd className="hidden sm:inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/20 dark:bg-[#16273F]/20 text-white/90 dark:text-[#16273F]/90 font-semibold ml-0.5">
                        E
                      </kbd>
                    </motion.button>
                  </div>

                  {/* Expense List */}
                  {(activeGroup.expenses || []).length === 0 ? (
                    <div className="bg-white dark:bg-[#16273F] rounded-[30px] p-10 text-center border border-[#DCE6F2] dark:border-[#2A4365] flex flex-col items-center justify-center gap-3 brand-card-shadow">
                      <div className="w-12 h-12 rounded-full bg-[#E7F0FB] dark:bg-[#203652] flex items-center justify-center text-[#16273F] dark:text-[#B4D0EE] border border-[#DCE6F2] dark:border-[#2A4365]">
                        <Receipt className="w-6 h-6" />
                      </div>
                      <h4 className="font-display text-2xl text-[#16273F] dark:text-white font-normal">
                        Nothing recorded yet
                      </h4>
                      <p className="text-xs text-[#6E8CB4] dark:text-[#B4D0EE] max-w-sm">
                        Wrapping up your trip? Start adding your dinners, Uber rides, groceries, or stays.
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.04, y: -1 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => {
                          setEditingExpense(null);
                          setIsAddExpenseOpen(true);
                        }}
                        className="mt-2 bg-[#16273F] dark:bg-white text-white dark:text-[#16273F] text-xs font-semibold px-6 py-2.5 rounded-full hover:opacity-90 transition-opacity flex items-center gap-2 cursor-pointer shadow-md"
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
                  onUpdateGroup={handleUpdateGroup}
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
        onAddMember={(m) => handleAddMemberToGroup(m.name)}
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
            className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 bg-[#16273F]/95 dark:bg-white/95 text-white dark:text-[#16273F] rounded-full shadow-xl border border-[#3B5B88] dark:border-slate-200 backdrop-blur-md text-xs font-semibold pointer-events-none"
          >
            <span className="text-base">{liveToast.icon || '✨'}</span>
            <span>{liveToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
