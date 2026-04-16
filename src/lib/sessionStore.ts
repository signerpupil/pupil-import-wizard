/**
 * IndexedDB-basierter Wizard-Session-Store.
 *
 * Ziel: Browser-Crash, Tab-Reload oder versehentlicher Refresh bei laufendem
 * Stammdaten-Import dürfen die manuelle Arbeit (Korrekturen, geladene Datei)
 * nicht zerstören.
 *
 * Daten bleiben 100% lokal (DSG/GDPR-konform) — keine Server-Übertragung.
 * Persistiert wird ausschliesslich der Standard-Wizard (importType ∈ schueler/
 * journal/foerderplaner). Spezialwizards (gruppen, lp-zuweisung, lehrpersonen)
 * haben eigenen Lifecycle und werden NICHT persistiert.
 *
 * Speicher-Schlüssel: einziger Eintrag mit ID 'current' im Object-Store
 * 'wizard-session'. Beim Reset oder Export-Abschluss wird er gelöscht.
 */

import type { ImportWizardState } from '@/hooks/useImportWizard';

const DB_NAME = 'pupil-import-wizard';
const DB_VERSION = 1;
const STORE_NAME = 'wizard-session';
const SESSION_KEY = 'current';

/** Was wir wirklich persistieren — Date-Objekte werden serialisiert */
export interface PersistedSession {
  state: ImportWizardState;
  savedAt: number; // epoch ms
  /** Schema-Version für künftige Migrationen */
  version: 1;
}

/** Meta-Information ohne den vollen State (für Banner) */
export interface SessionMeta {
  savedAt: number;
  importType: string | null;
  fileName: string | null;
  rowCount: number;
  currentStep: number;
  changeLogCount: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB nicht verfügbar'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB öffnen fehlgeschlagen'));
  });
  return dbPromise;
}

function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const req = fn(store);
        tx.oncomplete = () => resolve((req as IDBRequest<T> | undefined)?.result);
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB Transaktion fehlgeschlagen'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB Transaktion abgebrochen'));
      })
  );
}

/** Date-Objekte im changeLog → ISO-Strings für IndexedDB-Serialisierung */
function serializeState(state: ImportWizardState): ImportWizardState {
  return {
    ...state,
    changeLog: state.changeLog.map((e) => ({
      ...e,
      timestamp: e.timestamp instanceof Date ? (e.timestamp.toISOString() as unknown as Date) : e.timestamp,
    })),
  };
}

/** ISO-Strings → Date zurückwandeln */
function deserializeState(state: ImportWizardState): ImportWizardState {
  return {
    ...state,
    changeLog: state.changeLog.map((e) => ({
      ...e,
      timestamp: typeof e.timestamp === 'string' ? new Date(e.timestamp) : e.timestamp,
    })),
    // Laufende Validierung darf nach Restore nicht hängenbleiben
    isValidating: false,
  };
}

/**
 * Persistiert den aktuellen Wizard-State.
 * Stille Fehler (z.B. Quota überschritten) werden nicht geworfen — nur geloggt.
 */
export async function saveSession(state: ImportWizardState): Promise<boolean> {
  try {
    const payload: PersistedSession = {
      state: serializeState(state),
      savedAt: Date.now(),
      version: 1,
    };
    await withStore('readwrite', (store) => store.put(payload, SESSION_KEY));
    return true;
  } catch (err) {
    console.warn('[sessionStore] save fehlgeschlagen:', err);
    return false;
  }
}

/** Lädt eine zuvor gespeicherte Session, oder null wenn nicht vorhanden. */
export async function loadSession(): Promise<PersistedSession | null> {
  try {
    const result = (await withStore<PersistedSession>('readonly', (store) =>
      store.get(SESSION_KEY)
    )) as PersistedSession | undefined;
    if (!result) return null;
    return {
      ...result,
      state: deserializeState(result.state),
    };
  } catch (err) {
    console.warn('[sessionStore] load fehlgeschlagen:', err);
    return null;
  }
}

/** Lädt nur Metadaten (für Banner, ohne grossen State zu deserialisieren). */
export async function getSessionMeta(): Promise<SessionMeta | null> {
  const session = await loadSession();
  if (!session) return null;
  return {
    savedAt: session.savedAt,
    importType: session.state.importType,
    fileName: session.state.parseResult?.fileName ?? null,
    rowCount: session.state.parseResult?.rows.length ?? 0,
    currentStep: session.state.currentStep,
    changeLogCount: session.state.changeLog.length,
  };
}

/** Löscht die persistierte Session vollständig. */
export async function clearSession(): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(SESSION_KEY));
  } catch (err) {
    console.warn('[sessionStore] clear fehlgeschlagen:', err);
  }
}
