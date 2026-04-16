/**
 * Tests für useCorrectionMemory — die zentrale Korrektur-Gedächtnis-Logik.
 *
 * Schwerpunkt:
 *  - localStorage Persistenz (save/load/clear/count)
 *  - File Import/Export (Roundtrip, Validierung des Formats)
 *  - createRuleFromCorrection (exact vs. identifier matching)
 *  - addRule (Deduplizierung gleicher column+originalValue)
 *  - removeRule
 *  - applyRulesToData — Kern-Algorithmus für die Anwendung gespeicherter
 *    Regeln auf neue Daten (exact vs. identifier match, Statistiken).
 *
 * Zusätzlich: Fake-File-Helper für loadFromFile (jsdom unterstützt File aber
 * nicht zuverlässig File.text() — wir polyfillen es).
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCorrectionMemory } from '@/hooks/useCorrectionMemory';
import type { CorrectionRule } from '@/types/correctionTypes';
import type { ParsedRow, ValidationError } from '@/types/importTypes';

// jsdom liefert globales localStorage; wir leeren es vor jedem Test.
beforeEach(() => {
  localStorage.clear();
});

// jsdom < 22 hat kein File.prototype.text() — wir polyfillen es einmalig.
if (typeof File !== 'undefined' && typeof (File.prototype as { text?: unknown }).text !== 'function') {
  (File.prototype as unknown as { text: () => Promise<string> }).text = function (
    this: Blob
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}

/** Erzeugt eine Regel mit sinnvollen Defaults. */
function makeRule(overrides: Partial<CorrectionRule> = {}): CorrectionRule {
  return {
    id: 'test-id-1',
    column: 'S_Geschlecht',
    originalValue: 'X',
    correctedValue: 'M',
    matchType: 'exact',
    importType: 'schueler',
    createdAt: new Date('2024-01-01').toISOString(),
    appliedCount: 0,
    ...overrides,
  };
}

// =============================================================================
// 1. localStorage Persistenz
// =============================================================================
describe('useCorrectionMemory: localStorage', () => {
  it('saveToLocalStorage und loadFromLocalStorage roundtrip', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const rule = makeRule();

    act(() => {
      result.current.saveToLocalStorage([rule]);
    });

    // Zweite Hook-Instanz simuliert Reload
    const { result: result2 } = renderHook(() => useCorrectionMemory('schueler'));
    let loaded: CorrectionRule[] = [];
    act(() => {
      loaded = result2.current.loadFromLocalStorage();
    });

    expect(loaded).toHaveLength(1);
    expect(loaded[0].originalValue).toBe('X');
    expect(loaded[0].correctedValue).toBe('M');
  });

  it('separate Storage-Keys pro importType (kein Übergreifen)', () => {
    const { result: schueler } = renderHook(() => useCorrectionMemory('schueler'));
    const { result: journal } = renderHook(() => useCorrectionMemory('journal'));

    act(() => {
      schueler.current.saveToLocalStorage([makeRule({ originalValue: 'A' })]);
      journal.current.saveToLocalStorage([makeRule({ originalValue: 'B', importType: 'journal' })]);
    });

    expect(schueler.current.getLocalStorageCount()).toBe(1);
    expect(journal.current.getLocalStorageCount()).toBe(1);

    let schuelerLoaded: CorrectionRule[] = [];
    act(() => {
      schuelerLoaded = schueler.current.loadFromLocalStorage();
    });
    expect(schuelerLoaded[0].originalValue).toBe('A');
  });

  it('clearLocalStorage entfernt alle Regeln', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));

    act(() => {
      result.current.saveToLocalStorage([makeRule(), makeRule({ id: '2', originalValue: 'Y' })]);
    });
    expect(result.current.getLocalStorageCount()).toBe(2);

    act(() => {
      result.current.clearLocalStorage();
    });
    expect(result.current.getLocalStorageCount()).toBe(0);
    expect(result.current.hasLocalStorageRules()).toBe(false);
  });

  it('hasLocalStorageRules reflektiert Vorhandensein', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    expect(result.current.hasLocalStorageRules()).toBe(false);

    act(() => {
      result.current.saveToLocalStorage([makeRule()]);
    });
    expect(result.current.hasLocalStorageRules()).toBe(true);
  });

  it('getLocalStorageCount liefert 0 bei leerem/korruptem Storage', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    expect(result.current.getLocalStorageCount()).toBe(0);

    // Korruptes JSON
    localStorage.setItem('pupil-wizard-corrections-schueler', 'not-json{');
    expect(result.current.getLocalStorageCount()).toBe(0);
  });
});

// =============================================================================
// 2. createRuleFromCorrection
// =============================================================================
describe('useCorrectionMemory: createRuleFromCorrection', () => {
  it('erzeugt exact-match-Regel ohne Identifier', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const rule = result.current.createRuleFromCorrection('S_Geschlecht', 'X', 'M');

    expect(rule.matchType).toBe('exact');
    expect(rule.column).toBe('S_Geschlecht');
    expect(rule.originalValue).toBe('X');
    expect(rule.correctedValue).toBe('M');
    expect(rule.importType).toBe('schueler');
    expect(rule.identifierColumn).toBeUndefined();
    expect(rule.identifierValue).toBeUndefined();
    expect(rule.id).toBeTruthy();
  });

  it('erzeugt identifier-match-Regel mit Identifier-Spalte und -Wert', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const rule = result.current.createRuleFromCorrection(
      'S_Ort',
      'Zueri',
      'Zürich',
      'S_ID',
      '12345'
    );

    expect(rule.matchType).toBe('identifier');
    expect(rule.identifierColumn).toBe('S_ID');
    expect(rule.identifierValue).toBe('12345');
  });

  it('erzeugt unterschiedliche IDs bei zwei aufeinanderfolgenden Aufrufen', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const a = result.current.createRuleFromCorrection('c', 'a', 'b');
    const b = result.current.createRuleFromCorrection('c', 'a', 'b');
    expect(a.id).not.toBe(b.id);
  });
});

// =============================================================================
// 3. addRule / removeRule (Deduplizierung)
// =============================================================================
describe('useCorrectionMemory: addRule / removeRule', () => {
  it('addRule fügt neue Regel hinzu', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    act(() => {
      result.current.addRule(makeRule());
    });
    expect(result.current.rules).toHaveLength(1);
  });

  it('addRule überschreibt bei gleicher column+originalValue (Deduplizierung)', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const first = makeRule({ id: 'a', correctedValue: 'M' });
    const second = makeRule({ id: 'b', correctedValue: 'W' }); // gleiche column+originalValue

    act(() => {
      result.current.addRule(first);
      result.current.addRule(second);
    });

    expect(result.current.rules).toHaveLength(1);
    expect(result.current.rules[0].correctedValue).toBe('W');
    // Behält ursprüngliche ID (laut Implementierung)
    expect(result.current.rules[0].id).toBe('a');
  });

  it('addRule unterscheidet Regeln auf unterschiedlichen Spalten', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    act(() => {
      result.current.addRule(makeRule({ id: 'a', column: 'S_Geschlecht' }));
      result.current.addRule(makeRule({ id: 'b', column: 'S_Ort', originalValue: 'X' }));
    });
    expect(result.current.rules).toHaveLength(2);
  });

  it('removeRule entfernt nur die gematchte ID', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    act(() => {
      result.current.addRule(makeRule({ id: 'a' }));
      result.current.addRule(makeRule({ id: 'b', column: 'S_Ort', originalValue: 'X' }));
    });

    act(() => {
      result.current.removeRule('a');
    });

    expect(result.current.rules).toHaveLength(1);
    expect(result.current.rules[0].id).toBe('b');
  });
});

// =============================================================================
// 4. applyRulesToData — Kern-Algorithmus
// =============================================================================
describe('useCorrectionMemory: applyRulesToData', () => {
  it('exact match: korrigiert alle Zeilen mit passendem Wert', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const rules: CorrectionRule[] = [
      makeRule({ column: 'S_Geschlecht', originalValue: 'X', correctedValue: 'M' }),
    ];
    const rows: ParsedRow[] = [
      { S_ID: '1', S_Geschlecht: 'X' },
      { S_ID: '2', S_Geschlecht: 'X' },
      { S_ID: '3', S_Geschlecht: 'W' }, // soll nicht korrigiert werden
    ];

    const { corrections, stats } = result.current.applyRulesToData(rules, rows, []);

    expect(corrections).toHaveLength(2);
    expect(corrections.every(c => c.correctedValue === 'M')).toBe(true);
    expect(corrections.map(c => c.row).sort()).toEqual([2, 3]); // +2 offset
    expect(stats.totalApplied).toBe(2);
    expect(stats.byColumn['S_Geschlecht']).toBe(2);
    expect(stats.rulesUsed).toEqual([rules[0].id]);
  });

  it('identifier match: korrigiert nur Zeilen mit passendem Identifier', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const rules: CorrectionRule[] = [
      makeRule({
        column: 'S_Ort',
        originalValue: 'Zueri',
        correctedValue: 'Zürich',
        matchType: 'identifier',
        identifierColumn: 'S_ID',
        identifierValue: '100',
      }),
    ];
    const rows: ParsedRow[] = [
      { S_ID: '100', S_Ort: 'Zueri' }, // match
      { S_ID: '200', S_Ort: 'Zueri' }, // anderer Identifier → kein match
    ];

    const { corrections } = result.current.applyRulesToData(rules, rows, []);
    expect(corrections).toHaveLength(1);
    expect(corrections[0].row).toBe(2);
  });

  it('keine Anwendung wenn cellValue nicht originalValue entspricht', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const rules: CorrectionRule[] = [
      makeRule({ originalValue: 'X', correctedValue: 'M' }),
    ];
    const rows: ParsedRow[] = [{ S_Geschlecht: 'Y' }];

    const { corrections, stats } = result.current.applyRulesToData(rules, rows, []);
    expect(corrections).toHaveLength(0);
    expect(stats.totalApplied).toBe(0);
  });

  it('mehrere Regeln zählen separat in stats.byColumn', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const rules: CorrectionRule[] = [
      makeRule({ id: 'r1', column: 'S_Geschlecht', originalValue: 'X', correctedValue: 'M' }),
      makeRule({ id: 'r2', column: 'S_Ort', originalValue: 'Zueri', correctedValue: 'Zürich' }),
    ];
    const rows: ParsedRow[] = [
      { S_Geschlecht: 'X', S_Ort: 'Zueri' },
      { S_Geschlecht: 'X', S_Ort: 'Bern' },
    ];

    const { corrections, stats } = result.current.applyRulesToData(rules, rows, []);
    expect(corrections).toHaveLength(3); // 2x Geschlecht + 1x Ort
    expect(stats.byColumn['S_Geschlecht']).toBe(2);
    expect(stats.byColumn['S_Ort']).toBe(1);
    expect(stats.rulesUsed.sort()).toEqual(['r1', 'r2']);
  });

  it('toleriert numerische Werte (über String()-Konvertierung)', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const rules: CorrectionRule[] = [
      makeRule({ column: 'S_PLZ', originalValue: '8000', correctedValue: '8001' }),
    ];
    const rows: ParsedRow[] = [{ S_PLZ: 8000 as unknown as string }];

    const { corrections } = result.current.applyRulesToData(rules, rows, []);
    expect(corrections).toHaveLength(1);
    expect(corrections[0].correctedValue).toBe('8001');
  });

  it('ignoriert undefined/null Zellen ohne Crash', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const rules: CorrectionRule[] = [
      makeRule({ column: 'S_Ort', originalValue: '', correctedValue: 'Zürich' }),
    ];
    const rows: ParsedRow[] = [
      { S_Ort: undefined as unknown as string },
      { S_Ort: null as unknown as string },
      { S_ID: '1' }, // S_Ort fehlt
    ];

    // originalValue = '' → fehlende/null/undefined Felder werden zu '' und matchen
    const { corrections } = result.current.applyRulesToData(rules, rows, []);
    expect(corrections).toHaveLength(3);
  });

  it('identifier match scheitert bei fehlender Identifier-Spalte in Zeile', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const rules: CorrectionRule[] = [
      makeRule({
        column: 'S_Ort',
        originalValue: 'Zueri',
        correctedValue: 'Zürich',
        matchType: 'identifier',
        identifierColumn: 'S_ID',
        identifierValue: '100',
      }),
    ];
    const rows: ParsedRow[] = [
      { S_Ort: 'Zueri' }, // S_ID fehlt
    ];
    const { corrections } = result.current.applyRulesToData(rules, rows, []);
    expect(corrections).toHaveLength(0);
  });

  it('row-Nummerierung verwendet +2 Offset (Excel-konsistent)', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const rules: CorrectionRule[] = [makeRule({ originalValue: 'X', correctedValue: 'M' })];
    const rows: ParsedRow[] = [{ S_Geschlecht: 'X' }, { S_Geschlecht: 'X' }];
    const { corrections } = result.current.applyRulesToData(rules, rows, []);
    // Erste Daten-Zeile ist Excel-Zeile 2 (Header=1, Daten=2)
    expect(corrections[0].row).toBe(2);
    expect(corrections[1].row).toBe(3);
  });
});

// =============================================================================
// 5. File Export/Import Roundtrip
// =============================================================================
describe('useCorrectionMemory: file roundtrip', () => {
  it('loadFromFile akzeptiert valides JSON mit passendem importType', async () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const fileContent = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedFrom: 'test.csv',
      importType: 'schueler',
      rules: [makeRule()],
    };
    const file = new File([JSON.stringify(fileContent)], 'rules.json', {
      type: 'application/json',
    });

    let loaded: CorrectionRule[] = [];
    await act(async () => {
      loaded = await result.current.loadFromFile(file);
    });

    expect(loaded).toHaveLength(1);
    expect(loaded[0].originalValue).toBe('X');
    expect(result.current.error).toBeNull();
  });

  it('loadFromFile lehnt falschen importType ab', async () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const fileContent = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      exportedFrom: 'test.csv',
      importType: 'journal',
      rules: [makeRule()],
    };
    const file = new File([JSON.stringify(fileContent)], 'rules.json');

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.loadFromFile(file);
      } catch (e) {
        caught = e as Error;
      }
    });
    expect(caught).not.toBeNull();
    expect(caught!.message).toMatch(/journal/);
  });

  it('loadFromFile lehnt invalides Format ab', async () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const file = new File(['{ "foo": "bar" }'], 'rules.json');

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.loadFromFile(file);
      } catch (e) {
        caught = e as Error;
      }
    });
    expect(caught).not.toBeNull();
    expect(caught!.message).toMatch(/Ungültiges Dateiformat/);
  });

  it('loadFromFile lehnt korruptes JSON ab', async () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const file = new File(['not-json{'], 'rules.json');

    let caught: Error | null = null;
    await act(async () => {
      try {
        await result.current.loadFromFile(file);
      } catch (e) {
        caught = e as Error;
      }
    });
    expect(caught).not.toBeNull();
  });
});

// =============================================================================
// 6. Integration: applyRulesToData ignoriert bereits korrigierte Errors
// =============================================================================
describe('useCorrectionMemory: applyRulesToData mit Validation-Errors', () => {
  it('errors-Parameter führt nicht zu Crash und ändert Verhalten nicht (cellValueMatch reicht)', () => {
    const { result } = renderHook(() => useCorrectionMemory('schueler'));
    const rules: CorrectionRule[] = [makeRule({ originalValue: 'X', correctedValue: 'M' })];
    const rows: ParsedRow[] = [{ S_Geschlecht: 'X' }];
    const errors: ValidationError[] = [
      { row: 2, column: 'S_Geschlecht', value: 'X', message: 'Ungültig' },
    ];

    const { corrections } = result.current.applyRulesToData(rules, rows, errors);
    expect(corrections).toHaveLength(1);
  });
});
