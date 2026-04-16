/**
 * Local queue for "manual send" telemetry mode.
 *
 * Events are anonymised BEFORE entering this queue (see analytics.ts).
 * The queue lives in localStorage so it survives reloads & tab close.
 *
 * Cap: max 200 events / ~100 KB. Oldest evicted on overflow.
 */

import { supabase } from '@/integrations/supabase/client';

const QUEUE_KEY = 'analytics-pending-queue';
const MAX_EVENTS = 200;
const MAX_BYTES = 100 * 1024;
const CHANGE_EVENT = 'analytics-queue-changed';

export interface PendingEvent {
  id: string; // local-only uuid, NOT sent
  queued_at: string; // local timestamp, NOT sent
  row: {
    event_type: string;
    import_type: string | null;
    step_number: number | null;
    payload: Record<string, unknown>;
    app_version: string | null;
    session_id: string;
  };
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function emitChange(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function getPendingEvents(): PendingEvent[] {
  const ls = safeLocalStorage();
  if (!ls) return [];
  try {
    const raw = ls.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingEvent[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(events: PendingEvent[]): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  try {
    let trimmed = events.slice(-MAX_EVENTS);
    let serialized = JSON.stringify(trimmed);
    while (serialized.length > MAX_BYTES && trimmed.length > 1) {
      trimmed = trimmed.slice(Math.ceil(trimmed.length * 0.1));
      serialized = JSON.stringify(trimmed);
    }
    ls.setItem(QUEUE_KEY, serialized);
  } catch {
    /* swallow */
  }
}

export function enqueuePendingEvent(row: PendingEvent['row']): void {
  const events = getPendingEvents();
  events.push({
    id: crypto.randomUUID(),
    queued_at: new Date().toISOString(),
    row,
  });
  saveQueue(events);
  emitChange();
}

export function clearPendingEvents(): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  ls.removeItem(QUEUE_KEY);
  emitChange();
}

export function removePendingEvent(id: string): void {
  const filtered = getPendingEvents().filter(e => e.id !== id);
  saveQueue(filtered);
  emitChange();
}

export function pendingCount(): number {
  return getPendingEvents().length;
}

/**
 * Send all pending events as a batch to Supabase. Clears queue on success.
 * Returns the number of events sent (or 0 on failure / empty queue).
 */
export async function flushPendingToSupabase(): Promise<number> {
  const events = getPendingEvents();
  if (events.length === 0) return 0;
  const rows = events.map(e => e.row);
  const { error } = await supabase.from('usage_events').insert(rows as never);
  if (error) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[analytics] manual flush failed:', error.message);
    }
    throw error;
  }
  clearPendingEvents();
  return events.length;
}

export function subscribeToQueueChanges(handler: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener(CHANGE_EVENT, handler);
  // Cross-tab sync: localStorage event fires in OTHER tabs only.
  const onStorage = (e: StorageEvent) => {
    if (e.key === QUEUE_KEY) handler();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler);
    window.removeEventListener('storage', onStorage);
  };
}
