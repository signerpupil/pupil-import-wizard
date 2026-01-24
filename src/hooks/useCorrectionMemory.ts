import { useState, useCallback } from 'react';
import type { ImportType, ParsedRow, ValidationError } from '@/types/importTypes';
import type { 
  CorrectionRule, 
  CorrectionRulesFile, 
  AppliedCorrection,
  CorrectionStats 
} from '@/types/correctionTypes';

const STORAGE_KEY_PREFIX = 'pupil-wizard-corrections-';
const FILE_VERSION = '1.0';

/**
 * Generate a unique ID for a correction rule
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Hook for managing correction memory (localStorage + file export/import)
 */
export function useCorrectionMemory(importType: ImportType) {
  const [rules, setRules] = useState<CorrectionRule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const storageKey = `${STORAGE_KEY_PREFIX}${importType}`;

  /**
   * Load correction rules from localStorage
   */
  const loadFromLocalStorage = useCallback((): CorrectionRule[] => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as CorrectionRule[];
        setRules(parsed);
        return parsed;
      }
    } catch (err) {
      console.error('Failed to load corrections from localStorage:', err);
      setError('Fehler beim Laden der gespeicherten Korrekturen');
    }
    return [];
  }, [storageKey]);

  /**
   * Save correction rules to localStorage
   */
  const saveToLocalStorage = useCallback((rulesToSave: CorrectionRule[]): void => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(rulesToSave));
      setRules(rulesToSave);
      setError(null);
    } catch (err) {
      console.error('Failed to save corrections to localStorage:', err);
      setError('Fehler beim Speichern der Korrekturen');
    }
  }, [storageKey]);

  /**
   * Clear all rules from localStorage
   */
  const clearLocalStorage = useCallback((): void => {
    try {
      localStorage.removeItem(storageKey);
      setRules([]);
      setError(null);
    } catch (err) {
      console.error('Failed to clear localStorage:', err);
    }
  }, [storageKey]);

  /**
   * Load correction rules from an uploaded JSON file
   */
  const loadFromFile = useCallback(async (file: File): Promise<CorrectionRule[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as CorrectionRulesFile;

      // Validate file format
      if (!parsed.version || !parsed.rules || !Array.isArray(parsed.rules)) {
        throw new Error('Ungültiges Dateiformat');
      }

      // Validate import type matches
      if (parsed.importType !== importType) {
        throw new Error(`Die Datei enthält Korrekturen für "${parsed.importType}", aber Sie haben "${importType}" ausgewählt.`);
      }

      setRules(parsed.rules);
      setIsLoading(false);
      return parsed.rules;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Lesen der Datei';
      setError(errorMessage);
      setIsLoading(false);
      throw new Error(errorMessage);
    }
  }, [importType]);

  /**
   * Export correction rules to a JSON file
   */
  const exportToFile = useCallback((rulesToExport: CorrectionRule[], sourceFileName?: string): void => {
    const fileContent: CorrectionRulesFile = {
      version: FILE_VERSION,
      exportedAt: new Date().toISOString(),
      exportedFrom: sourceFileName || 'unknown',
      importType,
      rules: rulesToExport,
    };

    const blob = new Blob([JSON.stringify(fileContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `korrektur-regeln_${importType}_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [importType]);

  /**
   * Create a new correction rule from a manual correction
   */
  const createRuleFromCorrection = useCallback((
    column: string,
    originalValue: string,
    correctedValue: string,
    identifierColumn?: string,
    identifierValue?: string
  ): CorrectionRule => {
    const rule: CorrectionRule = {
      id: generateId(),
      column,
      originalValue,
      correctedValue,
      matchType: identifierColumn && identifierValue ? 'identifier' : 'exact',
      identifierColumn,
      identifierValue,
      importType,
      createdAt: new Date().toISOString(),
      appliedCount: 0,
    };
    return rule;
  }, [importType]);

  /**
   * Add a new rule to the current set
   */
  const addRule = useCallback((rule: CorrectionRule): void => {
    setRules(prev => {
      // Check for duplicates (same column and original value)
      const existingIndex = prev.findIndex(
        r => r.column === rule.column && r.originalValue === rule.originalValue
      );
      
      if (existingIndex >= 0) {
        // Update existing rule
        const updated = [...prev];
        updated[existingIndex] = { ...rule, id: prev[existingIndex].id };
        return updated;
      }
      
      return [...prev, rule];
    });
  }, []);

  /**
   * Remove a rule by ID
   */
  const removeRule = useCallback((ruleId: string): void => {
    setRules(prev => prev.filter(r => r.id !== ruleId));
  }, []);

  /**
   * Apply correction rules to data rows and return corrections
   */
  const applyRulesToData = useCallback((
    rulesToApply: CorrectionRule[],
    rows: ParsedRow[],
    errors: ValidationError[]
  ): { corrections: AppliedCorrection[]; stats: CorrectionStats } => {
    const corrections: AppliedCorrection[] = [];
    const usedRuleIds = new Set<string>();
    const byColumn: Record<string, number> = {};

    for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
      const row = rows[rowIndex];
      const rowNumber = rowIndex + 1;

      for (const rule of rulesToApply) {
        const cellValue = row[rule.column];
        const cellValueStr = cellValue !== undefined && cellValue !== null 
          ? String(cellValue) 
          : '';

        // Check if there's an error for this cell with matching original value
        const hasMatchingError = errors.some(
          e => e.row === rowNumber && 
               e.column === rule.column && 
               e.value === rule.originalValue &&
               !e.correctedValue
        );

        // Only apply if there's an error or the value matches and needs correction
        if (cellValueStr === rule.originalValue) {
          let shouldApply = false;

          if (rule.matchType === 'exact') {
            // Exact match: apply if column and value match
            shouldApply = true;
          } else if (rule.matchType === 'identifier' && rule.identifierColumn && rule.identifierValue) {
            // Identifier match: check if the identifier matches
            const identifierCellValue = row[rule.identifierColumn];
            const identifierStr = identifierCellValue !== undefined && identifierCellValue !== null
              ? String(identifierCellValue)
              : '';
            shouldApply = identifierStr === rule.identifierValue;
          }

          if (shouldApply && (hasMatchingError || cellValueStr === rule.originalValue)) {
            corrections.push({
              row: rowNumber,
              column: rule.column,
              originalValue: rule.originalValue,
              correctedValue: rule.correctedValue,
              ruleId: rule.id,
            });

            usedRuleIds.add(rule.id);
            byColumn[rule.column] = (byColumn[rule.column] || 0) + 1;
          }
        }
      }
    }

    return {
      corrections,
      stats: {
        totalApplied: corrections.length,
        byColumn,
        rulesUsed: Array.from(usedRuleIds),
      },
    };
  }, []);

  /**
   * Get the count of rules in localStorage without loading them
   */
  const getLocalStorageCount = useCallback((): number => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as CorrectionRule[];
        return parsed.length;
      }
    } catch {
      // Ignore errors
    }
    return 0;
  }, [storageKey]);

  /**
   * Check if localStorage has any rules
   */
  const hasLocalStorageRules = useCallback((): boolean => {
    return getLocalStorageCount() > 0;
  }, [getLocalStorageCount]);

  return {
    rules,
    setRules,
    isLoading,
    error,
    loadFromLocalStorage,
    saveToLocalStorage,
    clearLocalStorage,
    loadFromFile,
    exportToFile,
    createRuleFromCorrection,
    addRule,
    removeRule,
    applyRulesToData,
    getLocalStorageCount,
    hasLocalStorageRules,
  };
}
