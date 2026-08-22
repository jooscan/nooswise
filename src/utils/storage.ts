import LZString from 'lz-string';
import { Group, Member, Expense, SettlementRecord } from '../types';
import { CUTE_AVATARS, getCuteAvatarByCharacter } from './avatars';
import { formatCurrency, calculateMemberBalances } from './debtSimplification';

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

/**
 * Load all user-saved groups from localStorage.
 * Every new device/browser starts as a clean slate without default sample data.
 */
export function loadAllGroups(): Group[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.error('Error loading groups from storage', e);
    return [];
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
    return localStorage.getItem(ACTIVE_GROUP_KEY) || '';
  } catch {
    return '';
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
 * Encode group/split to an ultra-compact, shortened shareable URL using LZ compression.
 */
export function encodeGroupToUrl(group: Group): string {
  try {
    if (!group) return typeof window !== 'undefined' ? window.location.href : '';

    // Create minimal, compact payload (omit empty fields to minimize payload size)
    const compactPayload: any = {
      i: group.id,
      n: group.name,
      c: group.currency || 'CAD',
      m: (group.members || []).map((m) => {
        const item: any = {
          i: m.id,
          n: m.name,
        };
        if (m.initials && m.initials !== m.name.slice(0, 2).toUpperCase()) {
          item.in = m.initials;
        }
        if (m.characterName && m.characterName !== 'Eevee') {
          item.cn = m.characterName;
        }
        if (m.email) item.e = m.email;
        if (m.paymentHandle && m.paymentHandle !== m.email) item.p = m.paymentHandle;
        return item;
      }),
      x: (group.expenses || []).map((e) => {
        const exp: any = {
          i: e.id,
          t: e.title,
          a: e.amount,
          p: e.paidByMemberId,
          cat: e.category,
          d: e.date,
          st: e.splitType,
          s: (e.splits || []).map((sp) => ({ m: sp.memberId, a: sp.amount })),
        };
        if (e.currency && e.currency !== group.currency) exp.c = e.currency;
        if (e.notes) exp.nt = e.notes;
        if (e.originalAmount) exp.oa = e.originalAmount;
        if (e.originalCurrency) exp.oc = e.originalCurrency;
        if (e.exchangeRate) exp.r = e.exchangeRate;
        return exp;
      }),
    };

    if (group.settlements && group.settlements.length > 0) {
      compactPayload.s = group.settlements.map((s) => {
        const setItem: any = {
          i: s.id,
          f: s.fromMemberId,
          t: s.toMemberId,
          a: s.amount,
          d: s.date,
          m: s.paymentMethod,
        };
        if (s.currency && s.currency !== group.currency) setItem.c = s.currency;
        if (s.note) setItem.n = s.note;
        return setItem;
      });
    }

    const jsonStr = JSON.stringify(compactPayload);
    // Ultra-compact URI safe compression
    const compressed = LZString.compressToEncodedURIComponent(jsonStr);

    const base =
      typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
    return `${base}#s=${compressed}`;
  } catch (e) {
    console.error('Error encoding split to URL', e);
    return typeof window !== 'undefined' ? window.location.href : '';
  }
}

/**
 * Decode group/split from URL hash with full backwards & forwards compatibility
 */
export function decodeGroupFromUrl(): Group | null {
  try {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash;
    if (!hash || (!hash.includes('#s=') && !hash.includes('#split=') && !hash.includes('#group='))) {
      return null;
    }

    let raw = '';
    let isLZ = false;

    if (hash.includes('#s=')) {
      raw = hash.split('#s=')[1];
      isLZ = true;
    } else if (hash.includes('#split=')) {
      raw = hash.split('#split=')[1];
    } else if (hash.includes('#group=')) {
      raw = hash.split('#group=')[1];
    }

    if (!raw) return null;

    let parsed: any = null;

    // 1. Try LZString decompression first
    if (isLZ) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(raw);
        if (decompressed) {
          parsed = JSON.parse(decompressed);
        }
      } catch (err) {
        console.warn('LZ decompression failed, trying fallback', err);
      }
    }

    // 2. If not parsed yet, try LZ on raw (in case of #split= with LZ)
    if (!parsed) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(raw);
        if (decompressed) {
          parsed = JSON.parse(decompressed);
        }
      } catch {
        // Continue to legacy formats
      }
    }

    // 3. Try standard Base64 URI decode (legacy format)
    if (!parsed) {
      try {
        const decodedStr = decodeURIComponent(atob(raw));
        parsed = JSON.parse(decodedStr);
      } catch {
        try {
          const decodedUri = decodeURIComponent(raw);
          parsed = JSON.parse(decodedUri);
        } catch {
          try {
            parsed = JSON.parse(raw);
          } catch {
            return null;
          }
        }
      }
    }

    if (!parsed) return null;

    // Compact format check
    if (parsed.i && parsed.n && Array.isArray(parsed.m)) {
      const fullMembers: Member[] = parsed.m.map((m: any, idx: number) => {
        const charName = m.cn || 'Eevee';
        const cute = getCuteAvatarByCharacter(charName);
        const memberName = m.n || 'Friend';
        return {
          id: m.i || `m-${idx}`,
          name: memberName,
          isCurrentUser: false, // Will be resolved by user's claimed identity
          initials: m.in || memberName.slice(0, 2).toUpperCase(),
          characterName: cute.characterName,
          avatarUrl: cute.spriteUrl,
          avatarEmoji: cute.emoji,
          avatarBg: cute.bgGradient,
          email: m.e || '',
          paymentHandle: m.p || m.e || '',
        };
      });

      const groupCurrency = parsed.c || 'CAD';

      const fullExpenses: Expense[] = (parsed.x || []).map((e: any) => ({
        id: e.i || `exp-${Date.now()}-${Math.random()}`,
        title: e.t || 'Expense',
        amount: Number(e.a) || 0,
        currency: e.c || groupCurrency,
        paidByMemberId: e.p || fullMembers[0]?.id,
        category: e.cat || 'other',
        date: e.d || 'Today',
        splitType: e.st || 'equally',
        splits: (e.s || []).map((sp: any) => ({
          memberId: sp.m || sp.memberId,
          amount: Number(sp.a ?? sp.amount) || 0,
        })),
        notes: e.nt || '',
        originalAmount: e.oa,
        originalCurrency: e.oc,
        exchangeRate: e.r,
      }));

      const fullSettlements: SettlementRecord[] = (parsed.s || []).map((s: any) => ({
        id: s.i || `set-${Date.now()}`,
        fromMemberId: s.f || s.fromMemberId,
        toMemberId: s.t || s.toMemberId,
        amount: Number(s.a ?? s.amount) || 0,
        currency: s.c || groupCurrency,
        date: s.d || s.date || new Date().toISOString(),
        paymentMethod: s.m || s.paymentMethod || 'e-Transfer',
        note: s.n || s.note,
      }));

      return {
        id: parsed.i,
        name: parsed.n,
        currency: groupCurrency,
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
            paymentHandle: m.paymentHandle || m.email || '',
          };
        }),
      };
    }
  } catch (e) {
    console.error('Error decoding group from url', e);
  }
  return null;
}

/**
 * Draft a cute, friendly invitation message for group chat sharing.
 */
export function getShareInviteMessage(group: Group, senderName?: string): string {
  const url = encodeGroupToUrl(group);
  const author = senderName ? senderName.trim() : (group.members[0]?.name || 'Your friend');
  return `🦔 ${author} invited you to join "${group.name}" on nooswise! ✨\n\nTap the link to see what you owe, add expenses, and settle up easily:\n${url}`;
}

/**
 * Formatted expense summary breakdown with cute invite footer.
 */
export function getShareBreakdownText(group: Group, senderName?: string): string {
  const url = encodeGroupToUrl(group);
  const total = (group.expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
  const balances = calculateMemberBalances(group);
  const author = senderName ? senderName.trim() : (group.members[0]?.name || 'Your friend');

  return `✨ nooswise split: ${group.name} ✨
Total: ${formatCurrency(total, group.currency || 'CAD')} (${(group.expenses || []).length} items)

Balances:
${balances
  .map(
    (b) =>
      `• ${b.member.name}: ${
        b.netBalance > 0.009
          ? `Gets ${formatCurrency(b.netBalance, group.currency || 'CAD')}`
          : b.netBalance < -0.009
          ? `Owes ${formatCurrency(Math.abs(b.netBalance), group.currency || 'CAD')}`
          : 'Settled ✓'
      }`
  )
  .join('\n')}

View & Settle (${author} invited you):
${url}`;
}

