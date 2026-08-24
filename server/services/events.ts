import type { Response } from 'express';
import type { Group } from '../../src/types';

/**
 * In-memory fan-out for the SSE stream. This is deliberately simple: the app runs as a
 * single process on one VM, so a Map is sufficient and Postgres LISTEN/NOTIFY would be
 * machinery without a purpose. If this ever runs on more than one instance, this file is
 * the one that has to change.
 */

interface Client {
  res: Response;
  /** From the X-Nooswise-Client header — identifies a browser, not a person. */
  clientId: string | null;
}

const clients = new Map<string, Set<Client>>();

const HEARTBEAT_MS = 20_000;

function write(res: Response, payload: unknown): boolean {
  try {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
    return true;
  } catch {
    return false;
  }
}

export function subscribe(
  groupId: string,
  res: Response,
  clientId: string | null,
  initial: { group: Group; revision: number } | null
): () => void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  // Harmless through Cloudflare, but keeps this correct behind any buffering proxy.
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const client: Client = { res, clientId };
  let set = clients.get(groupId);
  if (!set) {
    set = new Set();
    clients.set(groupId, set);
  }
  set.add(client);

  if (initial) {
    write(res, {
      type: 'INITIAL_STATE',
      group: initial.group,
      revision: initial.revision,
    });
  }

  const heartbeat = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      clearInterval(heartbeat);
    }
  }, HEARTBEAT_MS);

  return () => {
    clearInterval(heartbeat);
    const current = clients.get(groupId);
    if (!current) return;
    current.delete(client);
    if (current.size === 0) clients.delete(groupId);
  };
}

/**
 * Broadcasts a change to everyone watching this group except the browser that caused it.
 * Echoing a write back to its own author is how an in-flight local edit gets overwritten
 * by the server's confirmation of the *previous* one — the client already applied this
 * change optimistically and has the authoritative copy from the HTTP response.
 */
export function publish(
  groupId: string,
  group: Group,
  revision: number,
  originClientId: string | null
): void {
  const set = clients.get(groupId);
  if (!set || set.size === 0) return;

  const payload = { type: 'GROUP_UPDATED', group, revision };

  for (const client of [...set]) {
    if (originClientId && client.clientId === originClientId) continue;
    if (!write(client.res, payload)) set.delete(client);
  }
}

/** Tells every listener the split is gone, so open tabs stop polling a dead group. */
export function publishDeleted(groupId: string, originClientId: string | null): void {
  const set = clients.get(groupId);
  if (!set || set.size === 0) return;

  for (const client of [...set]) {
    if (originClientId && client.clientId === originClientId) continue;
    write(client.res, { type: 'GROUP_DELETED', groupId });
  }
}

export function subscriberCount(groupId?: string): number {
  if (groupId) return clients.get(groupId)?.size ?? 0;
  let total = 0;
  for (const set of clients.values()) total += set.size;
  return total;
}
