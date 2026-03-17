import type { ParsedRow, ValidationError } from '@/types/importTypes';

/**
 * Represents a "person" within an ID conflict group — identified by name+vorname.
 */
export interface ConflictPerson {
  name: string;
  vorname: string;
  rowNumbers: number[];
  /** Additional identity info for display */
  ahv?: string;
  geburtsdatum?: string;
}

/**
 * A single ID conflict group: one ID value shared by multiple different persons.
 */
export interface IdConflictGroup {
  idField: string;       // e.g. "S_ID"
  idValue: string;       // the conflicting value
  persons: ConflictPerson[];
  pattern: IdConflictPattern;
  /** Rows where the ID should be replaced (minority/placeholder) */
  resolvableRows: number[];
  /** The person who likely "owns" the ID (majority) */
  ownerPerson?: ConflictPerson;
  /** Map of row number → replacement ID for resolvable rows */
  suggestedReplacements: Map<number, string>;
}

export type IdConflictPattern =
  | 'placeholder'   // ID is a known placeholder (0, 999, -1, etc.)
  | 'majority'      // One person has clearly more rows than others
  | 'manual';       // No clear pattern, requires manual resolution

// Known placeholder values that schools commonly use
const PLACEHOLDER_VALUES = new Set([
  '0', '00', '000', '0000', '00000', '000000',
  '-1', '-', '--', '?', '??', '???',
  '999', '9999', '99999', '999999',
  '1', 'x', 'xx', 'xxx', 'n/a', 'na', 'tbd',
  'test', 'temp', 'neu', 'new', 'dummy',
]);

/**
 * Analyze ID conflict errors and group them into resolvable patterns.
 */
export function analyzeIdConflicts(
  errors: ValidationError[],
  rows: ParsedRow[]
): IdConflictGroup[] {
  // Collect only uncorrected id_conflict errors
  const conflictErrors = errors.filter(
    e => e.type === 'id_conflict' && e.correctedValue === undefined
  );

  if (conflictErrors.length === 0) return [];

  // Group by field + value
  const groupMap = new Map<string, { field: string; value: string; errorRows: number[] }>();

  for (const err of conflictErrors) {
    const key = `${err.column}::${err.value}`;
    if (!groupMap.has(key)) {
      // Extract the "original" row from the error message
      const origRowMatch = err.message.match(/Zeile\s+(\d+)/);
      const origRow = origRowMatch ? parseInt(origRowMatch[1]) : null;
      const initial: number[] = origRow ? [origRow] : [];
      groupMap.set(key, { field: err.column, value: err.value, errorRows: initial });
    }
    const g = groupMap.get(key)!;
    if (!g.errorRows.includes(err.row)) {
      g.errorRows.push(err.row);
    }
  }

  const result: IdConflictGroup[] = [];

  for (const { field, value, errorRows } of groupMap.values()) {
    // Identify persons by name+vorname
    const { nameField, vornameField, ahvField, gebField } = getIdentityFields(field);
    const personMap = new Map<string, ConflictPerson>();

    for (const rowNum of errorRows) {
      const row = rows[rowNum - 1];
      if (!row) continue;

      const name = String(row[nameField] ?? '').trim();
      const vorname = String(row[vornameField] ?? '').trim();
      const personKey = `${name.toLowerCase()}|${vorname.toLowerCase()}`;

      if (!personMap.has(personKey)) {
        personMap.set(personKey, {
          name,
          vorname,
          rowNumbers: [],
          ahv: ahvField ? String(row[ahvField] ?? '').trim() || undefined : undefined,
          geburtsdatum: gebField ? String(row[gebField] ?? '').trim() || undefined : undefined,
        });
      }
      personMap.get(personKey)!.rowNumbers.push(rowNum);
    }

    const persons = Array.from(personMap.values());
    if (persons.length < 2) continue; // Not actually a conflict

    // Classify pattern
    const pattern = classifyConflict(value, persons);

    // Determine resolvable rows and generate replacement IDs
    let resolvableRows: number[] = [];
    let ownerPerson: ConflictPerson | undefined;
    const suggestedReplacements = new Map<number, string>();

    if (pattern === 'placeholder') {
      // All rows have a placeholder ID → generate new IDs for each person
      resolvableRows = errorRows;
      // Group rows by person, assign each person a unique suffix
      let suffixCounter = 1;
      for (const person of persons) {
        const newId = generateReplacementId(value, suffixCounter);
        for (const rowNum of person.rowNumbers) {
          suggestedReplacements.set(rowNum, newId);
        }
        suffixCounter++;
      }
    } else if (pattern === 'majority') {
      // Sort by occurrence count descending
      const sorted = [...persons].sort((a, b) => b.rowNumbers.length - a.rowNumbers.length);
      ownerPerson = sorted[0];
      // Generate new IDs for all non-majority persons
      resolvableRows = sorted.slice(1).flatMap(p => p.rowNumbers);
      let suffixCounter = 1;
      for (const person of sorted.slice(1)) {
        const newId = generateReplacementId(value, suffixCounter);
        for (const rowNum of person.rowNumbers) {
          suggestedReplacements.set(rowNum, newId);
        }
        suffixCounter++;
      }
    }
    // 'manual' → resolvableRows stays empty

    result.push({
      idField: field,
      idValue: value,
      persons,
      pattern,
      resolvableRows,
      ownerPerson,
      suggestedReplacements,
    });
  }

  // Sort: placeholder first, then majority, then manual. Within each, by count descending.
  const patternOrder: Record<IdConflictPattern, number> = { placeholder: 0, majority: 1, manual: 2 };
  result.sort((a, b) => {
    const po = patternOrder[a.pattern] - patternOrder[b.pattern];
    if (po !== 0) return po;
    return b.resolvableRows.length - a.resolvableRows.length;
  });

  return result;
}

/**
 * Generate a replacement ID by appending a suffix like _D01, _D02, etc.
 */
function generateReplacementId(originalId: string, index: number): string {
  const suffix = `_D${String(index).padStart(2, '0')}`;
  return `${originalId}${suffix}`;
}

/**
 * Classify a conflict into a pattern type.
 */
function classifyConflict(idValue: string, persons: ConflictPerson[]): IdConflictPattern {
  // Check for placeholder
  if (PLACEHOLDER_VALUES.has(idValue.toLowerCase())) {
    return 'placeholder';
  }

  // Check for majority: one person has ≥3x more rows than any other
  const sorted = [...persons].sort((a, b) => b.rowNumbers.length - a.rowNumbers.length);
  const majority = sorted[0].rowNumbers.length;
  const secondMost = sorted[1].rowNumbers.length;

  if (majority >= 3 && majority >= secondMost * 2) {
    return 'majority';
  }

  // If majority has at least 2 more rows
  if (majority >= secondMost + 2) {
    return 'majority';
  }

  return 'manual';
}

/**
 * Get the identity field names for a given ID field.
 */
function getIdentityFields(idField: string): {
  nameField: string;
  vornameField: string;
  ahvField: string | null;
  gebField: string | null;
} {
  if (idField === 'S_ID' || idField === 'S_AHV') {
    return {
      nameField: 'S_Name',
      vornameField: 'S_Vorname',
      ahvField: idField === 'S_ID' ? 'S_AHV' : 'S_ID',
      gebField: 'S_Geburtsdatum',
    };
  } else if (idField === 'P_ERZ1_ID' || idField === 'P_ERZ1_AHV') {
    return {
      nameField: 'P_ERZ1_Name',
      vornameField: 'P_ERZ1_Vorname',
      ahvField: idField === 'P_ERZ1_ID' ? 'P_ERZ1_AHV' : 'P_ERZ1_ID',
      gebField: null,
    };
  } else if (idField === 'P_ERZ2_ID' || idField === 'P_ERZ2_AHV') {
    return {
      nameField: 'P_ERZ2_Name',
      vornameField: 'P_ERZ2_Vorname',
      ahvField: idField === 'P_ERZ2_ID' ? 'P_ERZ2_AHV' : 'P_ERZ2_ID',
      gebField: null,
    };
  } else if (idField === 'L_KL1_AHV') {
    return {
      nameField: 'L_KL1_Name',
      vornameField: 'L_KL1_Vorname',
      ahvField: null,
      gebField: null,
    };
  }
  return { nameField: '', vornameField: '', ahvField: null, gebField: null };
}

/**
 * Summary statistics for display.
 */
export function getConflictSummary(groups: IdConflictGroup[]) {
  const byPattern = {
    placeholder: groups.filter(g => g.pattern === 'placeholder'),
    majority: groups.filter(g => g.pattern === 'majority'),
    manual: groups.filter(g => g.pattern === 'manual'),
  };

  const totalResolvable = groups.reduce((sum, g) => sum + g.resolvableRows.length, 0);
  const totalManual = groups.filter(g => g.pattern === 'manual')
    .reduce((sum, g) => sum + g.persons.flatMap(p => p.rowNumbers).length, 0);

  return {
    totalGroups: groups.length,
    totalResolvable,
    totalManual,
    byPattern,
  };
}
