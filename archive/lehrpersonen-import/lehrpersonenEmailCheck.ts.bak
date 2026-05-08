import type { ParsedRow } from '@/types/importTypes';

export interface EmailDuplicate {
  email: string;
  /** Column where the duplicate appears (e.g. L_Privat_EMail, L_Schule_EMail) */
  column: string;
  /** Row indices (0-based) sharing this email */
  rows: number[];
  /** Names of the persons for display */
  names: string[];
}

const EMAIL_COLUMNS = ['L_Privat_EMail', 'L_Schule_EMail'] as const;

/**
 * Finds duplicate email addresses across all rows in the Lehrpersonen data.
 * An email is considered duplicate when it appears for two or more different persons
 * (identified by L_ID, or by Name+Vorname fallback).
 */
export function findDuplicateEmails(rows: ParsedRow[]): EmailDuplicate[] {
  // Map: normalized email → { column, personKey, rowIdx, displayName }[]
  const emailMap = new Map<string, { column: string; personKey: string; rowIdx: number; displayName: string }[]>();

  rows.forEach((row, rowIdx) => {
    const lid = String(row['L_ID'] ?? '').trim();
    const name = String(row['L_Name'] ?? '').trim();
    const vorname = String(row['L_Vorname'] ?? '').trim();
    const personKey = lid || `${name}|${vorname}`;
    const displayName = `${vorname} ${name}`.trim() || `Zeile ${rowIdx + 1}`;

    for (const col of EMAIL_COLUMNS) {
      const raw = String(row[col] ?? '').trim().toLowerCase();
      if (!raw || raw === 'null' || raw === '-') continue;

      if (!emailMap.has(raw)) {
        emailMap.set(raw, []);
      }
      emailMap.get(raw)!.push({ column: col, personKey, rowIdx, displayName });
    }
  });

  const duplicates: EmailDuplicate[] = [];

  for (const [email, entries] of emailMap) {
    // Group by unique person
    const uniquePersons = new Map<string, { rowIdx: number; displayName: string }>();
    for (const e of entries) {
      if (!uniquePersons.has(e.personKey)) {
        uniquePersons.set(e.personKey, { rowIdx: e.rowIdx, displayName: e.displayName });
      }
    }

    if (uniquePersons.size < 2) continue;

    // Determine which columns are affected
    const columns = [...new Set(entries.map(e => e.column))];
    const colLabel = columns.length > 1 ? columns.join(' / ') : columns[0];

    duplicates.push({
      email,
      column: colLabel,
      rows: entries.map(e => e.rowIdx),
      names: [...uniquePersons.values()].map(p => p.displayName),
    });
  }

  return duplicates;
}

/**
 * Returns a Set of row indices that have at least one duplicate email.
 */
export function getDuplicateEmailRowSet(duplicates: EmailDuplicate[]): Set<number> {
  const set = new Set<number>();
  for (const d of duplicates) {
    for (const r of d.rows) set.add(r);
  }
  return set;
}
