import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ParsedRow, ValidationError, ColumnDefinition, ColumnStatus } from '@/types/importTypes';

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  fileName: string;
}

// Parse CSV or Excel file
export async function parseFile(file: File): Promise<ParseResult> {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSV(file);
  } else if (['xlsx', 'xls'].includes(extension || '')) {
    return parseExcel(file);
  } else {
    throw new Error('Nicht unterstütztes Dateiformat. Bitte CSV oder Excel-Datei hochladen.');
  }
}

async function parseCSV(file: File): Promise<ParseResult> {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    throw new Error('Die Datei ist leer.');
  }

  // Detect delimiter (semicolon or comma)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  
  // Parse CSV with proper handling of quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowData = parseCSVLine(lines[i]);
    if (rowData.some(cell => cell !== null && cell !== undefined && cell !== '')) {
      const row: ParsedRow = {};
      headers.forEach((header, idx) => {
        row[header] = rowData[idx] ?? null;
      });
      rows.push(row);
    }
  }

  return { headers, rows, fileName: file.name };
}

async function parseExcel(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    throw new Error('Die Datei ist leer.');
  }

  const headers: string[] = [];
  const rows: ParsedRow[] = [];
  
  // Get headers from first row
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim();
  });

  // Filter out empty trailing headers
  while (headers.length > 0 && headers[headers.length - 1] === '') {
    headers.pop();
  }

  // Get data rows
  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
    const row = worksheet.getRow(rowIndex);
    const rowData: (string | number | null)[] = [];
    let hasData = false;
    
    for (let colIndex = 1; colIndex <= headers.length; colIndex++) {
      const cell = row.getCell(colIndex);
      let value: string | number | null = null;
      
      if (cell.value !== null && cell.value !== undefined) {
        // Handle different cell types
        if (cell.type === ExcelJS.ValueType.Date && cell.value instanceof Date) {
          // Format date as DD.MM.YYYY
          const date = cell.value;
          value = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
        } else if (typeof cell.value === 'object' && 'result' in cell.value) {
          // Formula cell - use the result
          value = cell.value.result as string | number;
        } else if (typeof cell.value === 'object' && 'richText' in cell.value) {
          // Rich text - concatenate text parts
          value = (cell.value.richText as Array<{text: string}>).map(rt => rt.text).join('');
        } else {
          value = typeof cell.value === 'number' ? cell.value : String(cell.value);
        }
        hasData = true;
      }
      rowData.push(value);
    }
    
    if (hasData) {
      const parsedRow: ParsedRow = {};
      headers.forEach((header, idx) => {
        parsedRow[header] = rowData[idx] ?? null;
      });
      rows.push(parsedRow);
    }
  }

  return { headers, rows, fileName: file.name };
}

// Check column status (found, missing, extra)
export function checkColumnStatus(
  sourceHeaders: string[],
  expectedColumns: ColumnDefinition[]
): ColumnStatus[] {
  const statuses: ColumnStatus[] = [];
  const sourceHeadersSet = new Set(sourceHeaders);

  // Check expected columns
  expectedColumns.forEach(col => {
    const found = sourceHeadersSet.has(col.name);
    statuses.push({
      name: col.name,
      status: found ? 'found' : 'missing',
      required: col.required,
      category: col.category,
    });
  });

  // Check for extra columns
  const expectedNames = new Set(expectedColumns.map(c => c.name));
  sourceHeaders.forEach(header => {
    if (!expectedNames.has(header)) {
      statuses.push({
        name: header,
        status: 'extra',
        required: false,
      });
    }
  });

  return statuses;
}

// Fields that should be checked for duplicates
const DUPLICATE_CHECK_FIELDS = ['S_AHV', 'S_ID', 'L_KL1_AHV'];

// Configuration for parent ID consistency checks (Eltern-ID Konsistenzprüfung)
const PARENT_CONSISTENCY_CHECKS = [
  {
    idField: 'P_ERZ1_ID',
    ahvField: 'P_ERZ1_AHV',
    nameField: 'P_ERZ1_Name',
    vornameField: 'P_ERZ1_Vorname',
    strasseField: 'P_ERZ1_Strasse',
    telefonPrivatField: 'P_ERZ1_TelefonPrivat',
    telefonGeschaeftField: 'P_ERZ1_TelefonGeschaeft',
    mobilField: 'P_ERZ1_Mobil',
    label: 'Erziehungsberechtigte/r 1'
  },
  {
    idField: 'P_ERZ2_ID',
    ahvField: 'P_ERZ2_AHV',
    nameField: 'P_ERZ2_Name',
    vornameField: 'P_ERZ2_Vorname',
    strasseField: 'P_ERZ2_Strasse',
    telefonPrivatField: 'P_ERZ2_TelefonPrivat',
    telefonGeschaeftField: 'P_ERZ2_TelefonGeschaeft',
    mobilField: 'P_ERZ2_Mobil',
    label: 'Erziehungsberechtigte/r 2'
  }
];

// Normalize string by removing diacritical marks for comparison
function normalizeForComparison(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Normalize phone number by removing all non-digit characters
function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

// Count diacritical marks in a string (more = "richer")
function countDiacritics(value: string): number {
  const nfd = value.normalize('NFD');
  const stripped = nfd.replace(/[\u0300-\u036f]/g, '');
  return nfd.length - stripped.length;
}

// Name fields to check for diacritic inconsistencies
const DIACRITIC_NAME_FIELDS = [
  'S_Name', 'S_Vorname',
  'P_ERZ1_Name', 'P_ERZ1_Vorname',
  'P_ERZ2_Name', 'P_ERZ2_Vorname',
  'L_KL1_Name', 'L_KL1_Vorname',
];

// Check for names that match when normalized but differ by diacritics,
// and auto-correct to the version with more diacritical marks
function checkDiacriticNameInconsistencies(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of DIACRITIC_NAME_FIELDS) {
    // Group values by their normalized form
    const normalizedGroups = new Map<string, { original: string; rows: number[] }[]>();

    for (let i = 0; i < rows.length; i++) {
      const raw = String(rows[i][field] ?? '').trim();
      if (!raw) continue;
      const normalized = normalizeForComparison(raw);
      
      const group = normalizedGroups.get(normalized);
      if (group) {
        // Check if this exact original form already exists
        const existing = group.find(g => g.original === raw);
        if (existing) {
          existing.rows.push(i);
        } else {
          group.push({ original: raw, rows: [i] });
        }
      } else {
        normalizedGroups.set(normalized, [{ original: raw, rows: [i] }]);
      }
    }

    // For groups with multiple different original forms, pick the richest
    normalizedGroups.forEach(variants => {
      if (variants.length <= 1) return; // All identical

      // Find the variant with the most diacritics
      let best = variants[0];
      for (const v of variants) {
        if (countDiacritics(v.original) > countDiacritics(best.original)) {
          best = v;
        }
      }

      // Create corrections for all rows that don't have the best version
      for (const variant of variants) {
        if (variant.original === best.original) continue;
        for (const rowIndex of variant.rows) {
          errors.push({
            row: rowIndex + 1,
            column: field,
            value: variant.original,
            message: `Diakritische Korrektur: "${variant.original}" → "${best.original}"`,
            correctedValue: best.original,
            severity: 'warning',
          });
        }
      }
    });
  }

  return errors;
}

// Optimized: Check parent ID consistency - same parent should have same ID across all rows
// Uses a UNIFIED pool across ERZ1 and ERZ2 so cross-slot inconsistencies are detected
type MatchStrategy = 'ahv' | 'name_strasse' | 'name_only';

const STRATEGY_LABELS: Record<MatchStrategy, { label: string; reliability: string; warning?: string }> = {
  ahv: {
    label: 'AHV-Nummer',
    reliability: 'Hohe Zuverlässigkeit',
  },
  name_strasse: {
    label: 'Name + Vorname + Strasse',
    reliability: 'Mittlere Zuverlässigkeit',
    warning: '⚠ Namensgleichheit an derselben Adresse kann auf verschiedene Personen zutreffen (z.B. Vater und Sohn).',
  },
  name_only: {
    label: 'Name + Vorname',
    reliability: 'Tiefe Zuverlässigkeit',
    warning: '⚠ Nur Name und Vorname stimmen überein – gleichnamige, aber verschiedene Personen sind möglich. Bitte manuell prüfen!',
  },
};

function checkParentIdConsistency(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const errorSet = new Set<string>(); // Avoid duplicate error messages
  // Track which row+field combos were already matched by a higher-reliability strategy
  const resolvedByHigherStrategy = new Set<string>();

  // Single unified pool across all ERZ slots
  type ParentEntry = { id: string; firstRow: number; identifier: string; slotLabel: string };
  const parentMapByAhv = new Map<string, ParentEntry>();
  const parentMapByNameStrasse = new Map<string, ParentEntry>();

  const addError = (
    map: Map<string, ParentEntry>,
    key: string,
    displayIdentifier: string,
    strategy: MatchStrategy,
    id: string,
    rowIndex: number,
    idField: string,
    label: string
  ) => {
    const existing = map.get(key);
    
    if (existing) {
      if (existing.id !== id) {
        const errorKey = `${rowIndex + 1}:${idField}:${displayIdentifier}`;
        const rowFieldKey = `${rowIndex + 1}:${idField}`;
        
        // Skip if already reported by a more reliable strategy
        if (resolvedByHigherStrategy.has(rowFieldKey)) return;
        
        if (!errorSet.has(errorKey)) {
          errorSet.add(errorKey);
          
          // AHV and Name+Strasse both block lower-priority strategies (name-only)
          if (strategy === 'ahv' || strategy === 'name_strasse') {
            resolvedByHigherStrategy.add(rowFieldKey);
          }
          
          const strategyInfo = STRATEGY_LABELS[strategy];
          const warningPart = strategyInfo.warning ? `\n${strategyInfo.warning}` : '';
          
          errors.push({
            row: rowIndex + 1,
            column: idField,
            value: id,
            message: `Inkonsistente ID: Elternteil (${displayIdentifier}) hat in Zeile ${existing.firstRow} (${existing.slotLabel}) die ID '${existing.id}', aber hier (${label}) die ID '${id}' [Erkannt via: ${strategyInfo.label} – ${strategyInfo.reliability}]${warningPart}`,
            severity: strategy === 'name_only' ? 'warning' : undefined,
          });
        }
      }
    } else {
      map.set(key, { id, firstRow: rowIndex + 1, identifier: displayIdentifier, slotLabel: label });
    }
  };

  // Pass 1: AHV and Name+Strasse strategies (per ERZ slot)
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    for (const check of PARENT_CONSISTENCY_CHECKS) {
      const id = String(row[check.idField] ?? '').trim();
      const ahv = String(row[check.ahvField] ?? '').trim();
      const name = String(row[check.nameField] ?? '').trim();
      const vorname = String(row[check.vornameField] ?? '').trim();
      const strasse = String(row[check.strasseField] ?? '').trim();

      if (!id) continue;
      if (!ahv && (!name || !vorname)) continue;

      // Strategy 1: AHV (most reliable)
      if (ahv) {
        addError(parentMapByAhv, `AHV:${ahv}`, `AHV: ${ahv}`, 'ahv', id, rowIndex, check.idField, check.label);
      }

      // Strategy 2: Name + Vorname + Strasse (with diacritic normalization)
      if (name && vorname && strasse) {
        const key = `NAME_STRASSE:${normalizeForComparison(name)}|${normalizeForComparison(vorname)}|${normalizeForComparison(strasse)}`;
        addError(parentMapByNameStrasse, key, `${vorname} ${name}, ${strasse}`, 'name_strasse', id, rowIndex, check.idField, check.label);
      }
    }
  }

  // Pass 2: Name-only strategy – requires BOTH ERZ1 and ERZ2 names to match between rows
  // This reduces false positives from common names by requiring the full parent pair to match.
  type NameOnlyEntry = {
    erz1Id: string; erz2Id: string;
    firstRow: number;
    erz1Name: string; erz2Name: string;
  };
  const parentPairMap = new Map<string, NameOnlyEntry>();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const erz1 = PARENT_CONSISTENCY_CHECKS[0];
    const erz2 = PARENT_CONSISTENCY_CHECKS[1];

    const erz1Id = String(row[erz1.idField] ?? '').trim();
    const erz1Name = String(row[erz1.nameField] ?? '').trim();
    const erz1Vorname = String(row[erz1.vornameField] ?? '').trim();
    const erz2Id = String(row[erz2.idField] ?? '').trim();
    const erz2Name = String(row[erz2.nameField] ?? '').trim();
    const erz2Vorname = String(row[erz2.vornameField] ?? '').trim();

    // Both ERZ slots must have name+vorname and an ID
    if (!erz1Id || !erz1Name || !erz1Vorname) continue;
    if (!erz2Id || !erz2Name || !erz2Vorname) continue;

    // Build composite key from both parents' names (sorted to handle ERZ1/ERZ2 swaps)
    const pairA = `${normalizeForComparison(erz1Name)}|${normalizeForComparison(erz1Vorname)}`;
    const pairB = `${normalizeForComparison(erz2Name)}|${normalizeForComparison(erz2Vorname)}`;
    const sortedPairs = [pairA, pairB].sort();
    const compositeKey = `PAIR:${sortedPairs[0]}||${sortedPairs[1]}`;

    const displayName = `${erz1Vorname} ${erz1Name} & ${erz2Vorname} ${erz2Name}`;
    const existing = parentPairMap.get(compositeKey);

    if (existing) {
      // Check ERZ1 ID consistency
      for (const [currentId, field, label, existingId] of [
        [erz1Id, erz1.idField, erz1.label, existing.erz1Id],
        [erz2Id, erz2.idField, erz2.label, existing.erz2Id],
      ] as [string, string, string, string][]) {
        // Match IDs considering ERZ1/ERZ2 swap
        const matchesErz1 = currentId === existing.erz1Id;
        const matchesErz2 = currentId === existing.erz2Id;
        if (!matchesErz1 && !matchesErz2 && currentId !== existingId) {
          const rowFieldKey = `${rowIndex + 1}:${field}`;
          if (resolvedByHigherStrategy.has(rowFieldKey)) continue;

          const errorKey = `${rowIndex + 1}:${field}:${displayName}`;
          if (!errorSet.has(errorKey)) {
            errorSet.add(errorKey);
            const strategyInfo = STRATEGY_LABELS['name_only'];
            const warningPart = strategyInfo.warning ? `\n${strategyInfo.warning}` : '';
            errors.push({
              row: rowIndex + 1,
              column: field,
              value: currentId,
              message: `Inkonsistente ID: Elternpaar (${displayName}) hat in Zeile ${existing.firstRow} die ID '${existingId}', aber hier (${label}) die ID '${currentId}' [Erkannt via: ${strategyInfo.label} – ${strategyInfo.reliability}]${warningPart}`,
              severity: 'warning',
            });
          }
        }
      }
    } else {
      parentPairMap.set(compositeKey, {
        erz1Id, erz2Id,
        firstRow: rowIndex + 1,
        erz1Name: `${erz1Vorname} ${erz1Name}`,
        erz2Name: `${erz2Vorname} ${erz2Name}`,
      });
    }
  }

  // Pass 3: Single-parent name-only with address disambiguation
  // For parents where only ONE parent name matches (not the pair), check phone or other EB
  type SingleParentEntry = {
    id: string;
    firstRow: number;
    strasse: string;
    phoneNumbers: string[]; // normalized phone numbers
    otherErzNameKey: string; // normalized name|vorname of the OTHER parent in that row
    slotLabel: string;
    slotIndex: number; // 0 for ERZ1, 1 for ERZ2
  };
  const singleParentMap = new Map<string, SingleParentEntry[]>();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    for (let slotIndex = 0; slotIndex < PARENT_CONSISTENCY_CHECKS.length; slotIndex++) {
      const check = PARENT_CONSISTENCY_CHECKS[slotIndex];
      const otherCheck = PARENT_CONSISTENCY_CHECKS[1 - slotIndex];

      const id = String(row[check.idField] ?? '').trim();
      const name = String(row[check.nameField] ?? '').trim();
      const vorname = String(row[check.vornameField] ?? '').trim();
      const strasse = String(row[check.strasseField] ?? '').trim();

      if (!id || !name || !vorname) continue;

      // Skip if already resolved by higher strategy
      const rowFieldKey = `${rowIndex + 1}:${check.idField}`;
      if (resolvedByHigherStrategy.has(rowFieldKey)) continue;

      // Collect phone numbers for this parent
      const phones: string[] = [];
      for (const phoneField of [check.telefonPrivatField, check.telefonGeschaeftField, check.mobilField]) {
        const raw = normalizePhone(String(row[phoneField] ?? ''));
        if (raw.length >= 5) phones.push(raw); // only meaningful numbers
      }

      // Other parent's name key
      const otherName = String(row[otherCheck.nameField] ?? '').trim();
      const otherVorname = String(row[otherCheck.vornameField] ?? '').trim();
      const otherErzNameKey = (otherName && otherVorname)
        ? `${normalizeForComparison(otherName)}|${normalizeForComparison(otherVorname)}`
        : '';

      const nameKey = `${normalizeForComparison(name)}|${normalizeForComparison(vorname)}`;
      const entry: SingleParentEntry = {
        id, firstRow: rowIndex + 1, strasse,
        phoneNumbers: phones, otherErzNameKey,
        slotLabel: check.label, slotIndex,
      };

      const existing = singleParentMap.get(nameKey);
      if (existing) {
        // Compare against all previously seen entries with the same name
        for (const prev of existing) {
          if (prev.id === id) continue; // same ID, no inconsistency

          const rowFieldKeyCheck = `${rowIndex + 1}:${check.idField}`;
          if (resolvedByHigherStrategy.has(rowFieldKeyCheck)) continue;

          // Same address → already handled by Pass 1 (name+strasse strategy)
          if (strasse && prev.strasse && normalizeForComparison(strasse) === normalizeForComparison(prev.strasse)) continue;

          // Different address → disambiguate
          let isSamePerson = false;

          // Check 1: Any phone number matches?
          if (!isSamePerson && phones.length > 0 && prev.phoneNumbers.length > 0) {
            for (const p of phones) {
              if (prev.phoneNumbers.includes(p)) {
                isSamePerson = true;
                break;
              }
            }
          }

          // Check 2: Other EB matches?
          if (!isSamePerson && otherErzNameKey && prev.otherErzNameKey && otherErzNameKey === prev.otherErzNameKey) {
            isSamePerson = true;
          }

          if (isSamePerson) {
            const displayName = `${vorname} ${name}`;
            const errorKey = `${rowIndex + 1}:${check.idField}:${displayName}`;
            if (!errorSet.has(errorKey)) {
              errorSet.add(errorKey);
              const strategyInfo = STRATEGY_LABELS['name_only'];
              const warningPart = strategyInfo.warning ? `\n${strategyInfo.warning}` : '';
              errors.push({
                row: rowIndex + 1,
                column: check.idField,
                value: id,
                message: `Inkonsistente ID: Elternteil (${displayName}) hat in Zeile ${prev.firstRow} (${prev.slotLabel}) die ID '${prev.id}', aber hier (${check.label}) die ID '${id}' [Erkannt via: ${strategyInfo.label} – ${strategyInfo.reliability}]${warningPart}`,
                severity: 'warning',
              });
            }
          }
        }
        existing.push(entry);
      } else {
        singleParentMap.set(nameKey, [entry]);
      }
    }
  }

  return errors;
}

// ============================================================
// NAMENSWECHSEL-ERKENNUNG (Name Change Detection)
// ============================================================
// Detects potential name changes for parents (e.g., marriage, double names)
// WITHOUT relying on AHV numbers. Groups by student association + first name.
//
// Strategy (combined):
//   1. Group by student name (same Schüler → same household context)
//   2. Within a household group, find parents with same Vorname but different Nachname
//   3. Apply detectNameChange() to determine if it's a plausible name change
//
// Patterns detected by detectNameChange():
//   - Substring (Marina Ianuzi → Marina Ianuzi-Tadic)
//   - Reverse hyphenated (Doris Brunner → Doris Fliege-Brunner)
//   - Complete name change same first name (Heidi Müller → Heidi Meier) via fuzzy
//   - Fuzzy matching (Levenshtein distance) for similar names

// Compute Levenshtein distance between two strings
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

// Determine if two last names represent a plausible name change
// Returns the type of match or null
function detectNameChange(
  nameA: string,
  nameB: string
): 'hyphen_addition' | 'reverse_hyphen' | 'complete_change' | 'fuzzy' | null {
  const normA = normalizeForComparison(nameA);
  const normB = normalizeForComparison(nameB);

  if (normA === normB) return null; // identical → no change

  const partsA = normA.split('-');
  const partsB = normB.split('-');

  // Pattern 1: Substring (Marina Ianuzi → Marina Ianuzi-Tadic)
  if (normB.includes(normA) || normA.includes(normB)) return 'hyphen_addition';

  // Pattern 2: Shared hyphen component (Doris Brunner → Doris Fliege-Brunner)
  for (const pa of partsA) {
    for (const pb of partsB) {
      if (pa.length >= 3 && pa === pb) return 'reverse_hyphen';
    }
  }

  // Pattern 3 + 4: Complete name change or fuzzy match (same first name guaranteed by caller)
  // Use Levenshtein on the longest base part of each name
  const baseA = partsA[partsA.length - 1]; // last hyphen-segment
  const baseB = partsB[partsB.length - 1];
  const maxLen = Math.max(baseA.length, baseB.length);
  if (maxLen > 0) {
    const dist = levenshtein(baseA, baseB);
    const similarity = 1 - dist / maxLen;
    // Require ≥65% similarity to avoid false positives between common names
    // (e.g. Müller vs Brunner → ~28% → no match; Meier vs Maier → 80% → match)
    if (similarity >= 0.65) return 'complete_change';
    // Borderline fuzzy: only for very short names where 1-char diff is significant
    if (similarity >= 0.55 && maxLen <= 5) return 'fuzzy';
  }

  return null;
}

// Fields describing a student (used to build household context)
const STUDENT_NAME_FIELDS = { name: 'S_Name', vorname: 'S_Vorname' };

// Fields for each ERZ slot used in name change detection
const ERZ_NAME_CHANGE_FIELDS = [
  { nameField: 'P_ERZ1_Name', vornameField: 'P_ERZ1_Vorname', label: 'Erziehungsberechtigte/r 1' },
  { nameField: 'P_ERZ2_Name', vornameField: 'P_ERZ2_Vorname', label: 'Erziehungsberechtigte/r 2' },
];

type NameChangeType = 'hyphen_addition' | 'reverse_hyphen' | 'complete_change' | 'fuzzy';

const NAME_CHANGE_LABELS: Record<NameChangeType, string> = {
  hyphen_addition: 'Bindestrich-Ergänzung',
  reverse_hyphen: 'Umgekehrter Doppelname',
  complete_change: 'Möglicher Namenswechsel',
  fuzzy: 'Ähnlicher Name (unsicher)',
};

// Check for name changes in parents, grouped by student + first name (no AHV required)
function checkParentNameChanges(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const errorSet = new Set<string>();

  // Step 1: Group rows by student (S_Name + S_Vorname key)
  // Each student defines a "household context"
  const studentGroups = new Map<string, number[]>(); // studentKey → rowIndices

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sName = String(row[STUDENT_NAME_FIELDS.name] ?? '').trim();
    const sVorname = String(row[STUDENT_NAME_FIELDS.vorname] ?? '').trim();
    if (!sName || !sVorname) continue;
    const studentKey = `${normalizeForComparison(sName)}|${normalizeForComparison(sVorname)}`;
    const group = studentGroups.get(studentKey);
    if (group) {
      group.push(i);
    } else {
      studentGroups.set(studentKey, [i]);
    }
  }

  // Step 2: For each student group, check ERZ name changes across rows in that group
  // Then also do a cross-student pass: same Vorname across different students
  // Build a global map: erzVorname → [{rowIndex, nachname, label, studentKey}]
  type ErzEntry = { rowIndex: number; nachname: string; label: string; studentKey: string };
  const erzByVorname = new Map<string, ErzEntry[]>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sName = String(row[STUDENT_NAME_FIELDS.name] ?? '').trim();
    const sVorname = String(row[STUDENT_NAME_FIELDS.vorname] ?? '').trim();
    const studentKey = (sName && sVorname)
      ? `${normalizeForComparison(sName)}|${normalizeForComparison(sVorname)}`
      : `__noStudent_${i}`;

    for (const slot of ERZ_NAME_CHANGE_FIELDS) {
      const name = String(row[slot.nameField] ?? '').trim();
      const vorname = String(row[slot.vornameField] ?? '').trim();
      if (!name || !vorname) continue;

      const vornameKey = normalizeForComparison(vorname);
      const existing = erzByVorname.get(vornameKey);
      const entry: ErzEntry = { rowIndex: i, nachname: name, label: slot.label, studentKey };
      if (existing) {
        existing.push(entry);
      } else {
        erzByVorname.set(vornameKey, [entry]);
      }
    }
  }

  // Step 3: For each Vorname group, compare all pairs
  erzByVorname.forEach((entries) => {
    if (entries.length < 2) return;

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];

        // Only compare across same student group OR same Vorname in different groups
        // Skip comparing two entries from the exact same row (different ERZ slots same row)
        if (a.rowIndex === b.rowIndex) continue;

        // If both are from different students AND same Vorname → valid cross-student check
        // If from same student → also check (sibling context)
        const changeType = detectNameChange(a.nachname, b.nachname);
        if (!changeType) continue;

        // Emit warning for the LATER row (higher index)
        const laterEntry = a.rowIndex > b.rowIndex ? a : b;
        const earlierEntry = a.rowIndex > b.rowIndex ? b : a;

        const errorKey = `namechange:${laterEntry.rowIndex}:${laterEntry.label}:${normalizeForComparison(laterEntry.nachname)}:${normalizeForComparison(earlierEntry.nachname)}`;
        if (errorSet.has(errorKey)) continue;
        errorSet.add(errorKey);

        const changeLabel = NAME_CHANGE_LABELS[changeType];
        const row = rows[laterEntry.rowIndex];
        const sName = String(row[STUDENT_NAME_FIELDS.name] ?? '').trim();
        const sVorname = String(row[STUDENT_NAME_FIELDS.vorname] ?? '').trim();

        // Find the Vorname for the display (get the original from row)
        let displayVorname = '';
        for (const slot of ERZ_NAME_CHANGE_FIELDS) {
          if (slot.label === laterEntry.label) {
            displayVorname = String(row[slot.vornameField] ?? '').trim();
            break;
          }
        }

        // Find the column name for the name field
        let nameColumn = 'P_ERZ1_Name';
        for (const slot of ERZ_NAME_CHANGE_FIELDS) {
          if (slot.label === laterEntry.label) {
            nameColumn = slot.nameField;
            break;
          }
        }

        errors.push({
          row: laterEntry.rowIndex + 1,
          column: nameColumn,
          value: laterEntry.nachname,
          message: `Möglicher Namenswechsel (${changeLabel}): "${displayVorname} ${earlierEntry.nachname}" (Zeile ${earlierEntry.rowIndex + 1}) → "${displayVorname} ${laterEntry.nachname}" (${laterEntry.label}${sName ? `, Schüler/in: ${sVorname} ${sName}` : ''})\n⚠ Bitte manuell prüfen – automatische Korrektur nicht möglich (mögliche Heirat, Scheidung oder Doppelname).`,
          severity: 'warning',
        });
      }
    }
  });

  return errors;
}

// Validate data - Optimized for large datasets (4000+ rows)
export function validateData(
  rows: ParsedRow[],
  columnDefinitions: ColumnDefinition[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const rowCount = rows.length;

  // Build column lookup maps for O(1) access
  const columnDefMap = new Map<string, ColumnDefinition>();
  for (const col of columnDefinitions) {
    columnDefMap.set(col.name, col);
  }

  // First pass: collect values for duplicate detection using Maps
  const valueOccurrences = new Map<string, Map<string, number[]>>();
  for (const field of DUPLICATE_CHECK_FIELDS) {
    valueOccurrences.set(field, new Map());
  }

  // Single pass for both duplicate collection and field validation
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const row = rows[rowIndex];
    const rowNum = rowIndex + 1;

    // Collect duplicates for specified fields
    for (const field of DUPLICATE_CHECK_FIELDS) {
      const value = row[field];
      const strValue = String(value ?? '').trim();
      if (strValue !== '') {
        const fieldMap = valueOccurrences.get(field)!;
        const existing = fieldMap.get(strValue);
        if (existing) {
          existing.push(rowNum);
        } else {
          fieldMap.set(strValue, [rowNum]);
        }
      }
    }

    // Field-level validation
    for (const col of columnDefinitions) {
      const value = row[col.name];
      const strValue = String(value ?? '').trim();

      // Check required fields
      if (col.required && (value === null || value === undefined || strValue === '')) {
        errors.push({
          row: rowNum,
          column: col.name,
          value: '',
          message: `Pflichtfeld "${col.name}" ist leer`,
        });
        continue;
      }

      // Skip validation if empty and not required
      if (strValue === '') continue;

      // Type-specific validation
      const validationError = validateFieldType(col.validationType, strValue, rowNum, col.name);
      if (validationError) {
        errors.push(validationError);
      }
    }
  }

  // Process duplicates
  for (const field of DUPLICATE_CHECK_FIELDS) {
    const fieldMap = valueOccurrences.get(field)!;
    fieldMap.forEach((rowNumbers, value) => {
      if (rowNumbers.length > 1) {
        // Add error for each occurrence except the first
        for (let i = 1; i < rowNumbers.length; i++) {
          errors.push({
            row: rowNumbers[i],
            column: field,
            value: value,
            message: `Duplikat: "${value}" kommt auch in Zeile ${rowNumbers[0]} vor`,
          });
        }
      }
    });
  }

  // Check parent ID consistency
  const parentIdErrors = checkParentIdConsistency(rows);
  errors.push(...parentIdErrors);

  // Check diacritic name inconsistencies and auto-correct
  const diacriticErrors = checkDiacriticNameInconsistencies(rows);
  errors.push(...diacriticErrors);

  // Check for parent name changes (marriage, double names, etc.) – no AHV required
  const nameChangeErrors = checkParentNameChanges(rows);
  errors.push(...nameChangeErrors);

  return errors;
}

// Optimized field type validation
function validateFieldType(
  validationType: string | undefined,
  value: string,
  rowNum: number,
  columnName: string
): ValidationError | null {
  switch (validationType) {
    case 'date':
      if (!isValidDate(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültiges Datumsformat' };
      }
      break;
    case 'ahv':
      if (!isValidAHV(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültiges AHV-Format (756.XXXX.XXXX.XX)' };
      }
      break;
    case 'email':
      if (!isValidEmail(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültige E-Mail-Adresse' };
      }
      break;
    case 'number':
      if (isNaN(Number(value))) {
        return { row: rowNum, column: columnName, value, message: 'Ungültige Zahl' };
      }
      break;
    case 'plz':
      if (!isValidPLZ(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültige PLZ (4-5 Ziffern erwartet)' };
      }
      break;
    case 'gender':
      if (!isValidGender(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültiges Geschlecht (M, W oder D erwartet)' };
      }
      break;
    case 'phone':
      if (!isValidPhone(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültiges Telefonformat' };
      }
      break;
  }
  return null;
}

function isValidDate(value: string): boolean {
  // Accept various date formats and Excel serial numbers
  const patterns = [
    /^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY
    /^\d{4}-\d{2}-\d{2}$/,   // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
    /^\d+$/,                  // Excel serial number
  ];
  return patterns.some(p => p.test(value)) || !isNaN(Date.parse(value));
}

function isValidAHV(value: string): boolean {
  // Swiss AHV number format: 756.XXXX.XXXX.XX
  const pattern = /^756\.\d{4}\.\d{4}\.\d{2}$/;
  return pattern.test(value);
}

function isValidEmail(value: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(value);
}

function isValidPLZ(value: string): boolean {
  // Accept 4-5 digit postal codes (CH: 4 digits, DE/AT: 5 digits)
  const pattern = /^\d{4,5}$/;
  return pattern.test(value.replace(/\s/g, ''));
}

function isValidGender(value: string): boolean {
  // Accept M, W, D (case-insensitive) and common variations
  const normalized = value.toUpperCase().trim();
  const validValues = ['M', 'W', 'D', 'MÄNNLICH', 'WEIBLICH', 'DIVERS', 'MALE', 'FEMALE', 'DIVERSE'];
  return validValues.includes(normalized);
}

function isValidPhone(value: string): boolean {
  // Remove all whitespace, dashes, parentheses for validation
  const cleaned = value.replace(/[\s\-\(\)\.\/]/g, '');
  
  // International format patterns (E.164 and common variations)
  const patterns = [
    /^\+\d{7,15}$/,           // +41791234567 (E.164)
    /^00\d{7,15}$/,           // 0041791234567
    /^0\d{8,10}$/,            // 0791234567 (national format)
    /^\d{10,11}$/,            // 0791234567 without leading 0 check
  ];
  
  return patterns.some(p => p.test(cleaned));
}

// Apply corrections to rows
export function applyCorrectedValues(
  rows: ParsedRow[],
  errors: ValidationError[]
): ParsedRow[] {
  const correctedRows = rows.map(row => ({ ...row }));
  
  errors.forEach(error => {
    if (error.correctedValue !== undefined) {
      const rowIndex = error.row - 1;
      if (correctedRows[rowIndex]) {
        correctedRows[rowIndex][error.column] = error.correctedValue;
      }
    }
  });

  return correctedRows;
}

// Build a lookup map for corrections from validation errors
function buildCorrectionMap(errors: ValidationError[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of errors) {
    if (e.correctedValue !== undefined) {
      map.set(`${e.row}:${e.column}`, String(e.correctedValue));
    }
  }
  return map;
}

// Export to CSV - keeps original column names
export function exportToCSV(
  rows: ParsedRow[],
  headers: string[],
  importType: string,
  options: {
    onlyErrorFree?: boolean;
    errors?: ValidationError[];
    removeExtraColumns?: boolean;
    expectedColumns?: string[];
  } = {}
): void {
  const { onlyErrorFree = false, errors = [], removeExtraColumns = false, expectedColumns = [] } = options;
  const correctionMap = buildCorrectionMap(errors);

  // Filter rows if onlyErrorFree, keeping track of original row numbers
  let exportRowsWithIndex: { row: ParsedRow; rowNum: number }[] = rows.map((r, i) => ({ row: r, rowNum: i + 1 }));
  if (onlyErrorFree && errors.length > 0) {
    const errorRows = new Set(errors.filter(e => !e.correctedValue).map(e => e.row));
    exportRowsWithIndex = exportRowsWithIndex.filter(({ rowNum }) => !errorRows.has(rowNum));
  }

  // Determine which headers to use
  let exportHeaders = headers;
  if (removeExtraColumns && expectedColumns.length > 0) {
    const expectedSet = new Set(expectedColumns);
    exportHeaders = headers.filter(h => expectedSet.has(h));
  }

  // Build CSV content with semicolon delimiter for Excel compatibility
  const escapeCSVValue = (val: string): string => {
    if (val.includes('"') || val.includes(';') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines: string[] = [];
  csvLines.push(exportHeaders.map(escapeCSVValue).join(';'));
  
  exportRowsWithIndex.forEach(({ row, rowNum }) => {
    const values = exportHeaders.map(header => {
      // Apply correction if available
      const corrected = correctionMap.get(`${rowNum}:${header}`);
      if (corrected !== undefined) return escapeCSVValue(corrected);
      const value = row[header];
      return escapeCSVValue(value !== null && value !== undefined ? String(value) : '');
    });
    csvLines.push(values.join(';'));
  });

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${importType}_${date}_bereinigt.csv`;

  // Export with UTF-8 BOM for Excel compatibility
  const csvContent = csvLines.join('\r\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, fileName);
}

// Export to Excel - keeps original column names
export async function exportToExcel(
  rows: ParsedRow[],
  headers: string[],
  importType: string,
  options: {
    onlyErrorFree?: boolean;
    errors?: ValidationError[];
    removeExtraColumns?: boolean;
    expectedColumns?: string[];
  } = {}
): Promise<void> {
  const { onlyErrorFree = false, errors = [], removeExtraColumns = false, expectedColumns = [] } = options;
  const correctionMap = buildCorrectionMap(errors);

  // Filter rows if onlyErrorFree, keeping track of original row numbers
  let exportRowsWithIndex: { row: ParsedRow; rowNum: number }[] = rows.map((r, i) => ({ row: r, rowNum: i + 1 }));
  if (onlyErrorFree && errors.length > 0) {
    const errorRows = new Set(errors.filter(e => !e.correctedValue).map(e => e.row));
    exportRowsWithIndex = exportRowsWithIndex.filter(({ rowNum }) => !errorRows.has(rowNum));
  }

  // Determine which headers to use
  let exportHeaders = headers;
  if (removeExtraColumns && expectedColumns.length > 0) {
    const expectedSet = new Set(expectedColumns);
    exportHeaders = headers.filter(h => expectedSet.has(h));
  }

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daten');

  // Add header row
  worksheet.addRow(exportHeaders);

  // Add data rows with corrections applied
  exportRowsWithIndex.forEach(({ row, rowNum }) => {
    const values = exportHeaders.map(header => {
      const corrected = correctionMap.get(`${rowNum}:${header}`);
      if (corrected !== undefined) return corrected;
      const value = row[header];
      return value !== null && value !== undefined ? String(value) : '';
    });
    worksheet.addRow(values);
  });

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${importType}_${date}_bereinigt.xlsx`;

  // Export
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, fileName);
}
