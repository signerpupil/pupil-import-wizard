/**
 * Telemetry collectors for unmapped values and unfixable patterns.
 *
 * STRICT PRIVACY RULES:
 * - Raw values are ONLY allowed for: language, nationality, PLZ (no personal data).
 * - All other columns (names, AHV, IDs, phone, email, dates, addresses) → MASK ONLY.
 * - Mask hard-capped at 40 chars.
 * - Max 50 top values per category, max 20 patterns per column.
 */

import type { ValidationError } from '@/types/importTypes';

const MAX_MASK_LENGTH = 40;
const MAX_TOP_VALUES = 50;
const MAX_PATTERNS_PER_COLUMN = 20;

/** Convert value into character-class mask: a→A, A→A, 0→9, others kept. */
export function maskValue(value: string): string {
  if (!value) return '';
  const truncated = value.slice(0, MAX_MASK_LENGTH);
  let out = '';
  for (const ch of truncated) {
    if (/[a-zäöüéàèç]/i.test(ch)) out += 'A';
    else if (/[0-9]/.test(ch)) out += '9';
    else out += ch;
  }
  return out;
}

/** Columns where the raw value is safe to log (no personal data). */
const LANGUAGE_COLUMNS = new Set(['S_Muttersprache', 'S_Umgangssprache']);
const NATIONALITY_COLUMNS = new Set(['S_Nationalitaet']);
const PLZ_COLUMNS = new Set(['S_PLZ', 'P_ERZ1_PLZ', 'P_ERZ2_PLZ']);

export interface UnmappedSummary {
  language: Array<{ value: string; count: number }>;
  nationality: Array<{ value: string; count: number }>;
  plz: Array<{ value: string; count: number }>;
}

export interface PatternSummary {
  // column -> [{ mask, count }]
  [column: string]: Array<{ mask: string; count: number }>;
}

function topN<K>(map: Map<K, number>, n: number): Array<{ key: K; count: number }> {
  return Array.from(map.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }));
}

/**
 * Analyse all validation errors and return:
 *  - unmapped raw values for whitelisted columns (language, nationality, PLZ)
 *  - anonymised character-class masks for ALL other columns
 */
export function summarizeForTelemetry(errors: ValidationError[]): {
  unmapped: UnmappedSummary;
  patterns: PatternSummary;
} {
  const langCounts = new Map<string, number>();
  const natCounts = new Map<string, number>();
  const plzCounts = new Map<string, number>();
  const patternCounts = new Map<string, Map<string, number>>();

  for (const e of errors) {
    const value = (e.value ?? '').trim();
    if (!value) continue;

    if (LANGUAGE_COLUMNS.has(e.column)) {
      const v = value.slice(0, MAX_MASK_LENGTH);
      langCounts.set(v, (langCounts.get(v) ?? 0) + 1);
    } else if (NATIONALITY_COLUMNS.has(e.column)) {
      const v = value.slice(0, MAX_MASK_LENGTH);
      natCounts.set(v, (natCounts.get(v) ?? 0) + 1);
    } else if (PLZ_COLUMNS.has(e.column)) {
      const v = value.slice(0, MAX_MASK_LENGTH);
      plzCounts.set(v, (plzCounts.get(v) ?? 0) + 1);
    } else {
      // All other columns: only the masked pattern, never the raw value.
      const mask = maskValue(value);
      if (!mask) continue;
      let inner = patternCounts.get(e.column);
      if (!inner) {
        inner = new Map<string, number>();
        patternCounts.set(e.column, inner);
      }
      inner.set(mask, (inner.get(mask) ?? 0) + 1);
    }
  }

  const unmapped: UnmappedSummary = {
    language: topN(langCounts, MAX_TOP_VALUES).map(x => ({ value: x.key, count: x.count })),
    nationality: topN(natCounts, MAX_TOP_VALUES).map(x => ({ value: x.key, count: x.count })),
    plz: topN(plzCounts, MAX_TOP_VALUES).map(x => ({ value: x.key, count: x.count })),
  };

  const patterns: PatternSummary = {};
  for (const [column, inner] of patternCounts.entries()) {
    patterns[column] = topN(inner, MAX_PATTERNS_PER_COLUMN).map(x => ({ mask: x.key, count: x.count }));
  }

  return { unmapped, patterns };
}

export function isUnmappedEmpty(u: UnmappedSummary): boolean {
  return u.language.length === 0 && u.nationality.length === 0 && u.plz.length === 0;
}

export function isPatternsEmpty(p: PatternSummary): boolean {
  return Object.keys(p).length === 0;
}
