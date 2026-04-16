/**
 * Anonymous usage telemetry.
 *
 * Sends fire-and-forget events to Lovable Cloud (`usage_events` table).
 * Strict rules:
 *  - NEVER include personal data (names, AHV, IDs, file names, cell values).
 *  - Only counters, bucket sizes, event types and step numbers.
 *  - Users can opt out via localStorage (`analytics-opt-out` = `'1'`).
 *  - Session ID is a per-tab UUID (sessionStorage), not persistent across tabs.
 */

import { supabase } from '@/integrations/supabase/client';

const SESSION_KEY = 'analytics-session-id';
const OPT_OUT_KEY = 'analytics-opt-out';
const APP_VERSION =
  (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev';

export type UsageEventType =
  | 'app_loaded'
  | 'import_started'
  | 'step_reached'
  | 'validation_completed'
  | 'export_completed'
  | 'import_reset'
  | 'unmapped_value'
  | 'unfixed_pattern'
  | 'manual_correction';

export interface UsageEventPayload {
  event_type: UsageEventType;
  import_type?: string | null;
  step_number?: number | null;
  payload?: Record<string, unknown>;
}

function safeSessionStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

function safeLocalStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function isOptedOut(): boolean {
  return safeLocalStorage()?.getItem(OPT_OUT_KEY) === '1';
}

export function setOptOut(value: boolean): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  if (value) ls.setItem(OPT_OUT_KEY, '1');
  else ls.removeItem(OPT_OUT_KEY);
}

function getSessionId(): string {
  const ss = safeSessionStorage();
  if (!ss) return crypto.randomUUID();
  let id = ss.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    ss.setItem(SESSION_KEY, id);
  }
  return id;
}

/**
 * Bucket the row count to avoid leaking exact dataset sizes.
 */
export function rowCountBucket(n: number): string {
  if (n < 100) return '<100';
  if (n < 500) return '100-500';
  if (n < 1000) return '500-1000';
  if (n < 3000) return '1000-3000';
  return '>3000';
}

/**
 * Fire-and-forget telemetry. Never throws, never blocks the UI.
 */
export function trackEvent(event: UsageEventPayload): void {
  if (isOptedOut()) return;

  try {
    const row = {
      event_type: event.event_type,
      import_type: event.import_type ?? null,
      step_number: event.step_number ?? null,
      payload: (event.payload ?? {}) as never,
      app_version: APP_VERSION,
      session_id: getSessionId(),
    };

    // Fire and forget – ignore errors silently.
    void supabase
      .from('usage_events')
      .insert([row])
      .then(({ error }) => {
        if (error && import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[analytics] insert failed:', error.message);
        }
      });
  } catch {
    // Swallow all errors – telemetry must never break the app.
  }
}
