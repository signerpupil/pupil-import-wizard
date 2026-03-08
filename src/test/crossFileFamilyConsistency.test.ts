import { describe, it, expect } from 'vitest';
import { mergeParseResults, validateData, type ParseResult } from '@/lib/fileParser';
import type { ColumnDefinition, ParsedRow } from '@/types/importTypes';

const columns: ColumnDefinition[] = [
  { name: 'S_ID', required: true, category: 'Schüler' },
  { name: 'S_Name', required: true, category: 'Schüler' },
  { name: 'S_Vorname', required: true, category: 'Schüler' },
  { name: 'S_AHV', required: false, category: 'Schüler', validationType: 'ahv' },
  { name: 'S_PLZ', required: false, category: 'Schüler' },
  { name: 'S_Ort', required: false, category: 'Schüler' },
  { name: 'P_ERZ1_ID', required: false, category: 'Eltern' },
  { name: 'P_ERZ1_AHV', required: false, category: 'Eltern', validationType: 'ahv' },
  { name: 'P_ERZ1_Name', required: false, category: 'Eltern' },
  { name: 'P_ERZ1_Vorname', required: false, category: 'Eltern' },
  { name: 'P_ERZ1_Strasse', required: false, category: 'Eltern' },
  { name: 'P_ERZ1_PLZ', required: false, category: 'Eltern' },
  { name: 'P_ERZ1_Ort', required: false, category: 'Eltern' },
  { name: 'P_ERZ1_TelefonPrivat', required: false, category: 'Eltern' },
  { name: 'P_ERZ1_Mobil', required: false, category: 'Eltern' },
  { name: 'P_ERZ2_ID', required: false, category: 'Eltern' },
  { name: 'P_ERZ2_AHV', required: false, category: 'Eltern', validationType: 'ahv' },
  { name: 'P_ERZ2_Name', required: false, category: 'Eltern' },
  { name: 'P_ERZ2_Vorname', required: false, category: 'Eltern' },
  { name: 'P_ERZ2_Strasse', required: false, category: 'Eltern' },
  { name: 'P_ERZ2_PLZ', required: false, category: 'Eltern' },
  { name: 'P_ERZ2_Ort', required: false, category: 'Eltern' },
  { name: 'P_ERZ2_TelefonPrivat', required: false, category: 'Eltern' },
  { name: 'K_Name', required: false, category: 'Klasse' },
];

const headers = columns.map(c => c.name);

// Family Meier: same parents across both files
const meierParent = {
  P_ERZ1_ID: '20001', P_ERZ1_AHV: '756.2001.0001.01', P_ERZ1_Name: 'Meier', P_ERZ1_Vorname: 'Thomas',
  P_ERZ1_Strasse: 'Hauptstrasse 1', P_ERZ1_PLZ: '8001', P_ERZ1_Ort: 'Zürich',
  P_ERZ1_TelefonPrivat: '044 123 45 67', P_ERZ1_Mobil: '079 123 45 67',
  P_ERZ2_ID: '20002', P_ERZ2_AHV: '756.2001.0002.01', P_ERZ2_Name: 'Meier', P_ERZ2_Vorname: 'Sandra',
  P_ERZ2_Strasse: 'Hauptstrasse 1', P_ERZ2_PLZ: '8001', P_ERZ2_Ort: 'Zürich',
  P_ERZ2_TelefonPrivat: '044 123 45 68',
};

// Family Müller: same parents across both files
const muellerParent = {
  P_ERZ1_ID: '20003', P_ERZ1_AHV: '756.2002.0001.01', P_ERZ1_Name: 'Müller', P_ERZ1_Vorname: 'Peter',
  P_ERZ1_Strasse: 'Bahnhofstrasse 5', P_ERZ1_PLZ: '8002', P_ERZ1_Ort: 'Zürich',
  P_ERZ1_TelefonPrivat: '044 234 56 78', P_ERZ1_Mobil: '079 234 56 78',
  P_ERZ2_ID: '20004', P_ERZ2_AHV: '756.2002.0002.01', P_ERZ2_Name: 'Müller', P_ERZ2_Vorname: 'Maria',
  P_ERZ2_Strasse: 'Bahnhofstrasse 5', P_ERZ2_PLZ: '8002', P_ERZ2_Ort: 'Zürich',
  P_ERZ2_TelefonPrivat: '044 234 56 79',
};

// Primar file (younger children)
const primarRows: ParsedRow[] = [
  { S_ID: '10001', S_Name: 'Meier', S_Vorname: 'Luca', S_AHV: '756.1234.5678.01', S_PLZ: '8001', S_Ort: 'Zürich', K_Name: '1A', ...meierParent },
  { S_ID: '10002', S_Name: 'Meier', S_Vorname: 'Sophie', S_AHV: '756.1234.5678.02', S_PLZ: '8001', S_Ort: 'Zürich', K_Name: '1A', ...meierParent },
  { S_ID: '10004', S_Name: 'Müller', S_Vorname: 'Anna', S_AHV: '756.1234.5678.04', S_PLZ: '8002', S_Ort: 'Zürich', K_Name: '1A', ...muellerParent },
  { S_ID: '10005', S_Name: 'Müller', S_Vorname: 'Noah', S_AHV: '756.1234.5678.05', S_PLZ: '8002', S_Ort: 'Zürich', K_Name: '1B', ...muellerParent },
];

// Oberstufe file (older siblings, same parents)
const oberstufeRows: ParsedRow[] = [
  { S_ID: '10060', S_Name: 'Meier', S_Vorname: 'Anja', S_AHV: '756.1234.5678.60', S_PLZ: '8001', S_Ort: 'Zürich', K_Name: 'Sek1A', ...meierParent },
  { S_ID: '10061', S_Name: 'Meier', S_Vorname: 'Rafael', S_AHV: '756.1234.5678.61', S_PLZ: '8001', S_Ort: 'Zürich', K_Name: 'Sek1B', ...meierParent },
  { S_ID: '10062', S_Name: 'Müller', S_Vorname: 'Jasmin', S_AHV: '756.1234.5678.62', S_PLZ: '8002', S_Ort: 'Zürich', K_Name: 'Sek1A', ...muellerParent },
];

const makePR = (name: string, rows: ParsedRow[]): ParseResult => ({
  headers: [...headers],
  rows,
  fileName: name,
});

describe('Cross-File Family Consistency', () => {
  it('should merge both files correctly', () => {
    const merged = mergeParseResults([makePR('primar.csv', primarRows), makePR('oberstufe.csv', oberstufeRows)]);
    expect(merged.rows).toHaveLength(7);
    expect(merged.sourceFiles).toHaveLength(2);
  });

  it('should find NO parent-ID inconsistencies for identical family data across files', () => {
    const merged = mergeParseResults([makePR('primar.csv', primarRows), makePR('oberstufe.csv', oberstufeRows)]);
    const errors = validateData(merged.rows, columns);

    const inconsistentIds = errors.filter(e => e.message.includes('Inkonsistente ID'));
    expect(inconsistentIds).toEqual([]);
  });

  it('should find NO sibling consistency warnings for identical addresses across files', () => {
    const merged = mergeParseResults([makePR('primar.csv', primarRows), makePR('oberstufe.csv', oberstufeRows)]);
    const errors = validateData(merged.rows, columns);

    const siblingWarnings = errors.filter(e => e.message.includes('Geschwister'));
    expect(siblingWarnings).toEqual([]);
  });

  it('should detect sibling inconsistency when student PLZ/Ort differs between files', () => {
    const modifiedOberstufe: ParsedRow[] = [
      { ...oberstufeRows[0], S_PLZ: '3000', S_Ort: 'Bern' }, // Different student address
      ...oberstufeRows.slice(1),
    ];

    const merged = mergeParseResults([makePR('primar.csv', primarRows), makePR('oberstufe.csv', modifiedOberstufe)]);
    const errors = validateData(merged.rows, columns);

    // Should detect that Meier/Anja has different S_PLZ/S_Ort than siblings with same parent ID
    const siblingWarnings = errors.filter(e => e.message.includes('Geschwister'));
    expect(siblingWarnings.length).toBeGreaterThan(0);
  });

  it('should detect inconsistency when parent ID differs between files for same parent', () => {
    const modifiedOberstufe: ParsedRow[] = [
      { ...oberstufeRows[0], P_ERZ1_ID: '99999' }, // Different parent ID
      ...oberstufeRows.slice(1),
    ];

    const merged = mergeParseResults([makePR('primar.csv', primarRows), makePR('oberstufe.csv', modifiedOberstufe)]);
    const errors = validateData(merged.rows, columns);

    const inconsistentIds = errors.filter(e => e.message.includes('Inkonsistente ID'));
    expect(inconsistentIds.length).toBeGreaterThan(0);
  });

  it('should verify shared parent IDs across files', () => {
    const file1ParentIds = new Set(primarRows.map(r => r.P_ERZ1_ID));
    const file2ParentIds = new Set(oberstufeRows.map(r => r.P_ERZ1_ID));

    const shared = [...file1ParentIds].filter(id => file2ParentIds.has(id));
    // Meier (20001) and Müller (20003) parents are shared
    expect(shared).toContain('20001');
    expect(shared).toContain('20003');
  });
});
