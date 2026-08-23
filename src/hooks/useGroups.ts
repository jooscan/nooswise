import { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../api/client';
import { ApiError } from '../api/client';
import type { Expense, Group, Member, SettlementRecord } from '../types';
import { getRandomAvatar } from '../utils/avatars';
import {
  clearClaimedMemberId,
  getClaimedMemberId,
  hydrateGroups,
  setClaimedMemberId,
} from '../utils/identity';
import { loadAllGroups, saveAllGroups, setActiveGroupId } from '../utils/storage';

/**
 * Owns every split the app knows about and every action that changes one.
 *
 * The database is the source of truth. localStorage is kept only as a render cache so
 * the app paints instantly on load and survives a brief disconnect — it is never
 * consulted to decide what is true.
 *
 * Each action applies an optimistic local change, calls the API, then replaces its copy
 * with the server's response. If the call fails, the optimistic change is rolled back
 * and the user is told, rather than the UI quietly diverging from the database.
 */

/** Polls as a safety net only; the live stream is what normally delivers changes. */
const POLL_INTERVAL_MS = 20_000;

const LEGACY_IMPORT_FLAG = 'nooswise_migrated_v4';

export interface UseGroupsOptions {
  initialGroupId: string;
  onToast: (message: string, icon?: string) => void;
  /** Fired when a shared link resolves and this device has not said who it is. */
  onIdentityNeeded?: (groupId: string) => void;
  /** Fired when the split you are looking at was deleted by someone else. */
  onGroupDeleted?: (groupId: string) => void;
}

function describeError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.isNetworkError) return "You're offline — that change wasn't saved.";
    return err.message || fallback;
  }
  return fallback;
}

function buildMember(name: string, seedOffset = 0): api.NewMemberInput {
  const clean = name.trim();
  const avatar = getRandomAvatar(clean + (seedOffset || ''));
  return {
    name: clean,
    email: '',
    paymentHandle: '',
    initials: clean.slice(0, 2).toUpperCase(),
    avatarUrl: avatar.spriteUrl,
    avatarEmoji: avatar.emoji,
    avatarBg: avatar.bgGradient,
    characterName: avatar.characterName,
  };
}

export function useGroups({
  initialGroupId,
  onToast,
  onIdentityNeeded,
  onGroupDeleted,
}: UseGroupsOptions) {
  const [groups, setGroups] = useState<Group[]>(() => hydrateGroups(loadAllGroups()));
  const [activeGroupId, setActiveIdState] = useState<string>(initialGroupId);
  const [isResolvingSharedGroup, setIsResolving] = useState<boolean>(() => {
    if (!initialGroupId) return false;
    return !loadAllGroups().some((g) => g.id === initialGroupId);
  });

  // Refs mirror state so callbacks can read the latest value without being rebuilt on
  // every change — the sync effect would otherwise tear down and reconnect constantly.
  const groupsRef = useRef(groups);
  groupsRef.current = groups;
  const activeIdRef = useRef(activeGroupId);
  activeIdRef.current = activeGroupId;
  const revisions = useRef(new Map<string, number>());
  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;

  const persist = useCallback((next: Group[]) => {
    saveAllGroups(next, true);
    return next;
  }, []);

  /** Replaces one group with the server's authoritative copy. */
  const applyGroup = useCallback(
    (group: Group, revision?: number) => {
      if (revision !== undefined) revisions.current.set(group.id, revision);
      setGroups((prev) => {
        const exists = prev.some((g) => g.id === group.id);
        return persist(
          exists ? prev.map((g) => (g.id === group.id ? group : g)) : [group, ...prev]
        );
      });
    },
    [persist]
  );

  const removeGroupLocally = useCallback(
    (groupId: string) => {
      revisions.current.delete(groupId);
      setGroups((prev) => persist(prev.filter((g) => g.id !== groupId)));
    },
    [persist]
  );

  /**
   * The one place optimistic updates, rollback, and error reporting live. Every action
   * below is a couple of lines because of this.
   */
  const mutate = useCallback(
    async (
      groupId: string,
      optimistic: ((group: Group) => Group) | null,
      call: () => Promise<api.GroupResponse>,
      fallbackMessage: string
    ): Promise<Group | null> => {
      const snapshot = groupsRef.current;

      if (optimistic) {
        setGroups((prev) =>
          persist(prev.map((g) => (g.id === groupId ? optimistic(g) : g)))
        );
      }

      try {
        const res = await call();
        applyGroup(res.group, res.revision);
        return res.group;
      } catch (err) {
        setGroups(persist(snapshot));
        onToastRef.current(describeError(err, fallbackMessage), '⚠️');
        return null;
      }
    },
    [applyGroup, persist]
  );

  const selectGroup = useCallback((groupId: string, broadcast = true) => {
    setActiveIdState(groupId);
    setActiveGroupId(groupId, broadcast);
  }, []);

  /* ---------------------------------------------------------------- *
   * Actions
   * ---------------------------------------------------------------- */

  const createGroup = useCallback(
    async (
      name: string,
      yourName: string,
      memberNames: string[],
      currency = 'CAD'
    ): Promise<Group | null> => {
      const creatorName = yourName.trim() || 'You';
      const others = memberNames
        .map((n) => n.trim())
        .filter((n) => n && n.toLowerCase() !== creatorName.toLowerCase());

      try {
        const { group, revision } = await api.createGroup({
          name: name.trim(),
          currency,
          // The server keeps this order and returns it, so members[0] is the creator.
          members: [
            buildMember(creatorName),
            ...others.map((n, i) => buildMember(n, i + 1)),
          ],
        });

        setClaimedMemberId(group.id, group.members[0].id);
        // Re-derive so the creator immediately shows as "You" without a refetch.
        const claimed: Group = {
          ...group,
          members: group.members.map((m, i) => ({ ...m, isCurrentUser: i === 0 })),
        };

        revisions.current.set(group.id, revision);
        setGroups((prev) => persist([claimed, ...prev.filter((g) => g.id !== group.id)]));
        selectGroup(group.id);
        return claimed;
      } catch (err) {
        onToastRef.current(describeError(err, "Couldn't create that split"), '⚠️');
        return null;
      }
    },
    [persist, selectGroup]
  );

  const updateGroupInfo = useCallback(
    async (
      groupId: string,
      patch: {
        name?: string;
        currency?: string;
        myETransferEmail?: string;
        isArchived?: boolean;
      }
    ) =>
      mutate(
        groupId,
        (g) => ({ ...g, ...patch }),
        () => api.patchGroup(groupId, patch),
        "Couldn't save those changes"
      ),
    [mutate]
  );

  const deleteGroup = useCallback(
    async (groupId: string): Promise<boolean> => {
      const snapshot = groupsRef.current;
      removeGroupLocally(groupId);
      try {
        await api.deleteGroup(groupId);
        clearClaimedMemberId(groupId);
        return true;
      } catch (err) {
        setGroups(persist(snapshot));
        onToastRef.current(describeError(err, "Couldn't delete that split"), '⚠️');
        return false;
      }
    },
    [persist, removeGroupLocally]
  );

  const addMember = useCallback(
    async (
      groupId: string,
      name: string,
      claimAsCurrentUser = false
    ): Promise<Member | null> => {
      const clean = name.trim();
      if (!clean) return null;

      try {
        const { group, revision } = await api.addMember(groupId, buildMember(clean));
        // The server assigns the id, so identity can only be claimed once it replies.
        const added = group.members[group.members.length - 1];
        if (claimAsCurrentUser && added) {
          setClaimedMemberId(groupId, added.id);
        }
        applyGroup(
          claimAsCurrentUser && added
            ? {
                ...group,
                members: group.members.map((m) => ({
                  ...m,
                  isCurrentUser: m.id === added.id,
                })),
              }
            : group,
          revision
        );
        return added ?? null;
      } catch (err) {
        onToastRef.current(describeError(err, "Couldn't add that person"), '⚠️');
        return null;
      }
    },
    [applyGroup]
  );

  const updateMember = useCallback(
    async (groupId: string, memberId: string, patch: Partial<api.NewMemberInput>) =>
      mutate(
        groupId,
        (g) => ({
          ...g,
          members: g.members.map((m) => (m.id === memberId ? { ...m, ...patch } : m)),
        }),
        () => api.updateMember(groupId, memberId, patch),
        "Couldn't save those details"
      ),
    [mutate]
  );

  const removeMember = useCallback(
    async (groupId: string, memberId: string): Promise<boolean> => {
      try {
        const { group, revision } = await api.removeMember(groupId, memberId);
        applyGroup(group, revision);
        if (getClaimedMemberId(groupId) === memberId) clearClaimedMemberId(groupId);
        return true;
      } catch (err) {
        // A 409 here is the server refusing to orphan expenses, and its message names
        // what still references them — worth showing verbatim.
        onToastRef.current(describeError(err, "Couldn't remove that person"), '⚠️');
        return false;
      }
    },
    [applyGroup]
  );

  const saveExpense = useCallback(
    async (
      groupId: string,
      expense: Omit<Expense, 'id'>,
      editingExpenseId?: string | null
    ) => {
      if (editingExpenseId) {
        return mutate(
          groupId,
          (g) => ({
            ...g,
            expenses: g.expenses.map((e) =>
              e.id === editingExpenseId ? { ...expense, id: editingExpenseId } : e
            ),
          }),
          () => api.updateExpense(groupId, editingExpenseId, expense),
          "Couldn't save that expense"
        );
      }

      // Optimistic rows get a temporary id; the server's response replaces them.
      const tempId = `pending-${Date.now()}`;
      return mutate(
        groupId,
        (g) => ({ ...g, expenses: [{ ...expense, id: tempId }, ...g.expenses] }),
        () => api.createExpense(groupId, expense),
        "Couldn't add that expense"
      );
    },
    [mutate]
  );

  const deleteExpense = useCallback(
    async (groupId: string, expenseId: string) =>
      mutate(
        groupId,
        (g) => ({ ...g, expenses: g.expenses.filter((e) => e.id !== expenseId) }),
        () => api.deleteExpense(groupId, expenseId),
        "Couldn't delete that expense"
      ),
    [mutate]
  );

  const recordSettlement = useCallback(
    async (groupId: string, settlement: Omit<SettlementRecord, 'id'>) => {
      const tempId = `pending-${Date.now()}`;
      return mutate(
        groupId,
        (g) => ({
          ...g,
          settlements: [{ ...settlement, id: tempId }, ...(g.settlements ?? [])],
        }),
        () => api.createSettlement(groupId, settlement),
        "Couldn't record that payment"
      );
    },
    [mutate]
  );

  const undoSettlement = useCallback(
    async (groupId: string, settlementId: string) =>
      mutate(
        groupId,
        (g) => ({
          ...g,
          settlements: (g.settlements ?? []).filter((s) => s.id !== settlementId),
        }),
        () => api.deleteSettlement(groupId, settlementId),
        "Couldn't undo that payment"
      ),
    [mutate]
  );

  /**
   * Purely local — no network call. Which member you are is a property of this device,
   * not of the split, so it must never be written to the server.
   */
  const claimIdentity = useCallback((groupId: string, memberId: string) => {
    setClaimedMemberId(groupId, memberId);
    setGroups((prev) =>
      persist(
        prev.map((g) =>
          g.id === groupId
            ? {
                ...g,
                members: g.members.map((m) => ({
                  ...m,
                  isCurrentUser: m.id === memberId,
                })),
              }
            : g
        )
      )
    );
  }, [persist]);

  /* ---------------------------------------------------------------- *
   * Loading and live sync
   * ---------------------------------------------------------------- */

  const refresh = useCallback(
    async (groupId: string): Promise<Group | null> => {
      try {
        const res = await api.fetchGroup(groupId);
        if (!res) {
          removeGroupLocally(groupId);
          onGroupDeleted?.(groupId);
          return null;
        }
        applyGroup(res.group, res.revision);
        return res.group;
      } catch {
        // Offline: keep showing the cached copy rather than blanking the screen.
        return null;
      }
    },
    [applyGroup, onGroupDeleted, removeGroupLocally]
  );

  // One-time migration of whatever the old build left in localStorage.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (localStorage.getItem(LEGACY_IMPORT_FLAG)) return;
        const local = loadAllGroups();
        if (local.length === 0) {
          localStorage.setItem(LEGACY_IMPORT_FLAG, new Date().toISOString());
          return;
        }
        await api.importLegacyGroups(local);
        if (cancelled) return;
        localStorage.setItem(LEGACY_IMPORT_FLAG, new Date().toISOString());
      } catch {
        // Leave the flag unset so the next load tries again.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve a split named in the URL.
  useEffect(() => {
    if (!initialGroupId) {
      setIsResolving(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const group = await refresh(initialGroupId);
      if (cancelled) return;
      setIsResolving(false);
      if (group && !getClaimedMemberId(group.id)) {
        onIdentityNeeded?.(group.id);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Deliberately runs once: later group changes go through selectGroup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialGroupId]);

  // Live sync for whichever split is on screen.
  useEffect(() => {
    if (!activeGroupId) return;

    const unsubscribe = api.subscribeToGroup(activeGroupId, (event) => {
      if (event.type === 'GROUP_DELETED') {
        removeGroupLocally(event.groupId);
        onGroupDeleted?.(event.groupId);
        return;
      }

      const previous = groupsRef.current.find((g) => g.id === event.group.id);
      if (previous && event.type === 'GROUP_UPDATED') {
        const joined = event.group.members.find(
          (m) => !previous.members.some((p) => p.id === m.id)
        );
        if (joined) {
          onToastRef.current(`✨ ${joined.name} joined the split!`, '👋');
        } else if (
          (event.group.settlements?.length ?? 0) > (previous.settlements?.length ?? 0)
        ) {
          onToastRef.current('🎉 Settle-up payment recorded live!', '✓');
        } else if (event.group.expenses.length > previous.expenses.length) {
          const added = event.group.expenses.find(
            (e) => !previous.expenses.some((p) => p.id === e.id)
          );
          if (added) onToastRef.current(`💸 New expense: "${added.title}"`, '✨');
        }
      }

      applyGroup(event.group, event.revision);
    });

    const interval = setInterval(async () => {
      if (document.hidden) return;
      try {
        const since = revisions.current.get(activeGroupId) ?? 0;
        const res = await api.pollGroup(activeGroupId, since);
        if (res.updated && res.group) applyGroup(res.group, res.revision);
      } catch {
        /* offline; the cache stands */
      }
    }, POLL_INTERVAL_MS);

    // 'focus' and 'visibilitychange' both fire when a tab comes forward, and switching
    // between windows can fire them repeatedly. Without this guard one tab-switch cost
    // three or four identical full-group fetches.
    let lastRefreshAt = 0;
    const onFocus = () => {
      if (document.hidden) return;
      const now = Date.now();
      if (now - lastRefreshAt < 2000) return;
      lastRefreshAt = now;
      void refresh(activeGroupId);
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [activeGroupId, applyGroup, onGroupDeleted, refresh, removeGroupLocally]);

  const activeGroup = groups.find((g) => g.id === activeGroupId);

  return {
    groups,
    activeGroup,
    activeGroupId,
    isResolvingSharedGroup,
    selectGroup,
    refresh,
    createGroup,
    updateGroupInfo,
    deleteGroup,
    addMember,
    updateMember,
    removeMember,
    saveExpense,
    deleteExpense,
    recordSettlement,
    undoSettlement,
    claimIdentity,
    setGroups,
  };
}
