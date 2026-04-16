/**
 * Session persistence via IndexedDB so that browser crashes / accidental
 * tab closures do not lose validation progress. 100% local, DSG/GDPR
 * compliant — no data leaves the browser.
 *
 * Supports a single active session (key = 'current'). Date instances inside
 * the changeLog are preserved across save/load via JSON serialisation with
 * an ISO marker.
 */

import type { ImportWizardState } from '@/hooks/useImportWizard';

const DB_NAME = 'pupil-import-wizard';
const STORE_NAME = 'sessions';
const DB_VERSION = 1;
const CURRENT_KEY = 'current';

export interface SessionRecord {
  state: ImportWizardState;
  fileName: string | null;
  savedAt: Date;
}

export interface SessionMeta {
  fileName: string | null;
  rowCount: number;
  changeLogCount: number;
  savedAt: Date;
}

interface StoredSession {
  state: unknown; // serialised state (Dates → {__date: ISO})
  fileName: string | null;
  savedAt: string; // ISO
}

const DATE_MARKER = '__date';

function replacer(_key: string, value: unknown): unknown {
  if (value instanceof Date) {
    return { [DATE_MARKER]: value.toISOString() };
  }
  return value;
}

function reviver(_key: string, value: unknown): unknown {
  if (
    value &&
    typeof value === 'object' &&
    DATE_MARKER in (value as Record<string, unknown>) &&
    typeof (value as Record<string, unknown>)[DATE_MARKER] === 'string'
  ) {
    return new Date((value as Record<string, string>)[DATE_MARKER]);
  }
  return value;
}

function serialise<T>(data: T): unknown {
  return JSON.parse(JSON.stringify(data, replacer));
}

function deserialise<T>(data: unknown): T {
  return JSON.parse(JSON.stringify(data), reviver) as T;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
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
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        let result: T | undefined;
        const req = fn(store);
        if (req) {
          req.onsuccess = () => {
            result = req.result;
          };
          req.onerror = () => reject(req.error);
        }
        transaction.oncomplete = () => {
          db.close();
          resolve(result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
      }),
  );
}

export async function saveSession(state: ImportWizardState, fileName: string | null): Promise<void> {
  const stored: StoredSession = {
    state: serialise(state),
    fileName,
    savedAt: new Date().toISOString(),
  };
  await tx<IDBValidKey>('readwrite', (store) => store.put(stored, CURRENT_KEY));
}

export async function loadSession(): Promise<SessionRecord | null> {
  const raw = (await tx<StoredSession | undefined>('readonly', (store) => store.get(CURRENT_KEY))) as
    | StoredSession
    | undefined;
  if (!raw) return null;
  return {
    state: deserialise<ImportWizardState>(raw.state),
    fileName: raw.fileName ?? null,
    savedAt: new Date(raw.savedAt),
  };
}

export async function clearSession(): Promise<void> {
  await tx<undefined>('readwrite', (store) => store.delete(CURRENT_KEY));
}

export async function getSessionMeta(): Promise<SessionMeta | null> {
  const session = await loadSession();
  if (!session) return null;
  return {
    fileName: session.fileName,
    rowCount: session.state.correctedRows?.length ?? 0,
    changeLogCount: session.state.changeLog?.length ?? 0,
    savedAt: session.savedAt,
  };
}
