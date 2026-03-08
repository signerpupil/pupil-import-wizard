import { describe, it, expect } from 'vitest';
import { mergeParseResults, type ParseResult } from '@/lib/fileParser';

const makePR = (fileName: string, headers: string[], rows: Record<string, any>[]): ParseResult => ({
  headers,
  rows,
  fileName,
});

describe('mergeParseResults', () => {
  it('returns empty for no results', () => {
    const merged = mergeParseResults([]);
    expect(merged.headers).toEqual([]);
    expect(merged.rows).toEqual([]);
  });

  it('returns single file with sourceFiles metadata', () => {
    const pr = makePR('primar.csv', ['Name', 'Klasse'], [
      { Name: 'Anna', Klasse: '3a' },
    ]);
    const merged = mergeParseResults([pr]);
    expect(merged.sourceFiles).toHaveLength(1);
    expect(merged.sourceFiles![0].name).toBe('primar.csv');
    expect(merged.rows).toHaveLength(1);
  });

  it('merges two files with same headers', () => {
    const primar = makePR('primar.csv', ['Name', 'Klasse'], [
      { Name: 'Anna', Klasse: '3a' },
      { Name: 'Ben', Klasse: '4b' },
    ]);
    const oberstufe = makePR('oberstufe.csv', ['Name', 'Klasse'], [
      { Name: 'Clara', Klasse: '1A' },
    ]);
    const merged = mergeParseResults([primar, oberstufe]);
    
    expect(merged.rows).toHaveLength(3);
    expect(merged.headers).toContain('_source_file');
    expect(merged.headers).toContain('Name');
    expect(merged.rows[0]._source_file).toBe('primar.csv');
    expect(merged.rows[2]._source_file).toBe('oberstufe.csv');
    expect(merged.sourceFiles).toHaveLength(2);
    expect(merged.fileName).toBe('primar.csv + oberstufe.csv');
  });

  it('throws if second file is missing columns', () => {
    const a = makePR('a.csv', ['Name', 'Klasse', 'PLZ'], []);
    const b = makePR('b.csv', ['Name', 'Klasse'], []);
    expect(() => mergeParseResults([a, b])).toThrow('fehlen Spalten');
  });

  it('ignores extra columns in subsequent files', () => {
    const a = makePR('a.csv', ['Name'], [{ Name: 'X' }]);
    const b = makePR('b.csv', ['Name', 'Extra'], [{ Name: 'Y', Extra: 'Z' }]);
    const merged = mergeParseResults([a, b]);
    expect(merged.headers).not.toContain('Extra');
    expect(merged.rows[1].Name).toBe('Y');
  });

  it('handles missing values as null', () => {
    const a = makePR('a.csv', ['Name', 'PLZ'], [{ Name: 'A' }]);
    const b = makePR('b.csv', ['Name', 'PLZ'], [{ Name: 'B', PLZ: '8000' }]);
    const merged = mergeParseResults([a, b]);
    expect(merged.rows[0].PLZ).toBeNull();
    expect(merged.rows[1].PLZ).toBe('8000');
  });
});
