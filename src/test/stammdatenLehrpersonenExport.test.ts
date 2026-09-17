import { describe, expect, it } from 'vitest';
import { parseSwissDate } from '@/lib/stammdatenLehrpersonenExport';

describe('parseSwissDate', () => {
  it.each([
    ['13.07.67', '1967-07-13'],
    ['1.1.1990', '1990-01-01'],
    ['15.08.24', '2024-08-15'],
    ['2026-09-17', '2026-09-17'],
  ])('wandelt %s in ein echtes Datum um', (input, expected) => {
    expect(parseSwissDate(input)?.toISOString().slice(0, 10)).toBe(expected);
  });

  it.each(['31.02.2020', '00.01.2020', '15.13.2020'])('lehnt ungültiges Datum %s ab', input => {
    expect(parseSwissDate(input)).toBeNull();
  });
});