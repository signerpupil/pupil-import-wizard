/**
 * Anonymous usage telemetry.
 *
 * Three modes (localStorage `analytics-mode`):
 *  - 'auto'   → fire-and-forget direct insert (default).
 *  - 'manual' → buffered into local queue, sent only on user action.
 *  - 'off'    → completely disabled.
 *
 * Strict rules:
 *  - NEVER include personal data (names, AHV, IDs, file names, cell values).
 *  - Only counters, bucket sizes, event types and step numbers.
 *  - Session ID is a per-tab UUID (sessionStorage), not persistent across tabs.
 */

import { supabase } from '@/integrations/supabase/client';
import { enqueuePendingEvent, clearPendingEvents } from './pendingTelemetry';

const SESSION_KEY = 'analytics-session-id';
const MODE_KEY = 'analytics-mode';
const LEGACY_OPT_OUT_KEY = 'analytics-opt-out';
const APP_VERSION =
  (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev';

export type AnalyticsMode = 'auto' | 'manual' | 'off';

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

export function getAnalyticsMode(): AnalyticsMode {
  const ls = safeLocalStorage();
  if (!ls) return 'auto';
  const v = ls.getItem(MODE_KEY);
  if (v === 'auto' || v === 'manual' || v === 'off') return v;
  // Backward-compat: migrate legacy opt-out flag.
  if (ls.getItem(LEGACY_OPT_OUT_KEY) === '1') {
    ls.setItem(MODE_KEY, 'off');
    return 'off';
  }
  return 'auto';
}

export function setAnalyticsMode(mode: AnalyticsMode): void {
  const ls = safeLocalStorage();
  if (!ls) return;
  ls.setItem(MODE_KEY, mode);
  ls.removeItem(LEGACY_OPT_OUT_KEY);
  if (mode === 'off') {
    clearPendingEvents();
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('analytics-mode-changed'));
  }
}

/** @deprecated Use getAnalyticsMode() === 'off' */
export function isOptedOut(): boolean {
  return getAnalyticsMode() === 'off';
}

/** @deprecated Use setAnalyticsMode('off' | 'auto') */
export function setOptOut(value: boolean): void {
  setAnalyticsMode(value ? 'off' : 'auto');
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

export function rowCountBucket(n: number): string {
  if (n < 100) return '<100';
  if (n < 500) return '100-500';
  if (n < 1000) return '500-1000';
  if (n < 3000) return '1000-3000';
  return '>3000';
}

/**
 * Fire-and-forget telemetry. Never throws, never blocks the UI.
 * Routes through queue or direct insert depending on mode.
 */
export function trackEvent(event: UsageEventPayload): void {
  const mode = getAnalyticsMode();
  if (mode === 'off') return;

  try {
    const row = {
      event_type: event.event_type,
      import_type: event.import_type ?? null,
      step_number: event.step_number ?? null,
      payload: (event.payload ?? {}) as Record<string, unknown>,
      app_version: APP_VERSION,
      session_id: getSessionId(),
    };

    if (mode === 'manual') {
      enqueuePendingEvent(row);
      return;
    }

    // auto mode → fire and forget
    void supabase
      .from('usage_events')
      .insert([row as never])
      .then(({ error }) => {
        if (error && import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug('[analytics] insert failed:', error.message);
        }
      });
  } catch {
    /* telemetry must never break the app */
  }
}
