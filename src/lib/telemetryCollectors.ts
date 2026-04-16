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

// ─────────────────────────────────────────────────────────────────────────────
// Manual correction tracking (anonymised mask → mask)
// ─────────────────────────────────────────────────────────────────────────────

const MAX_PAIRS_PER_COLUMN = 20;

/** column -> "from||to" -> count */
const manualCorrectionBuffer = new Map<string, Map<string, number>>();

/** Choose raw value for whitelisted columns, mask for everything else. */
function anonymizeForColumn(column: string, value: string): string {
  const v = (value ?? '').trim();
  if (!v) return '';
  if (LANGUAGE_COLUMNS.has(column) || NATIONALITY_COLUMNS.has(column) || PLZ_COLUMNS.has(column)) {
    return v.slice(0, MAX_MASK_LENGTH);
  }
  return maskValue(v);
}

/**
 * Buffer a single manual correction. Anonymises both values immediately.
 * Never stores raw personal data — masks live only in module memory.
 */
export function bufferManualCorrection(column: string, oldValue: string, newValue: string): void {
  const from = anonymizeForColumn(column, oldValue);
  const to = anonymizeForColumn(column, newValue);
  if (!from || !to || from === to) return;

  let inner = manualCorrectionBuffer.get(column);
  if (!inner) {
    inner = new Map<string, number>();
    manualCorrectionBuffer.set(column, inner);
  }
  const key = `${from}||${to}`;
  inner.set(key, (inner.get(key) ?? 0) + 1);
}

export interface ManualCorrectionSummary {
  // column -> [{ from, to, count }]
  [column: string]: Array<{ from: string; to: string; count: number }>;
}

/** Return + clear the buffer. Caller decides whether to send. */
export function flushManualCorrections(): ManualCorrectionSummary {
  const out: ManualCorrectionSummary = {};
  for (const [column, inner] of manualCorrectionBuffer.entries()) {
    const top = Array.from(inner.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_PAIRS_PER_COLUMN)
      .map(([key, count]) => {
        const [from, to] = key.split('||', 2);
        return { from, to, count };
      });
    if (top.length > 0) out[column] = top;
  }
  manualCorrectionBuffer.clear();
  return out;
}

export function isManualCorrectionsEmpty(s: ManualCorrectionSummary): boolean {
  return Object.keys(s).length === 0;
}

export function hasBufferedManualCorrections(): boolean {
  return manualCorrectionBuffer.size > 0;
}
