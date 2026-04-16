import { useEffect, useRef, useState } from 'react';
import type { ImportWizardState } from '@/hooks/useImportWizard';
import {
  saveSession,
  clearSession,
  getSessionMeta,
  type SessionMeta,
} from '@/lib/sessionStore';

/** Welche Wizard-Typen werden persistiert (Spezialwizards ausgenommen). */
const PERSISTABLE_TYPES = new Set(['schueler', 'journal', 'foerderplaner']);

/** State gilt als "wertvoll" sobald eine Datei geladen wurde. */
function isWorthPersisting(state: ImportWizardState): boolean {
  if (!state.importType || !PERSISTABLE_TYPES.has(state.importType)) return false;
  if (!state.parseResult || !state.parseResult.fileName) return false;
  return state.currentStep >= 1;
}

interface UseSessionPersistenceOptions {
  state: ImportWizardState;
  /** True, sobald die Restore-Entscheidung gefallen ist (verhindert Save vor Restore-Check) */
  isRestoreDecided: boolean;
  /** Debounce-Delay in ms */
  debounceMs?: number;
}

/**
 * Auto-Save des Wizard-States in IndexedDB (debounced).
 * Speichert nur, wenn isWorthPersisting() === true.
 */
export function useSessionAutoSave({
  state,
  isRestoreDecided,
  debounceMs = 1500,
}: UseSessionPersistenceOptions): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isRestoreDecided) return;
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!isWorthPersisting(state)) {
      // Nicht (mehr) persistierwürdig → vorhandene Session löschen
      clearSession();
      return;
    }

    timerRef.current = setTimeout(() => {
      saveSession(state);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, isRestoreDecided, debounceMs]);
}

/**
 * Lädt einmalig beim Mount die vorhandene Session-Meta für das Resume-Banner.
 * Liefert null, solange noch nicht geladen oder keine Session existiert.
 */
export function useSessionRestore(): {
  meta: SessionMeta | null;
  isChecked: boolean;
  dismiss: () => Promise<void>;
} {
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSessionMeta()
      .then((m) => {
        if (!cancelled) {
          setMeta(m);
          setIsChecked(true);
        }
      })
      .catch(() => {
        if (!cancelled) setIsChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = async () => {
    setMeta(null);
    await clearSession();
  };

  return { meta, isChecked, dismiss };
}
