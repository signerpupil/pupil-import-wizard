/**
 * Pre-Flight-Check für Step 1: Erkennt häufige Probleme direkt nach dem Upload,
 * BEVOR Nutzer:innen zu Step 2 (Spalten-Check) wechseln.
 *
 * Geprüft wird:
 * 1. Encoding-Auffälligkeiten (Mojibake wie "Ã¼", "", BOM-Reste)
 * 2. Trennzeichen-Plausibilität (1-Spalten-Header → wahrscheinlich falscher Delimiter)
 * 3. Pflichtspalten (fehlend ODER >90% leer)
 *
 * Das Ergebnis ist rein informativ (Warnungen) bzw. blockierend (Errors).
 * Findings werden in PreflightCheckCard angezeigt.
 */

import type { ParseResult } from './fileParser';
import type { ColumnDefinition } from '@/types/importTypes';

export type PreflightSeverity = 'error' | 'warning' | 'info';

export interface PreflightFinding {
  severity: PreflightSeverity;
  category: 'encoding' | 'delimiter' | 'required-columns' | 'empty-columns' | 'structure';
  title: string;
  message: string;
  /** Optional: betroffene Spalten/Felder zur Anzeige */
  affected?: string[];
  /** Optional: Empfehlung an die Nutzer:in */
  hint?: string;
}

export interface PreflightResult {
  findings: PreflightFinding[];
  hasErrors: boolean;
  hasWarnings: boolean;
}

/** Häufige Mojibake-Sequenzen (UTF-8 als Latin-1 interpretiert oder umgekehrt) */
const MOJIBAKE_PATTERNS = [
  '', // Replacement-Char (defektes Encoding)
  'Ã¤', 'Ã¶', 'Ã¼', 'ÃŸ', 'Ã„', 'Ã–', 'Ãœ', // Mojibake für Umlaute
  'â€™', 'â€œ', 'â€', // Mojibake für typografische Anführungs-/Apostrophzeichen
  'Ã©', 'Ã¨', 'Ã ', // Mojibake für französische Akzente
];

/** Prüft Header und Sample-Cells auf Mojibake */
function checkEncoding(parseResult: ParseResult): PreflightFinding[] {
  const findings: PreflightFinding[] = [];
  const affected = new Set<string>();

  // Header prüfen
  for (const header of parseResult.headers) {
    if (MOJIBAKE_PATTERNS.some((p) => header.includes(p))) {
      affected.add(`Spaltenkopf: "${header}"`);
    }
    // BOM-Reste (sollten von Parser entfernt sein, aber sicherheitshalber)
    if (header.charCodeAt(0) === 0xfeff) {
      affected.add(`BOM-Zeichen in: "${header}"`);
    }
  }

  // Sample der ersten 50 Zeilen
  const sampleSize = Math.min(50, parseResult.rows.length);
  for (let i = 0; i < sampleSize; i++) {
    const row = parseResult.rows[i];
    for (const [col, value] of Object.entries(row)) {
      if (typeof value === 'string' && MOJIBAKE_PATTERNS.some((p) => value.includes(p))) {
        affected.add(col);
        if (affected.size >= 8) break; // Nicht zu viele anzeigen
      }
    }
    if (affected.size >= 8) break;
  }

  if (affected.size > 0) {
    findings.push({
      severity: 'warning',
      category: 'encoding',
      title: 'Mögliches Encoding-Problem erkannt',
      message:
        'In der Datei wurden Zeichen gefunden, die auf ein falsches Encoding hindeuten (z.B. "Ã¼" statt "ü", "" statt eines Umlauts).',
      affected: Array.from(affected).slice(0, 8),
      hint: 'Speichere die Datei in LehrerOffice/Excel erneut als UTF-8 (CSV) oder als .xlsx, um Encoding-Probleme zu vermeiden.',
    });
  }

  return findings;
}

/** Prüft, ob das Trennzeichen plausibel erkannt wurde */
function checkDelimiter(parseResult: ParseResult): PreflightFinding[] {
  const findings: PreflightFinding[] = [];

  // Heuristik 1: Nur eine Spalte → wahrscheinlich falscher Delimiter
  // Ausnahme: _source_file ist immer da bei mehreren Files
  const realHeaders = parseResult.headers.filter((h) => h !== '_source_file');
  if (realHeaders.length === 1) {
    const onlyHeader = realHeaders[0];
    // Wenn der einzige Header viele Trennzeichen-Kandidaten enthält → ziemlich sicher falsch
    const suspiciousChars = [';', ',', '\t', '|'];
    const containedDelimiters = suspiciousChars.filter((c) => onlyHeader.includes(c));
    if (containedDelimiters.length > 0) {
      findings.push({
        severity: 'error',
        category: 'delimiter',
        title: 'Trennzeichen wurde nicht erkannt',
        message: `Die Datei enthält nur eine Spalte ("${onlyHeader.slice(0, 60)}${onlyHeader.length > 60 ? '…' : ''}"), obwohl mehrere Trennzeichen darin vorkommen.`,
        hint: 'Öffne die CSV-Datei in einem Texteditor und prüfe, ob als Trennzeichen Semikolon (;), Komma (,) oder Tabulator verwendet wird. Speichere ggf. neu mit Semikolon — das ist der CH-Standard.',
      });
    }
  }

  // Heuristik 2: Stark schwankende Anzahl Felder pro Zeile (deutet auf Quoting-Probleme hin)
  // Wir prüfen, ob non-null Felder in den ersten 100 Zeilen stark schwanken
  if (parseResult.rows.length > 5) {
    const sampleSize = Math.min(100, parseResult.rows.length);
    const fillCounts: number[] = [];
    for (let i = 0; i < sampleSize; i++) {
      const row = parseResult.rows[i];
      const filled = Object.values(row).filter((v) => v !== null && v !== '').length;
      fillCounts.push(filled);
    }
    const max = Math.max(...fillCounts);
    const min = Math.min(...fillCounts);
    // Wenn min < 25% des max bei mehrspaltigen Dateien → vermutlich Strukturproblem
    if (parseResult.headers.length >= 5 && min < max * 0.25 && min < 3) {
      findings.push({
        severity: 'warning',
        category: 'structure',
        title: 'Unregelmässige Zeilenstruktur',
        message: `Einige Zeilen enthalten deutlich weniger Felder als andere (Minimum: ${min}, Maximum: ${max} Felder).`,
        hint: 'Prüfe, ob in der Datei Zeilenumbrüche innerhalb von Feldern vorkommen oder Anführungszeichen falsch gesetzt sind.',
      });
    }
  }

  return findings;
}

/** Prüft fehlende und nahezu-leere Pflichtspalten */
function checkRequiredColumns(
  parseResult: ParseResult,
  expectedColumns: ColumnDefinition[]
): PreflightFinding[] {
  const findings: PreflightFinding[] = [];
  const headerSet = new Set(parseResult.headers);
  const requiredColumns = expectedColumns.filter((c) => c.required);

  // 1. Fehlende Pflichtspalten
  const missing = requiredColumns.filter((c) => !headerSet.has(c.name));
  if (missing.length > 0) {
    findings.push({
      severity: 'error',
      category: 'required-columns',
      title: `${missing.length} Pflichtspalte(n) fehlen`,
      message:
        'Diese Spalten werden zwingend für den Import benötigt, sind aber in der Datei nicht vorhanden.',
      affected: missing.map((c) => c.name),
      hint: 'Stelle sicher, dass beim Export aus LehrerOffice die Standard-Vorlage gewählt wurde. Im nächsten Schritt (Spalten-Check) siehst du Details.',
    });
  }

  // 2. Pflichtspalten, die existieren aber überwiegend leer sind (>90%)
  if (parseResult.rows.length >= 10) {
    const nearlyEmpty: string[] = [];
    for (const col of requiredColumns) {
      if (!headerSet.has(col.name)) continue; // schon als missing erfasst
      const emptyCount = parseResult.rows.filter((row) => {
        const v = row[col.name];
        return v === null || v === undefined || String(v).trim() === '';
      }).length;
      const emptyRatio = emptyCount / parseResult.rows.length;
      if (emptyRatio > 0.9) {
        nearlyEmpty.push(`${col.name} (${Math.round(emptyRatio * 100)}% leer)`);
      }
    }
    if (nearlyEmpty.length > 0) {
      findings.push({
        severity: 'warning',
        category: 'empty-columns',
        title: `${nearlyEmpty.length} Pflichtspalte(n) fast vollständig leer`,
        message:
          'Diese Spalten existieren, sind aber bei mehr als 90% der Zeilen leer. Das deutet meist auf ein Export-Problem hin.',
        affected: nearlyEmpty,
        hint: 'Prüfe in LehrerOffice, ob die Felder dort tatsächlich befüllt sind und beim Export berücksichtigt werden.',
      });
    }
  }

  return findings;
}

/**
 * Führt alle Pre-Flight-Checks aus.
 * @param parseResult - Bereits geparste Datei(en)
 * @param expectedColumns - Pflichtspalten-Definition für den gewählten Import-Typ
 *                          (kann leer sein, wenn der Typ noch keine Spalten-Defs hat)
 */
export function runPreflightCheck(
  parseResult: ParseResult,
  expectedColumns: ColumnDefinition[]
): PreflightResult {
  if (!parseResult.fileName || parseResult.headers.length === 0) {
    return { findings: [], hasErrors: false, hasWarnings: false };
  }

  const findings: PreflightFinding[] = [
    ...checkEncoding(parseResult),
    ...checkDelimiter(parseResult),
    ...checkRequiredColumns(parseResult, expectedColumns),
  ];

  return {
    findings,
    hasErrors: findings.some((f) => f.severity === 'error'),
    hasWarnings: findings.some((f) => f.severity === 'warning'),
  };
}
