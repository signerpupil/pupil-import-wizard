import type { ParsedRow } from '@/types/importTypes';

export type EmailColumn = 'L_Privat_EMail' | 'L_Schule_EMail';

export interface EmailConflict {
  personKey: string;
  displayName: string;
  column: EmailColumn;
  /** Distinct candidate emails (original casing of first occurrence) */
  candidates: string[];
  /** All row indices for this person */
  rowIndices: number[];
}

export interface EmailFillResult {
  /** rowIdx → { column → email } overrides to apply automatically */
  autoFills: Record<number, Partial<Record<EmailColumn, string>>>;
  conflicts: EmailConflict[];
  filledCount: number;
}

const EMAIL_COLUMNS: EmailColumn[] = ['L_Privat_EMail', 'L_Schule_EMail'];
const PLACEHOLDERS = new Set(['', '-', 'null', 'keine', 'verstorben']);

function isEmpty(value: unknown): boolean {
  const s = String(value ?? '').trim().toLowerCase();
  return PLACEHOLDERS.has(s);
}

function getPersonKey(row: ParsedRow): string {
  const lid = String(row['L_ID'] ?? '').trim();
  if (lid) return `id:${lid}`;
  const name = String(row['L_Name'] ?? '').trim().toLowerCase();
  const vorname = String(row['L_Vorname'] ?? '').trim().toLowerCase();
  const geb = String(row['L_Geburtsdatum'] ?? '').trim();
  return `nv:${name}|${vorname}|${geb}`;
}

function getDisplayName(row: ParsedRow): string {
  const vorname = String(row['L_Vorname'] ?? '').trim();
  const name = String(row['L_Name'] ?? '').trim();
  const lid = String(row['L_ID'] ?? '').trim();
  const full = `${vorname} ${name}`.trim();
  if (full && lid) return `${full} (${lid})`;
  return full || lid || 'Unbekannt';
}

export function computeEmailFill(rows: ParsedRow[]): EmailFillResult {
  // Group row indices by person key
  const groups = new Map<number[], never> as unknown as Map<string, number[]>;
  const groupMap = new Map<string, number[]>();
  rows.forEach((row, idx) => {
    const key = getPersonKey(row);
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(idx);
  });

  const autoFills: Record<number, Partial<Record<EmailColumn, string>>> = {};
  const conflicts: EmailConflict[] = [];
  let filledCount = 0;

  for (const [key, indices] of groupMap) {
    if (indices.length < 2) continue;

    for (const col of EMAIL_COLUMNS) {
      // Map normalized → original first occurrence
      const distinct = new Map<string, string>();
      const emptyRows: number[] = [];
      for (const i of indices) {
        const raw = String(rows[i]?.[col] ?? '').trim();
        if (isEmpty(raw)) {
          emptyRows.push(i);
        } else {
          const norm = raw.toLowerCase();
          if (!distinct.has(norm)) distinct.set(norm, raw);
        }
      }

      if (distinct.size === 0) continue;
      if (emptyRows.length === 0 && distinct.size === 1) continue;

      if (distinct.size === 1) {
        const value = [...distinct.values()][0];
        for (const i of emptyRows) {
          if (!autoFills[i]) autoFills[i] = {};
          autoFills[i][col] = value;
          filledCount++;
        }
      } else {
        // Conflict: 2+ distinct non-empty values
        conflicts.push({
          personKey: key,
          displayName: getDisplayName(rows[indices[0]]),
          column: col,
          candidates: [...distinct.values()],
          rowIndices: indices,
        });
      }
    }
  }

  return { autoFills, conflicts, filledCount };
}