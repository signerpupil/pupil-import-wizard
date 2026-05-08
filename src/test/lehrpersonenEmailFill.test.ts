import { describe, it, expect } from 'vitest';
import { computeEmailFill } from '@/lib/lehrpersonenEmailFill';

const r = (o: Record<string, any> = {}) => ({
  L_ID: '', L_Name: '', L_Vorname: '', L_Geburtsdatum: '',
  L_Privat_EMail: '', L_Schule_EMail: '', ...o,
});

describe('computeEmailFill', () => {
  it('fills empty email when same person has it elsewhere', () => {
    const res = computeEmailFill([
      r({ L_ID: '1', L_Privat_EMail: 'a@b.ch' }),
      r({ L_ID: '1', L_Privat_EMail: '' }),
    ]);
    expect(res.autoFills[1]?.L_Privat_EMail).toBe('a@b.ch');
    expect(res.conflicts).toHaveLength(0);
    expect(res.filledCount).toBe(1);
  });

  it('reports conflict for two different non-empty emails', () => {
    const res = computeEmailFill([
      r({ L_ID: '1', L_Privat_EMail: 'a@b.ch' }),
      r({ L_ID: '1', L_Privat_EMail: 'x@y.ch' }),
    ]);
    expect(res.conflicts).toHaveLength(1);
    expect(res.conflicts[0].candidates.sort()).toEqual(['a@b.ch', 'x@y.ch']);
    expect(Object.keys(res.autoFills)).toHaveLength(0);
  });

  it('uses Name+Vorname+Geburtsdatum fallback when L_ID missing', () => {
    const res = computeEmailFill([
      r({ L_Name: 'Müller', L_Vorname: 'Anna', L_Geburtsdatum: '01.01.1980', L_Schule_EMail: 's@x.ch' }),
      r({ L_Name: 'Müller', L_Vorname: 'Anna', L_Geburtsdatum: '01.01.1980', L_Schule_EMail: '' }),
    ]);
    expect(res.autoFills[1]?.L_Schule_EMail).toBe('s@x.ch');
  });

  it('handles Privat and Schule independently', () => {
    const res = computeEmailFill([
      r({ L_ID: '1', L_Privat_EMail: 'p@x.ch', L_Schule_EMail: '' }),
      r({ L_ID: '1', L_Privat_EMail: '', L_Schule_EMail: 's@x.ch' }),
    ]);
    expect(res.autoFills[1]?.L_Privat_EMail).toBe('p@x.ch');
    expect(res.autoFills[0]?.L_Schule_EMail).toBe('s@x.ch');
  });

  it('treats placeholders (-, null, keine) as empty', () => {
    const res = computeEmailFill([
      r({ L_ID: '1', L_Privat_EMail: 'real@x.ch' }),
      r({ L_ID: '1', L_Privat_EMail: '-' }),
      r({ L_ID: '1', L_Privat_EMail: 'null' }),
    ]);
    expect(res.autoFills[1]?.L_Privat_EMail).toBe('real@x.ch');
    expect(res.autoFills[2]?.L_Privat_EMail).toBe('real@x.ch');
    expect(res.conflicts).toHaveLength(0);
  });

  it('does nothing for single-row persons', () => {
    const res = computeEmailFill([
      r({ L_ID: '1', L_Privat_EMail: '' }),
    ]);
    expect(res.filledCount).toBe(0);
    expect(res.conflicts).toHaveLength(0);
  });
});