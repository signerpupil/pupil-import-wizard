import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { saveSession, loadSession, clearSession, getSessionMeta } from '@/lib/sessionStore';
import type { ImportWizardState } from '@/hooks/useImportWizard';
import type { ChangeLogEntry } from '@/types/importTypes';

function makeState(overrides: Partial<ImportWizardState> = {}): ImportWizardState {
  return {
    currentStep: 2,
    maxVisitedStep: 2,
    importType: 'schueler',
    subType: null,
    parseResult: null,
    columnStatuses: [],
    removeExtraColumns: false,
    errors: [],
    correctedRows: [],
    changeLog: [],
    isValidating: false,
    processingMode: 'initial',
    correctionSource: 'localStorage',
    loadedCorrectionRules: [],
    pendingCorrectionRules: [],
    autoCorrectionsApplied: false,
    ...overrides,
  };
}

// Reset IndexedDB between tests to avoid cross-pollination.
beforeEach(async () => {
  await new Promise<void>((resolve) => {
    const req = indexedDB.deleteDatabase('pupil-import-wizard');
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
    req.onblocked = () => resolve();
  });
});

describe('sessionStore', () => {
  it('returns null when no session exists', async () => {
    const result = await loadSession();
    expect(result).toBeNull();
  });

  it('returns null meta when no session exists', async () => {
    const meta = await getSessionMeta();
    expect(meta).toBeNull();
  });

  it('saves and loads a session roundtrip', async () => {
    const state = makeState({
      currentStep: 3,
      correctedRows: [{ S_Name: 'Müller', S_Vorname: 'Anna' }],
    });
    await saveSession(state, 'stammdaten.xlsx');

    const loaded = await loadSession();
    expect(loaded).not.toBeNull();
    expect(loaded?.fileName).toBe('stammdaten.xlsx');
    expect(loaded?.state.currentStep).toBe(3);
    expect(loaded?.state.correctedRows).toEqual([{ S_Name: 'Müller', S_Vorname: 'Anna' }]);
    expect(loaded?.savedAt).toBeInstanceOf(Date);
  });

  it('preserves Date objects inside changeLog across save/load', async () => {
    const ts = new Date('2024-06-15T10:30:00.000Z');
    const entry: ChangeLogEntry = {
      timestamp: ts,
      row: 5,
      column: 'S_AHV',
      originalValue: '7561234567890',
      newValue: '756.1234.5678.90',
      type: 'auto',
    } as ChangeLogEntry;

    const state = makeState({ changeLog: [entry] });
    await saveSession(state, 'test.csv');

    const loaded = await loadSession();
    expect(loaded?.state.changeLog).toHaveLength(1);
    const restored = loaded!.state.changeLog[0];
    expect(restored.timestamp).toBeInstanceOf(Date);
    expect((restored.timestamp as Date).toISOString()).toBe(ts.toISOString());
    expect(restored.column).toBe('S_AHV');
    expect(restored.newValue).toBe('756.1234.5678.90');
  });

  it('clearSession removes the persisted session', async () => {
    await saveSession(makeState(), 'foo.csv');
    expect(await loadSession()).not.toBeNull();

    await clearSession();
    expect(await loadSession()).toBeNull();
  });

  it('overwrites an existing session on subsequent save', async () => {
    await saveSession(makeState({ currentStep: 1 }), 'first.csv');
    await saveSession(makeState({ currentStep: 4 }), 'second.csv');

    const loaded = await loadSession();
    expect(loaded?.fileName).toBe('second.csv');
    expect(loaded?.state.currentStep).toBe(4);
  });

  it('getSessionMeta returns correct metadata', async () => {
    const state = makeState({
      correctedRows: [
        { S_Name: 'A' },
        { S_Name: 'B' },
        { S_Name: 'C' },
      ],
      changeLog: [
        { timestamp: new Date(), row: 2, column: 'X', originalValue: '', oldValue: "", newValue: '', type: 'manual' } as ChangeLogEntry,
        { timestamp: new Date(), row: 3, column: 'Y', originalValue: '', oldValue: "", newValue: '', type: 'auto' } as ChangeLogEntry,
      ],
    });
    await saveSession(state, 'meta-test.xlsx');

    const meta = await getSessionMeta();
    expect(meta).not.toBeNull();
    expect(meta?.fileName).toBe('meta-test.xlsx');
    expect(meta?.rowCount).toBe(3);
    expect(meta?.changeLogCount).toBe(2);
    expect(meta?.savedAt).toBeInstanceOf(Date);
  });

  it('handles null fileName', async () => {
    await saveSession(makeState(), null);
    const loaded = await loadSession();
    expect(loaded?.fileName).toBeNull();

    const meta = await getSessionMeta();
    expect(meta?.fileName).toBeNull();
  });

  it('preserves nested Date objects in arrays', async () => {
    const dates = [
      new Date('2024-01-01T00:00:00.000Z'),
      new Date('2024-02-01T00:00:00.000Z'),
      new Date('2024-03-01T00:00:00.000Z'),
    ];
    const state = makeState({
      changeLog: dates.map((d, i) => ({
        timestamp: d,
        row: i + 2,
        column: 'C',
        originalValue: '',
        newValue: String(i),
        type: 'manual',
      })) as ChangeLogEntry[],
    });
    await saveSession(state, 'dates.csv');

    const loaded = await loadSession();
    loaded?.state.changeLog.forEach((entry, i) => {
      expect(entry.timestamp).toBeInstanceOf(Date);
      expect((entry.timestamp as Date).toISOString()).toBe(dates[i].toISOString());
    });
  });
});
