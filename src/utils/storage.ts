import LZString from 'lz-string';
import { Group, Member, Expense, SettlementRecord } from '../types';
import { CUTE_AVATARS, getCuteAvatarByCharacter } from './avatars';
import { formatCurrency, calculateMemberBalances } from './debtSimplification';
import { getCachedShortUrl } from './urlShortener';

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
 * Route Information Interface
 */
export interface ParsedRoute {
  isHome: boolean;
  groupId: string | null;
  tab: 'expenses' | 'settle-up' | 'settings' | null;
  isSummary: boolean;
  rawLegacyGroup: Group | null;
}

/**
 * Parse current browser URL (path or hash) to extract exact route state
 */
export function parseCurrentRoute(): ParsedRoute {
  if (typeof window === 'undefined') {
    return { isHome: true, groupId: null, tab: null, isSummary: false, rawLegacyGroup: null };
  }

  const pathname = window.location.pathname.replace(/^\/+|\/+$/g, '');
  const hash = window.location.hash.replace(/^#\/?/, '').replace(/\/+$/, '');

  // Check if legacy encoded group is in hash
  const legacyGroup = decodeGroupFromUrl();
  if (legacyGroup && (window.location.hash.includes('#s=') || window.location.hash.includes('#split=') || window.location.hash.includes('#group='))) {
    return {
      isHome: false,
      groupId: legacyGroup.id,
      tab: 'expenses',
      isSummary: false,
      rawLegacyGroup: legacyGroup,
    };
  }

  // 1. Root / Welcome Screen: '/' or '' or '#/' or '#welcome' or '#home'
  if (!pathname && (!hash || hash === 'welcome' || hash === 'home')) {
    return {
      isHome: true,
      groupId: null,
      tab: null,
      isSummary: false,
      rawLegacyGroup: null,
    };
  }

  // 2. Global summary route: '/summary' or '#/summary' or '/settle-up' or '#/settle-up'
  if (pathname === 'summary' || hash === 'summary' || pathname === 'settle-up' || hash === 'settle-up') {
    return {
      isHome: false,
      groupId: null,
      tab: 'settle-up',
      isSummary: true,
      rawLegacyGroup: null,
    };
  }

  // 3. Path-based /:groupId or /:groupId/summary or /:groupId/settings
  const pathParts = pathname ? pathname.split('/') : [];
  const hashParts = hash ? hash.split('/') : [];

  const parts = pathParts.length > 0 && pathParts[0] !== 'index.html' ? pathParts : hashParts;

  if (parts.length > 0) {
    let rawGroupId = parts[0];
    if (rawGroupId === 's' && parts.length > 1) {
      rawGroupId = parts[1];
    }

    // Filter out common asset or system paths
    if (rawGroupId && !rawGroupId.startsWith('api') && !rawGroupId.startsWith('assets') && !rawGroupId.endsWith('.js') && !rawGroupId.endsWith('.css')) {
      const subRoute = parts[parts.length - 1];
      const isSummary = subRoute === 'summary' || subRoute === 'settle-up';
      const isSettings = subRoute === 'settings';

      return {
        isHome: false,
        groupId: rawGroupId,
        tab: isSummary ? 'settle-up' : isSettings ? 'settings' : 'expenses',
        isSummary,
        rawLegacyGroup: null,
      };
    }
  }

  return {
    isHome: false,
    groupId: null,
    tab: null,
    isSummary: false,
    rawLegacyGroup: null,
  };
}

/**
 * Extract split ID from current URL (hash or path)
 */
export function getSplitIdFromUrl(): string | null {
  const route = parseCurrentRoute();
  return route.groupId;
}

/**
 * Encode group/split to a clean shareable URL (e.g., https://nooswise.netlify.app/weekend-getaway or /weekend-getaway/summary)
 */
export function encodeGroupToUrl(group: Group, isSummary: boolean = false): string {
  try {
    if (!group) return typeof window !== 'undefined' ? window.location.href : '';
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://nooswise.netlify.app';
    const sub = isSummary ? '/summary' : '';
    return `${base}/${group.id}${sub}`;
  } catch (e) {
    console.error('Error encoding split to URL', e);
    return typeof window !== 'undefined' ? window.location.href : '';
  }
}

/**
 * Update browser URL bar cleanly without reloading the page
 */
export function updateBrowserUrl(options: {
  isHome?: boolean;
  groupId?: string | null;
  tab?: 'expenses' | 'settle-up' | 'settings';
}): void {
  if (typeof window === 'undefined') return;

  try {
    if (options.isHome) {
      if (window.location.pathname !== '/' || window.location.hash) {
        window.history.pushState(null, '', '/');
      }
      return;
    }

    if (options.groupId) {
      let subPath = '';
      if (options.tab === 'settle-up') {
        subPath = '/summary';
      } else if (options.tab === 'settings') {
        subPath = '/settings';
      }

      const newPath = `/${encodeURIComponent(options.groupId)}${subPath}`;
      if (window.location.pathname !== newPath) {
        window.history.pushState(null, '', newPath);
      }
    }
  } catch {
    // Fallback to hash if history API restricted
    if (options.isHome) {
      window.location.hash = '';
    } else if (options.groupId) {
      window.location.hash = `#/${options.groupId}${options.tab === 'settle-up' ? '/summary' : ''}`;
    }
  }
}

/**
 * Decode group/split from URL hash with full backwards compatibility
 */
export function decodeGroupFromUrl(): Group | null {
  try {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash;
    const splitId = getSplitIdFromUrl();

    // If it's a short URL ID reference (#/s/xyz)
    if (splitId && !hash.includes('#s=N4')) {
      const localGroups = loadAllGroups();
      const existing = localGroups.find((g) => g.id === splitId);
      if (existing) return existing;

      // Temporary placeholder while cloud fetch completes
      return {
        id: splitId,
        name: splitId.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        currency: 'CAD',
        members: [],
        expenses: [],
        settlements: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

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

    // 2. If not parsed yet, try LZ on raw
    if (!parsed) {
      try {
        const decompressed = LZString.decompressFromEncodedURIComponent(raw);
        if (decompressed) {
          parsed = JSON.parse(decompressed);
        }
      } catch {}
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
          isCurrentUser: false,
          initials: m.in || memberName.slice(0, 2).toUpperCase(),
          avatarUrl: cute.spriteUrl,
          avatarEmoji: cute.emoji,
          avatarBg: cute.bgGradient,
          characterName: cute.characterName,
          email: m.e || '',
          paymentHandle: m.p || m.e || '',
        };
      });

      const groupCurrency = parsed.c || 'CAD';

      const fullExpenses: Expense[] = (parsed.x || []).map((e: any, idx: number) => ({
        id: e.i || `exp-${idx}`,
        title: e.t || 'Expense',
        amount: Number(e.a) || 0,
        currency: e.c || groupCurrency,
        originalAmount: e.oa ? Number(e.oa) : undefined,
        originalCurrency: e.oc || undefined,
        exchangeRate: e.r ? Number(e.r) : undefined,
        paidByMemberId: e.p || (fullMembers[0] ? fullMembers[0].id : ''),
        category: e.cat || 'other',
        date: e.d || 'Today',
        splitType: e.st || 'equally',
        splits: (e.s || []).map((sp: any) => ({
          memberId: sp.m,
          amount: Number(sp.a) || 0,
        })),
        notes: e.nt || '',
      }));

      const fullSettlements: SettlementRecord[] = (parsed.s || []).map((s: any, idx: number) => ({
        id: s.i || `set-${idx}`,
        fromMemberId: s.f,
        toMemberId: s.t,
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
export function getShareInviteMessage(group: Group, senderName?: string, overrideUrl?: string): string {
  const fullUrl = encodeGroupToUrl(group);
  const url = overrideUrl || getCachedShortUrl(fullUrl) || fullUrl;
  const author = senderName ? senderName.trim() : (group.members[0]?.name || 'Your friend');
  return `🦔 ${author} invited you to join "${group.name}" on nooswise! ✨\n\nTap the link to see what you owe, add expenses, and settle up easily:\n${url}`;
}

/**
 * Formatted expense summary breakdown with cute invite footer.
 */
export function getShareBreakdownText(group: Group, senderName?: string, overrideUrl?: string): string {
  const fullUrl = encodeGroupToUrl(group);
  const url = overrideUrl || getCachedShortUrl(fullUrl) || fullUrl;
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
