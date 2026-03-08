import { describe, it, expect } from 'vitest';
import { mergeParseResults, parseCSV, validateData, type ParseResult } from '@/lib/fileParser';
import type { ColumnDefinition } from '@/types/importTypes';
import * as fs from 'fs';
import * as path from 'path';

// Read both test CSV files
const readCSV = (filename: string): string => {
  return fs.readFileSync(path.resolve(__dirname, `../../public/${filename}`), 'utf-8');
};

// Column definitions matching the CSV structure
const columns: ColumnDefinition[] = [
  { name: 'S_ID', required: true, category: 'Schüler' },
  { name: 'S_Name', required: true, category: 'Schüler' },
  { name: 'S_Vorname', required: true, category: 'Schüler' },
  { name: 'S_AHV', required: false, category: 'Schüler', validationType: 'ahv' },
  { name: 'S_Geschlecht', required: false, category: 'Schüler' },
  { name: 'S_Geburtsdatum', required: false, category: 'Schüler' },
  { name: 'S_Strasse', required: false, category: 'Schüler' },
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

describe('Cross-File Family Consistency', () => {
  it('should merge both files without errors', () => {
    const csv1 = readCSV('test-stammdaten.csv');
    const csv2 = readCSV('test-stammdaten-oberstufe.csv');

    const pr1 = parseCSV(csv1, 'test-stammdaten.csv');
    const pr2 = parseCSV(csv2, 'test-stammdaten-oberstufe.csv');

    expect(pr1.rows.length).toBeGreaterThan(0);
    expect(pr2.rows.length).toBeGreaterThan(0);

    const merged = mergeParseResults([pr1, pr2]);
    expect(merged.rows.length).toBe(pr1.rows.length + pr2.rows.length);
    expect(merged.sourceFiles).toHaveLength(2);
  });

  it('should find NO parent-ID inconsistencies for identical family data across files', () => {
    const csv1 = readCSV('test-stammdaten.csv');
    const csv2 = readCSV('test-stammdaten-oberstufe.csv');

    const pr1 = parseCSV(csv1, 'test-stammdaten.csv');
    const pr2 = parseCSV(csv2, 'test-stammdaten-oberstufe.csv');
    const merged = mergeParseResults([pr1, pr2]);

    const errors = validateData(merged.rows, columns);

    // No "Inkonsistente ID" errors should exist because parent data is identical
    const inconsistentIds = errors.filter(e => e.message.includes('Inkonsistente ID'));
    expect(inconsistentIds).toEqual([]);
  });

  it('should find NO parent data inconsistencies (same AHV, address, phone) across files', () => {
    const csv1 = readCSV('test-stammdaten.csv');
    const csv2 = readCSV('test-stammdaten-oberstufe.csv');

    const pr1 = parseCSV(csv1, 'test-stammdaten.csv');
    const pr2 = parseCSV(csv2, 'test-stammdaten-oberstufe.csv');
    const merged = mergeParseResults([pr1, pr2]);

    const errors = validateData(merged.rows, columns);

    // Check that there are no data inconsistency errors for parent fields
    const parentDataErrors = errors.filter(e =>
      (e.column?.startsWith('P_ERZ') && e.type === 'error') ||
      e.message.includes('Inkonsistente')
    );
    
    if (parentDataErrors.length > 0) {
      console.log('Unexpected parent data errors:', parentDataErrors.map(e => 
        `Row ${e.row}: ${e.column} - ${e.message} (value: ${e.value})`
      ));
    }
    
    expect(parentDataErrors).toEqual([]);
  });

  it('should correctly identify families shared across both files', () => {
    const csv1 = readCSV('test-stammdaten.csv');
    const csv2 = readCSV('test-stammdaten-oberstufe.csv');

    const pr1 = parseCSV(csv1, 'test-stammdaten.csv');
    const pr2 = parseCSV(csv2, 'test-stammdaten-oberstufe.csv');
    const merged = mergeParseResults([pr1, pr2]);

    // Shared families: Meier, Müller, Keller, Schmid, Brunner, Fischer, Weber, Huber, Steiner, Gerber, Baumann, Graf, Frey, Wyss, Schneider, Bauer, Lang, Roth
    const sharedParentIds = new Set<string>();
    const file1ParentIds = new Set<string>();
    const file2ParentIds = new Set<string>();

    for (const row of pr1.rows) {
      if (row.P_ERZ1_ID) file1ParentIds.add(String(row.P_ERZ1_ID));
      if (row.P_ERZ2_ID) file2ParentIds.add(String(row.P_ERZ2_ID));
    }
    for (const row of pr2.rows) {
      if (row.P_ERZ1_ID) {
        const id = String(row.P_ERZ1_ID);
        if (file1ParentIds.has(id)) sharedParentIds.add(id);
      }
      if (row.P_ERZ2_ID) {
        const id = String(row.P_ERZ2_ID);
        if (file2ParentIds.has(id)) sharedParentIds.add(id);
      }
    }

    // All families are shared between both files
    expect(sharedParentIds.size).toBeGreaterThanOrEqual(18); // At least 18 unique parent IDs shared
  });

  it('should detect inconsistency when parent address differs between files', () => {
    const csv1 = readCSV('test-stammdaten.csv');
    const csv2 = readCSV('test-stammdaten-oberstufe.csv');

    const pr1 = parseCSV(csv1, 'test-stammdaten.csv');
    const pr2 = parseCSV(csv2, 'test-stammdaten-oberstufe.csv');

    // Modify one row in file2 to have a different parent address
    const modifiedPr2 = { ...pr2, rows: [...pr2.rows] };
    modifiedPr2.rows[0] = { 
      ...modifiedPr2.rows[0], 
      P_ERZ1_Strasse: 'Andere Strasse 99' // Changed from "Hauptstrasse 1"
    };

    const merged = mergeParseResults([pr1, modifiedPr2]);
    const errors = validateData(merged.rows, columns);

    // Should detect sibling consistency warning (different address for same parent ID)
    const siblingWarnings = errors.filter(e =>
      e.message.includes('Geschwister') || 
      e.message.includes('Inkonsisten') ||
      (e.column?.includes('Strasse') && e.severity === 'warning')
    );
    
    expect(siblingWarnings.length).toBeGreaterThan(0);
  });
});
