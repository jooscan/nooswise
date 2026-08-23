import type { Group, Member } from '../types';

/**
 * Which member you are is device-local, not shared state.
 *
 * It used to be stored on the group itself as `isCurrentUser` and synced to everyone,
 * so when a friend opened the share link and picked their name, it overwrote your view
 * of who *you* were. The server has no column for it now; this module is the only place
 * that decides it.
 */

const IDENTITY_PREFIX = 'nooswise_identity_';
const CLIENT_ID_KEY = 'nooswise_client_id';

export function getClaimedMemberId(groupId: string): string | null {
  if (!groupId || typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(`${IDENTITY_PREFIX}${groupId}`);
  } catch {
    return null;
  }
}

export function setClaimedMemberId(groupId: string, memberId: string): void {
  if (!groupId || typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${IDENTITY_PREFIX}${groupId}`, memberId);
  } catch {
    /* private browsing */
  }
}

export function clearClaimedMemberId(groupId: string): void {
  if (!groupId || typeof window === 'undefined') return;
  try {
    localStorage.removeItem(`${IDENTITY_PREFIX}${groupId}`);
  } catch {
    /* private browsing */
  }
}

/**
 * A stable per-browser id, sent with every write so the server can avoid streaming a
 * change back to the tab that caused it.
 */
export function getDeviceClientId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const fresh =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `c-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(CLIENT_ID_KEY, fresh);
    return fresh;
  } catch {
    return 'ephemeral';
  }
}

/**
 * Stamps `isCurrentUser` onto a group the server just sent. The server always reports
 * false for everyone, so this is where "You" is decided, on this device only.
 */
export function hydrateGroup(group: Group): Group {
  const claimedId = getClaimedMemberId(group.id);
  return {
    ...group,
    members: group.members.map(
      (m): Member => ({ ...m, isCurrentUser: claimedId ? m.id === claimedId : false })
    ),
  };
}

export function hydrateGroups(groups: Group[]): Group[] {
  return groups.map(hydrateGroup);
}
