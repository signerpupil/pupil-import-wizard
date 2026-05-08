import { describe, it, expect } from 'vitest';
import { findDuplicateEmails, getDuplicateEmailRowSet } from '@/lib/lehrpersonenEmailCheck';

const makeRow = (overrides: Record<string, any> = {}) => ({
  L_ID: '', L_Name: '', L_Vorname: '', L_Privat_EMail: '', L_Schule_EMail: '',
  ...overrides,
});

describe('findDuplicateEmails', () => {
  it('detects duplicate email across different L_IDs', () => {
    const rows = [
      makeRow({ L_ID: '1', L_Name: 'Müller', L_Vorname: 'Anna', L_Privat_EMail: 'anna@test.ch' }),
      makeRow({ L_ID: '2', L_Name: 'Meier', L_Vorname: 'Beat', L_Privat_EMail: 'anna@test.ch' }),
    ];
    const dupes = findDuplicateEmails(rows);
    expect(dupes).toHaveLength(1);
    expect(dupes[0].email).toBe('anna@test.ch');
    expect(dupes[0].names).toContain('Anna Müller');
    expect(dupes[0].names).toContain('Beat Meier');
  });

  it('does not flag same email for same person (same L_ID)', () => {
    const rows = [
      makeRow({ L_ID: '1', L_Privat_EMail: 'a@b.ch' }),
      makeRow({ L_ID: '1', L_Privat_EMail: 'a@b.ch' }),
    ];
    expect(findDuplicateEmails(rows)).toHaveLength(0);
  });

  it('ignores empty, null, and placeholder emails', () => {
    const rows = [
      makeRow({ L_ID: '1', L_Privat_EMail: '' }),
      makeRow({ L_ID: '2', L_Privat_EMail: null }),
      makeRow({ L_ID: '3', L_Privat_EMail: '-' }),
      makeRow({ L_ID: '4', L_Privat_EMail: 'null' }),
    ];
    expect(findDuplicateEmails(rows)).toHaveLength(0);
  });

  it('matches case-insensitively', () => {
    const rows = [
      makeRow({ L_ID: '1', L_Schule_EMail: 'User@Domain.CH' }),
      makeRow({ L_ID: '2', L_Schule_EMail: 'user@domain.ch' }),
    ];
    const dupes = findDuplicateEmails(rows);
    expect(dupes).toHaveLength(1);
  });

  it('detects cross-column duplicate (Privat vs Schule)', () => {
    const rows = [
      makeRow({ L_ID: '1', L_Privat_EMail: 'shared@test.ch' }),
      makeRow({ L_ID: '2', L_Schule_EMail: 'shared@test.ch' }),
    ];
    const dupes = findDuplicateEmails(rows);
    expect(dupes).toHaveLength(1);
    expect(dupes[0].column).toContain('L_Privat_EMail');
    expect(dupes[0].column).toContain('L_Schule_EMail');
  });

  it('falls back to Name+Vorname when L_ID is missing', () => {
    const rows = [
      makeRow({ L_Name: 'Huber', L_Vorname: 'Clara', L_Privat_EMail: 'x@y.ch' }),
      makeRow({ L_Name: 'Huber', L_Vorname: 'Clara', L_Privat_EMail: 'x@y.ch' }),
    ];
    // Same person by name fallback → no duplicate
    expect(findDuplicateEmails(rows)).toHaveLength(0);
  });

  it('flags different persons by name fallback', () => {
    const rows = [
      makeRow({ L_Name: 'Huber', L_Vorname: 'Clara', L_Privat_EMail: 'x@y.ch' }),
      makeRow({ L_Name: 'Schmid', L_Vorname: 'Eva', L_Privat_EMail: 'x@y.ch' }),
    ];
    expect(findDuplicateEmails(rows)).toHaveLength(1);
  });
});

describe('getDuplicateEmailRowSet', () => {
  it('returns correct row indices', () => {
    const dupes = findDuplicateEmails([
      makeRow({ L_ID: '1', L_Privat_EMail: 'dup@test.ch' }),
      makeRow({ L_ID: '2', L_Privat_EMail: 'unique@test.ch' }),
      makeRow({ L_ID: '3', L_Privat_EMail: 'dup@test.ch' }),
    ]);
    const set = getDuplicateEmailRowSet(dupes);
    expect(set.has(0)).toBe(true);
    expect(set.has(2)).toBe(true);
    expect(set.has(1)).toBe(false);
  });
});
