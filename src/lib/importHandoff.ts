/**
 * Lokaler Zwischenspeicher ("Handoff") zwischen den Importen.
 *
 * Speichert nach einem Stammdaten-Import nur die minimal nötigen Angaben,
 * damit die LP-Klassenzuweisung sie ohne erneuten Upload verwenden kann.
 * 100% lokal im Browser (IndexedDB), keine Datenübertragung.
 */
import type { PupilPerson, PupilClass } from '@/types/importTypes';

const DB_NAME = 'pupil-import-handoff';
const STORE_NAME = 'handoff';
const DB_VERSION = 1;

const TEACHERS_KEY = 'teachers';
const CLASSES_KEY = 'classes';

export interface TeacherHandoff {
  persons: PupilPerson[];
  source: string;
  savedAt: Date;
}

export interface ClassHandoff {
  classes: PupilClass[];
  source: string;
  savedAt: Date;
}

interface StoredTeachers { persons: PupilPerson[]; source: string; savedAt: string }
interface StoredClasses { classes: PupilClass[]; source: string; savedAt: string }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB nicht verfügbar'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'));
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return openDb().then(
    db =>
      new Promise<T | undefined>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);
        let result: T | undefined;
        const req = fn(store);
        if (req) {
          req.onsuccess = () => { result = req.result; };
          req.onerror = () => reject(req.error);
        }
        transaction.oncomplete = () => { db.close(); resolve(result); };
        transaction.onerror = () => { db.close(); reject(transaction.error); };
      }),
  );
}

export async function saveTeacherHandoff(persons: PupilPerson[], source: string): Promise<void> {
  if (persons.length === 0) return;
  const stored: StoredTeachers = { persons, source, savedAt: new Date().toISOString() };
  try {
    await tx<IDBValidKey>('readwrite', store => store.put(stored, TEACHERS_KEY));
  } catch {
    /* Zwischenspeicher ist optional */
  }
}

export async function saveClassHandoff(classes: PupilClass[], source: string): Promise<void> {
  if (classes.length === 0) return;
  const stored: StoredClasses = { classes, source, savedAt: new Date().toISOString() };
  try {
    await tx<IDBValidKey>('readwrite', store => store.put(stored, CLASSES_KEY));
  } catch {
    /* Zwischenspeicher ist optional */
  }
}

export async function getTeacherHandoff(): Promise<TeacherHandoff | null> {
  try {
    const raw = (await tx<StoredTeachers | undefined>('readonly', store => store.get(TEACHERS_KEY))) as
      | StoredTeachers
      | undefined;
    if (!raw?.persons?.length) return null;
    return { persons: raw.persons, source: raw.source, savedAt: new Date(raw.savedAt) };
  } catch {
    return null;
  }
}

export async function getClassHandoff(): Promise<ClassHandoff | null> {
  try {
    const raw = (await tx<StoredClasses | undefined>('readonly', store => store.get(CLASSES_KEY))) as
      | StoredClasses
      | undefined;
    if (!raw?.classes?.length) return null;
    return { classes: raw.classes, source: raw.source, savedAt: new Date(raw.savedAt) };
  } catch {
    return null;
  }
}

export async function clearTeacherHandoff(): Promise<void> {
  try { await tx<undefined>('readwrite', store => store.delete(TEACHERS_KEY)); } catch { /* ignore */ }
}

export async function clearClassHandoff(): Promise<void> {
  try { await tx<undefined>('readwrite', store => store.delete(CLASSES_KEY)); } catch { /* ignore */ }
}
