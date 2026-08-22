import { Group } from '../types';

/**
 * Cloud Synchronization Client
 * Syncs split state in real-time between friends on different devices.
 */

export async function pushGroupToCloud(group: Group): Promise<boolean> {
  if (!group || !group.id) return false;
  try {
    const res = await fetch(`/api/splits/${encodeURIComponent(group.id)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(group),
    });
    return res.ok;
  } catch (err) {
    console.warn('Cloud sync push failed (offline fallback active):', err);
    return false;
  }
}

export async function fetchGroupFromCloud(groupId: string): Promise<Group | null> {
  if (!groupId) return null;
  try {
    const res = await fetch(`/api/splits/${encodeURIComponent(groupId)}`, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.group) {
      return json.group as Group;
    }
    return null;
  } catch (err) {
    console.warn('Cloud sync fetch failed:', err);
    return null;
  }
}

export async function pollGroupUpdates(
  groupId: string,
  since: string
): Promise<{ updated: boolean; group?: Group; updatedAt?: string }> {
  if (!groupId) return { updated: false };
  try {
    const url = `/api/splits/${encodeURIComponent(groupId)}/poll?since=${encodeURIComponent(since || '')}`;
    const res = await fetch(url, {
      headers: {
        'Cache-Control': 'no-cache',
      },
    });
    if (!res.ok) return { updated: false };
    const json = await res.json();
    return json;
  } catch (err) {
    return { updated: false };
  }
}

/**
 * Real-time Server-Sent Events (SSE) subscriber
 * Pushes updates from server to client with zero latency!
 */
export function subscribeToSplitEvents(
  groupId: string,
  onUpdate: (remoteGroup: Group) => void
): () => void {
  if (typeof window === 'undefined' || !groupId || typeof EventSource === 'undefined') {
    return () => {};
  }

  let eventSource: EventSource | null = null;
  let isClosed = false;

  const connect = () => {
    if (isClosed) return;
    try {
      eventSource = new EventSource(`/api/splits/${encodeURIComponent(groupId)}/stream`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.group) {
            onUpdate(data.group as Group);
          }
        } catch (err) {
          console.warn('Failed to parse SSE payload:', err);
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          eventSource.close();
          eventSource = null;
        }
        // Auto-reconnect after 3 seconds if not explicitly unsubscribed
        if (!isClosed) {
          setTimeout(connect, 3000);
        }
      };
    } catch (err) {
      console.warn('SSE connection error:', err);
    }
  };

  connect();

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

/**
 * Merge remote group state while preserving local user's identity status
 */
export function mergeRemoteGroupWithLocal(
  local: Group | null,
  remote: Group,
  claimedMemberId?: string | null
): Group {
  const currentClaimed =
    claimedMemberId ||
    local?.members.find((m) => m.isCurrentUser)?.id ||
    null;

  return {
    ...remote,
    members: remote.members.map((m) => ({
      ...m,
      isCurrentUser: currentClaimed ? m.id === currentClaimed : false,
    })),
  };
}
