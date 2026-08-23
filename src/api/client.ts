import type { Expense, Group, Member, SettlementRecord } from '../types';
import { getDeviceClientId, hydrateGroup } from '../utils/identity';

/**
 * The only place the app talks to the server.
 *
 * Every mutating call returns the full hydrated group, so callers never merge partial
 * responses — they replace their copy with what the server says. This replaces
 * utils/cloudSync.ts, where every action POSTed the entire group and the two sides
 * silently fought over whose version won.
 */

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the request never reached the server (offline, DNS, connection refused). */
  get isNetworkError(): boolean {
    return this.status === 0;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  /** A refusal the user can act on, e.g. removing someone still named in an expense. */
  get isConflict(): boolean {
    return this.status === 409;
  }
}

export interface GroupResponse {
  group: Group;
  revision: number;
}

// Omit rather than intersect: an intersection keeps RequestInit's own `body: BodyInit`,
// so callers could not pass a plain object to be serialised.
type JsonRequestInit = Omit<RequestInit, 'body'> & { body?: unknown };

async function request<T>(path: string, init?: JsonRequestInit): Promise<T> {
  const { body, ...rest } = init ?? {};

  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      ...rest,
      headers: {
        'Content-Type': 'application/json',
        'X-Nooswise-Client': getDeviceClientId(),
        ...(rest.headers ?? {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (err) {
    throw new ApiError(
      0,
      'network_error',
      "Couldn't reach the server. Check your connection.",
      err
    );
  }

  if (res.status === 204) return undefined as T;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      payload?.code ?? 'unknown_error',
      payload?.error ?? `Request failed (${res.status})`,
      payload?.details
    );
  }

  return payload as T;
}

/** Server responses always report isCurrentUser as false; this decides it per device. */
function hydrate(res: GroupResponse): GroupResponse {
  return { ...res, group: hydrateGroup(res.group) };
}

/* ------------------------------------------------------------------ *
 * Groups
 * ------------------------------------------------------------------ */

export interface NewMemberInput {
  name: string;
  email?: string;
  paymentHandle?: string;
  avatarUrl?: string;
  avatarBg?: string;
  avatarEmoji?: string;
  characterName?: string;
  initials?: string;
}

/** The first member is treated as the creator and comes back first. */
export async function createGroup(input: {
  name: string;
  currency?: string;
  members: NewMemberInput[];
}): Promise<GroupResponse> {
  return hydrate(await request<GroupResponse>('/groups', { method: 'POST', body: input }));
}

export async function fetchGroup(groupId: string): Promise<GroupResponse | null> {
  try {
    return hydrate(
      await request<GroupResponse>(`/groups/${encodeURIComponent(groupId)}`)
    );
  } catch (err) {
    if (err instanceof ApiError && err.isNotFound) return null;
    throw err;
  }
}

export async function patchGroup(
  groupId: string,
  patch: {
    name?: string;
    currency?: string;
    myETransferEmail?: string;
    isArchived?: boolean;
  }
): Promise<GroupResponse> {
  return hydrate(
    await request<GroupResponse>(`/groups/${encodeURIComponent(groupId)}`, {
      method: 'PATCH',
      body: patch,
    })
  );
}

export async function deleteGroup(groupId: string): Promise<void> {
  await request<void>(`/groups/${encodeURIComponent(groupId)}`, { method: 'DELETE' });
}

/* ------------------------------------------------------------------ *
 * Members
 * ------------------------------------------------------------------ */

export async function addMember(
  groupId: string,
  input: NewMemberInput
): Promise<GroupResponse> {
  return hydrate(
    await request<GroupResponse>(`/groups/${encodeURIComponent(groupId)}/members`, {
      method: 'POST',
      body: input,
    })
  );
}

export async function updateMember(
  groupId: string,
  memberId: string,
  patch: Partial<NewMemberInput>
): Promise<GroupResponse> {
  return hydrate(
    await request<GroupResponse>(
      `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}`,
      { method: 'PATCH', body: patch }
    )
  );
}

export async function removeMember(
  groupId: string,
  memberId: string
): Promise<GroupResponse> {
  return hydrate(
    await request<GroupResponse>(
      `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}`,
      { method: 'DELETE' }
    )
  );
}

/* ------------------------------------------------------------------ *
 * Expenses
 * ------------------------------------------------------------------ */

export type ExpenseInput = Omit<Expense, 'id'>;

export async function createExpense(
  groupId: string,
  expense: ExpenseInput
): Promise<GroupResponse> {
  return hydrate(
    await request<GroupResponse>(`/groups/${encodeURIComponent(groupId)}/expenses`, {
      method: 'POST',
      body: expense,
    })
  );
}

export async function updateExpense(
  groupId: string,
  expenseId: string,
  expense: ExpenseInput
): Promise<GroupResponse> {
  return hydrate(
    await request<GroupResponse>(
      `/groups/${encodeURIComponent(groupId)}/expenses/${encodeURIComponent(expenseId)}`,
      { method: 'PUT', body: expense }
    )
  );
}

export async function deleteExpense(
  groupId: string,
  expenseId: string
): Promise<GroupResponse> {
  return hydrate(
    await request<GroupResponse>(
      `/groups/${encodeURIComponent(groupId)}/expenses/${encodeURIComponent(expenseId)}`,
      { method: 'DELETE' }
    )
  );
}

/* ------------------------------------------------------------------ *
 * Settlements
 * ------------------------------------------------------------------ */

export type SettlementInput = Omit<SettlementRecord, 'id'>;

export async function createSettlement(
  groupId: string,
  settlement: SettlementInput
): Promise<GroupResponse> {
  return hydrate(
    await request<GroupResponse>(`/groups/${encodeURIComponent(groupId)}/settlements`, {
      method: 'POST',
      body: settlement,
    })
  );
}

export async function deleteSettlement(
  groupId: string,
  settlementId: string
): Promise<GroupResponse> {
  return hydrate(
    await request<GroupResponse>(
      `/groups/${encodeURIComponent(groupId)}/settlements/${encodeURIComponent(
        settlementId
      )}`,
      { method: 'DELETE' }
    )
  );
}

/* ------------------------------------------------------------------ *
 * Sync
 * ------------------------------------------------------------------ */

export async function pollGroup(
  groupId: string,
  sinceRevision: number
): Promise<{ updated: boolean; group?: Group; revision: number }> {
  const res = await request<{ updated: boolean; group?: Group; revision: number }>(
    `/groups/${encodeURIComponent(groupId)}/poll?since=${sinceRevision}`
  );
  return res.group ? { ...res, group: hydrateGroup(res.group) } : res;
}

export type StreamEvent =
  | { type: 'INITIAL_STATE'; group: Group; revision: number }
  | { type: 'GROUP_UPDATED'; group: Group; revision: number }
  | { type: 'GROUP_DELETED'; groupId: string };

/**
 * Subscribes to live changes. The server skips events caused by this same browser, so
 * anything arriving here came from someone else.
 */
export function subscribeToGroup(
  groupId: string,
  onEvent: (event: StreamEvent) => void
): () => void {
  if (typeof window === 'undefined' || !groupId || typeof EventSource === 'undefined') {
    return () => {};
  }

  let source: EventSource | null = null;
  let closed = false;
  let retryDelay = 1000;

  const connect = () => {
    if (closed) return;
    try {
      source = new EventSource(
        `/api/groups/${encodeURIComponent(groupId)}/stream?c=${encodeURIComponent(
          getDeviceClientId()
        )}`
      );

      source.onopen = () => {
        retryDelay = 1000;
      };

      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as StreamEvent;
          if (data && 'type' in data) {
            onEvent(
              'group' in data ? { ...data, group: hydrateGroup(data.group) } : data
            );
          }
        } catch {
          /* a malformed frame should not kill the stream */
        }
      };

      source.onerror = () => {
        source?.close();
        source = null;
        if (closed) return;
        // Backing off avoids hammering the server when it is down or restarting.
        setTimeout(connect, retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      };
    } catch {
      /* EventSource unavailable */
    }
  };

  connect();

  return () => {
    closed = true;
    source?.close();
    source = null;
  };
}

export async function importLegacyGroups(
  groups: Group[]
): Promise<{ imported: string[]; skipped: string[] }> {
  return request('/groups/import', {
    method: 'POST',
    body: {
      groups: groups.map(({ members, ...g }) => ({
        ...g,
        // isCurrentUser is device-local and the server would reject or strip it.
        members: members.map(({ isCurrentUser, ...m }) => m),
      })),
    },
  });
}
