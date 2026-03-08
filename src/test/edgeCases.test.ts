import { describe, it, expect } from 'vitest';
import { mergeParseResults, type ParseResult } from '@/lib/fileParser';

const makePR = (fileName: string, headers: string[], rows: Record<string, any>[]): ParseResult => ({
  headers,
  rows,
  fileName,
});

describe('Edge Cases', () => {
  describe('Empty files and header-only files', () => {
    it('merges a file with rows and a header-only file', () => {
      const withData = makePR('data.csv', ['Name', 'Klasse'], [
        { Name: 'Anna', Klasse: '3a' },
      ]);
      const headerOnly = makePR('empty.csv', ['Name', 'Klasse'], []);
      const merged = mergeParseResults([withData, headerOnly]);

      expect(merged.rows).toHaveLength(1);
      expect(merged.sourceFiles).toHaveLength(2);
      expect(merged.sourceFiles![1].rowCount).toBe(0);
    });

    it('merges two header-only files', () => {
      const a = makePR('a.csv', ['Name', 'PLZ'], []);
      const b = makePR('b.csv', ['Name', 'PLZ'], []);
      const merged = mergeParseResults([a, b]);

      expect(merged.rows).toHaveLength(0);
      expect(merged.sourceFiles).toHaveLength(2);
      expect(merged.headers).toContain('_source_file');
    });

    it('single header-only file returns empty rows with metadata', () => {
      const pr = makePR('empty.csv', ['Name'], []);
      const merged = mergeParseResults([pr]);

      expect(merged.rows).toHaveLength(0);
      expect(merged.sourceFiles).toHaveLength(1);
      expect(merged.sourceFiles![0].rowCount).toBe(0);
    });
  });

  describe('Column mismatches', () => {
    it('throws when second file is completely different columns', () => {
      const a = makePR('a.csv', ['Name', 'Klasse'], []);
      const b = makePR('b.csv', ['Foo', 'Bar'], []);
      expect(() => mergeParseResults([a, b])).toThrow('fehlen Spalten');
    });

    it('throws with descriptive message listing missing columns', () => {
      const a = makePR('a.csv', ['Name', 'Klasse', 'PLZ'], []);
      const b = makePR('b.csv', ['Name'], []);
      try {
        mergeParseResults([a, b]);
        expect.fail('Should have thrown');
      } catch (e: any) {
        expect(e.message).toContain('Klasse');
        expect(e.message).toContain('PLZ');
        expect(e.message).toContain('b.csv');
      }
    });

    it('ignores extra columns in all subsequent files', () => {
      const a = makePR('a.csv', ['Name'], [{ Name: 'X' }]);
      const b = makePR('b.csv', ['Name', 'Extra1'], [{ Name: 'Y', Extra1: '1' }]);
      const c = makePR('c.csv', ['Name', 'Extra2'], [{ Name: 'Z', Extra2: '2' }]);
      const merged = mergeParseResults([a, b, c]);

      expect(merged.headers).not.toContain('Extra1');
      expect(merged.headers).not.toContain('Extra2');
      expect(merged.rows).toHaveLength(3);
    });
  });

  describe('Special characters and encoding', () => {
    it('handles Unicode characters (umlauts, accents) in data', () => {
      const pr = makePR('utf8.csv', ['Name', 'Ort'], [
        { Name: 'Müller', Ort: 'Zürich' },
        { Name: 'Böhm', Ort: 'Genève' },
        { Name: "D'Agostino", Ort: 'Côte' },
      ]);
      const merged = mergeParseResults([pr]);

      expect(merged.rows[0].Name).toBe('Müller');
      expect(merged.rows[0].Ort).toBe('Zürich');
      expect(merged.rows[2].Name).toBe("D'Agostino");
    });

    it('handles Unicode in headers', () => {
      const a = makePR('a.csv', ['Schüler_Name', 'Straße'], [
        { 'Schüler_Name': 'Test', 'Straße': 'Hauptstr.' },
      ]);
      const b = makePR('b.csv', ['Schüler_Name', 'Straße'], [
        { 'Schüler_Name': 'Test2', 'Straße': 'Nebenstr.' },
      ]);
      const merged = mergeParseResults([a, b]);

      expect(merged.headers).toContain('Schüler_Name');
      expect(merged.rows).toHaveLength(2);
    });

    it('preserves emoji and special chars in values', () => {
      const pr = makePR('special.csv', ['Note'], [
        { Note: '✓ OK' },
        { Note: '⚠️ Warning' },
        { Note: 'Line1\nLine2' },
      ]);
      const merged = mergeParseResults([pr]);
      expect(merged.rows[0].Note).toBe('✓ OK');
    });
  });

  describe('Null and missing values', () => {
    it('fills missing values with null across merged files', () => {
      const a = makePR('a.csv', ['Name', 'PLZ', 'Ort'], [
        { Name: 'A' },
      ]);
      const b = makePR('b.csv', ['Name', 'PLZ', 'Ort'], [
        { Name: 'B', PLZ: '8000', Ort: 'Zürich' },
      ]);
      const merged = mergeParseResults([a, b]);

      expect(merged.rows[0].PLZ).toBeNull();
      expect(merged.rows[0].Ort).toBeNull();
      expect(merged.rows[1].PLZ).toBe('8000');
    });

    it('handles undefined values as null in multi-file merge', () => {
      const a = makePR('a.csv', ['A', 'B'], [
        { A: 'x', B: undefined },
      ]);
      const b = makePR('b.csv', ['A', 'B'], [
        { A: undefined, B: 'y' },
      ]);
      const merged = mergeParseResults([a, b]);

      // mergeParseResults uses ?? null for missing values
      expect(merged.rows[0].B).toBeNull();
      expect(merged.rows[1].A).toBeNull();
    });
  });

  describe('Large merges', () => {
    it('correctly merges three files maintaining order', () => {
      const files = ['file1.csv', 'file2.csv', 'file3.csv'].map((name, i) =>
        makePR(name, ['Name'], [
          { Name: `Person_${i}_A` },
          { Name: `Person_${i}_B` },
        ])
      );
      const merged = mergeParseResults(files);

      expect(merged.rows).toHaveLength(6);
      expect(merged.rows[0]._source_file).toBe('file1.csv');
      expect(merged.rows[0].Name).toBe('Person_0_A');
      expect(merged.rows[2]._source_file).toBe('file2.csv');
      expect(merged.rows[4]._source_file).toBe('file3.csv');
      expect(merged.fileName).toBe('file1.csv + file2.csv + file3.csv');
    });
  });

  describe('Duplicate file names', () => {
    it('does not deduplicate rows when file names match (merge handles all)', () => {
      const a = makePR('same.csv', ['Name'], [{ Name: 'A' }]);
      const b = makePR('same.csv', ['Name'], [{ Name: 'B' }]);
      const merged = mergeParseResults([a, b]);

      // mergeParseResults does not deduplicate - that's Step1FileUpload's job
      expect(merged.rows).toHaveLength(2);
    });
  });
});
