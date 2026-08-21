import { Group, Member, Expense, SettlementRecord } from '../types';
import { CUTE_AVATARS, getCuteAvatarByCharacter } from './avatars';

export const INITIAL_DEFAULT_GROUP: Group = {
  id: 'weekend-getaway',
  name: 'Weekend Getaway',
  currency: 'CAD',
  myETransferEmail: '',
  createdAt: '2026-10-08T10:00:00.000Z',
  updatedAt: '2026-10-12T14:30:00.000Z',
  members: [
    {
      id: 'm-you',
      name: 'Joyce',
      isCurrentUser: true,
      initials: 'JC',
      avatarUrl: CUTE_AVATARS[0].spriteUrl, // Eevee
      avatarEmoji: '💖',
      avatarBg: 'from-[#FCE4EC] to-[#F8BBD0]',
      characterName: 'Eevee',
      email: '',
      paymentHandle: '',
    },
    {
      id: 'm-sarah',
      name: 'Joanna',
      isCurrentUser: false,
      initials: 'JN',
      avatarUrl: CUTE_AVATARS[1].spriteUrl, // Togepi
      avatarEmoji: '✨',
      avatarBg: 'from-[#FFF9C4] to-[#FFF176]',
      characterName: 'Togepi',
      email: 'joanna.n@gmail.com',
      paymentHandle: 'joanna.n@gmail.com',
    },
    {
      id: 'm-alex',
      name: 'Alex',
      isCurrentUser: false,
      initials: 'AM',
      avatarUrl: CUTE_AVATARS[2].spriteUrl, // Jigglypuff
      avatarEmoji: '🌸',
      avatarBg: 'from-[#F8BBD0] to-[#E1BEE7]',
      characterName: 'Jigglypuff',
      email: 'alex.m@gmail.com',
      paymentHandle: 'alex.m@gmail.com',
    },
    {
      id: 'm-michael',
      name: 'Michael',
      isCurrentUser: false,
      initials: 'MJ',
      avatarUrl: CUTE_AVATARS[3].spriteUrl, // Pikachu
      avatarEmoji: '⭐',
      avatarBg: 'from-[#FFFDE7] to-[#FFE082]',
      characterName: 'Pikachu',
      email: 'michael.j@gmail.com',
      paymentHandle: 'michael.j@gmail.com',
    },
  ],
  expenses: [
    {
      id: 'exp-1',
      title: 'Sunday Brunch',
      amount: 124.5,
      currency: 'CAD',
      paidByMemberId: 'm-sarah',
      category: 'food',
      date: 'Today',
      splitType: 'equally',
      splits: [
        { memberId: 'm-you', amount: 31.125 },
        { memberId: 'm-sarah', amount: 31.125 },
        { memberId: 'm-alex', amount: 31.125 },
        { memberId: 'm-michael', amount: 31.125 },
      ],
      notes: 'Bottomless mimosas and brunch plates at Bistro Riviera',
    },
    {
      id: 'exp-2',
      title: 'London Pub Drinks',
      amount: 87.18,
      currency: 'CAD',
      originalAmount: 50.0,
      originalCurrency: 'GBP',
      exchangeRate: 1.7436,
      paidByMemberId: 'm-you',
      category: 'drinks',
      date: 'Yesterday',
      splitType: 'equally',
      splits: [
        { memberId: 'm-you', amount: 21.795 },
        { memberId: 'm-sarah', amount: 21.795 },
        { memberId: 'm-alex', amount: 21.795 },
        { memberId: 'm-michael', amount: 21.795 },
      ],
      notes: 'Draft pints and bar snacks (paid £50.00 GBP)',
    },
    {
      id: 'exp-3',
      title: 'Groceries',
      amount: 86.2,
      currency: 'CAD',
      paidByMemberId: 'm-alex',
      category: 'home',
      date: 'Oct 12',
      splitType: 'exact',
      splits: [
        { memberId: 'm-you', amount: 20.0 },
        { memberId: 'm-sarah', amount: 22.2 },
        { memberId: 'm-alex', amount: 24.0 },
        { memberId: 'm-michael', amount: 20.0 },
      ],
      notes: 'Snacks, wine, cheeses, breakfast supplies',
    },
    {
      id: 'exp-4',
      title: 'Airbnb Beachside Villa',
      amount: 589.3,
      currency: 'CAD',
      paidByMemberId: 'm-michael',
      category: 'home',
      date: 'Oct 10',
      splitType: 'equally',
      splits: [
        { memberId: 'm-you', amount: 147.325 },
        { memberId: 'm-sarah', amount: 147.325 },
        { memberId: 'm-alex', amount: 147.325 },
        { memberId: 'm-michael', amount: 147.325 },
      ],
      notes: 'Beachside Villa - 2 nights',
    },
  ],
  settlements: [],
};

export const STORAGE_KEY = 'nooswise_groups_v3';
export const ACTIVE_GROUP_KEY = 'nooswise_active_group_id_v3';

// BroadcastChannel for cross-tab and cross-window real-time instant synchronization
export const crossTabSyncChannel =
  typeof window !== 'undefined' && 'BroadcastChannel' in window
    ? new BroadcastChannel('nooswise_cross_tab_sync')
    : null;

export function loadAllGroups(): Group[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveAllGroups([INITIAL_DEFAULT_GROUP]);
      return [INITIAL_DEFAULT_GROUP];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      // Ensure existing cached default group has member payment handles
      const upgraded = parsed.map((g: Group) => {
        if (g.id === 'weekend-getaway') {
          const members = g.members.map((m) => {
            if (m.id === 'm-alex' && !m.email && !m.paymentHandle) {
              return { ...m, email: 'alex.m@gmail.com', paymentHandle: 'alex.m@gmail.com' };
            }
            if (m.id === 'm-sarah' && !m.email && !m.paymentHandle) {
              return { ...m, email: 'joanna.n@gmail.com', paymentHandle: 'joanna.n@gmail.com' };
            }
            if (m.id === 'm-michael' && !m.email && !m.paymentHandle) {
              return { ...m, email: 'michael.j@gmail.com', paymentHandle: 'michael.j@gmail.com' };
            }
            return m;
          });
          return { ...g, members };
        }
        return g;
      });
      return upgraded;
    }
    return [INITIAL_DEFAULT_GROUP];
  } catch (e) {
    console.error('Error loading groups from storage', e);
    return [INITIAL_DEFAULT_GROUP];
  }
}

export function saveAllGroups(groups: Group[], broadcast: boolean = true): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
    if (broadcast && crossTabSyncChannel) {
      crossTabSyncChannel.postMessage({
        type: 'GROUPS_UPDATED',
        timestamp: Date.now(),
        groups,
      });
    }
  } catch (e) {
    console.error('Error saving groups to storage', e);
  }
}

export function getActiveGroupId(): string {
  try {
    return localStorage.getItem(ACTIVE_GROUP_KEY) || INITIAL_DEFAULT_GROUP.id;
  } catch {
    return INITIAL_DEFAULT_GROUP.id;
  }
}

export function setActiveGroupId(id: string, broadcast: boolean = true): void {
  try {
    localStorage.setItem(ACTIVE_GROUP_KEY, id);
    if (broadcast && crossTabSyncChannel) {
      crossTabSyncChannel.postMessage({
        type: 'ACTIVE_GROUP_CHANGED',
        groupId: id,
      });
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Encode group/split to shareable URL hash with clean, compact serialization
 */
export function encodeGroupToUrl(group: Group): string {
  try {
    if (!group) return typeof window !== 'undefined' ? window.location.href : '';

    // Create compact payload (strip large repetitive strings)
    const compactPayload = {
      i: group.id,
      n: group.name,
      c: group.currency || 'CAD',
      m: (group.members || []).map((m) => ({
        i: m.id,
        n: m.name,
        in: m.initials,
        cn: m.characterName || 'Eevee',
        e: m.email || '',
        p: m.paymentHandle || '',
      })),
      x: (group.expenses || []).map((e) => ({
        i: e.id,
        t: e.title,
        a: e.amount,
        c: e.currency,
        p: e.paidByMemberId,
        cat: e.category,
        d: e.date,
        st: e.splitType,
        s: e.splits,
        nt: e.notes || '',
        oa: e.originalAmount,
        oc: e.originalCurrency,
        r: e.exchangeRate,
      })),
      s: (group.settlements || []).map((s) => ({
        i: s.id,
        f: s.fromMemberId,
        t: s.toMemberId,
        a: s.amount,
        c: s.currency,
        d: s.date,
        m: s.paymentMethod,
        n: s.note,
      })),
    };

    const jsonStr = JSON.stringify(compactPayload);
    // Base64 encode for clean URL hash
    let encoded = '';
    try {
      encoded = btoa(encodeURIComponent(jsonStr));
    } catch {
      encoded = encodeURIComponent(jsonStr);
    }

    const base =
      typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
    return `${base}#split=${encoded}`;
  } catch (e) {
    console.error('Error encoding split to URL', e);
    return typeof window !== 'undefined' ? window.location.href : '';
  }
}

/**
 * Decode group/split from URL hash with backward and forward compatibility
 */
export function decodeGroupFromUrl(): Group | null {
  try {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash;
    if (!hash || (!hash.includes('#split=') && !hash.includes('#group='))) {
      return null;
    }

    let raw = '';
    if (hash.includes('#split=')) {
      raw = hash.split('#split=')[1];
    } else if (hash.includes('#group=')) {
      raw = hash.split('#group=')[1];
    }

    if (!raw) return null;

    let parsed: any = null;

    // Try btoa decoded JSON first
    try {
      const decodedStr = decodeURIComponent(atob(raw));
      parsed = JSON.parse(decodedStr);
    } catch {
      try {
        const decodedUri = decodeURIComponent(raw);
        parsed = JSON.parse(decodedUri);
      } catch {
        // Fallback standard parse
        try {
          parsed = JSON.parse(raw);
        } catch {
          return null;
        }
      }
    }

    if (!parsed) return null;

    // Compact format check
    if (parsed.i && parsed.n && Array.isArray(parsed.m)) {
      const fullMembers: Member[] = parsed.m.map((m: any, idx: number) => {
        const charName = m.cn || 'Eevee';
        const cute = getCuteAvatarByCharacter(charName);
        return {
          id: m.i || `m-${idx}`,
          name: m.n || 'Friend',
          isCurrentUser: idx === 0,
          initials: m.in || (m.n ? m.n.slice(0, 2).toUpperCase() : 'FR'),
          characterName: cute.characterName,
          avatarUrl: cute.spriteUrl,
          avatarEmoji: cute.emoji,
          avatarBg: cute.bgGradient,
          email: m.e || '',
          paymentHandle: m.p || '',
        };
      });

      const fullExpenses: Expense[] = (parsed.x || []).map((e: any) => ({
        id: e.i || `exp-${Date.now()}-${Math.random()}`,
        title: e.t || 'Expense',
        amount: Number(e.a) || 0,
        currency: e.c || parsed.c || 'CAD',
        paidByMemberId: e.p || fullMembers[0]?.id,
        category: e.cat || 'other',
        date: e.d || 'Today',
        splitType: e.st || 'equally',
        splits: e.s || [],
        notes: e.nt || '',
        originalAmount: e.oa,
        originalCurrency: e.oc,
        exchangeRate: e.r,
      }));

      const fullSettlements: SettlementRecord[] = (parsed.s || []).map((s: any) => ({
        id: s.i || `set-${Date.now()}`,
        fromMemberId: s.f,
        toMemberId: s.t,
        amount: Number(s.a) || 0,
        currency: s.c || parsed.c || 'CAD',
        date: s.d || new Date().toISOString(),
        paymentMethod: s.m || 'e-Transfer',
        note: s.n,
      }));

      return {
        id: parsed.i,
        name: parsed.n,
        currency: parsed.c || 'CAD',
        members: fullMembers,
        expenses: fullExpenses,
        settlements: fullSettlements,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    // Standard uncompressed format check
    if (parsed.id && parsed.name && Array.isArray(parsed.members)) {
      return {
        ...parsed,
        members: parsed.members.map((m: any) => {
          const cute = getCuteAvatarByCharacter(m.characterName || m.name);
          return {
            ...m,
            avatarUrl: m.avatarUrl || cute.spriteUrl,
            avatarEmoji: m.avatarEmoji || cute.emoji,
            avatarBg: m.avatarBg || cute.bgGradient,
            characterName: m.characterName || cute.characterName,
            email: m.email || '',
            paymentHandle: m.paymentHandle || '',
          };
        }),
      };
    }
  } catch (e) {
    console.error('Error decoding group from url', e);
  }
  return null;
}
