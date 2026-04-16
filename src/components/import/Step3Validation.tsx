import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, CheckCircle, Edit2, Save, Zap, Loader2, ChevronLeft, ChevronRight, X, Cpu, AlertTriangle, Copy, Users, Search, ChevronDown, ChevronUp, UserCog, Phone, Hash, Mail, MapPin, User, CalendarDays, CreditCard, ArrowRight, Scissors, Info, Languages, Globe, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NavigationButtons } from './NavigationButtons';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { ValidationError, ParsedRow } from '@/types/importTypes';
import { VALID_BISTA_LANGUAGES, VALID_NATIONALITIES } from '@/lib/fileParser';
import { useValidationWorker } from '@/hooks/useValidationWorker';
import { 
  applyLocalCorrection,
  analyzeErrorsLocally,
  type LocalSuggestion,
  formatSwissPhone,
  formatAHV,
  formatSwissPLZ,
  formatEmail,
  convertExcelDate,
  formatGender
} from '@/lib/localBulkCorrections';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { IdConflictBatchCard } from './IdConflictBatchCard';
import { SiblingInconsistencyCard } from './SiblingInconsistencyCard';
import { StudentDeduplicationCard } from './StudentDeduplicationCard';
import { StudentParentOverlapCard } from './StudentParentOverlapCard';
import { NameChangeCard, type NameChangeEntry } from './NameChangeCard';
import { ParentConsolidationCard, type ParentIdInconsistencyGroup } from './ParentConsolidationCard';
import { BulkCorrectionCard } from './BulkCorrectionCard';
import { ErrorTable } from './ErrorTable';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { trackEvent } from '@/lib/analytics';
import { summarizeForTelemetry, isUnmappedEmpty, isPatternsEmpty } from '@/lib/telemetryCollectors';

import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';

// ParentIdInconsistencyGroup type is now imported from ParentConsolidationCard

interface Step3ValidationProps {
  errors: ValidationError[];
  rows: ParsedRow[];
  onErrorCorrect: (rowIndex: number, column: string, value: string, correctionType?: 'manual' | 'bulk' | 'auto') => void;
  onBulkCorrect: (corrections: { row: number; column: string; value: string }[], correctionType?: 'bulk' | 'auto') => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step3Validation({
  errors,
  rows,
  onErrorCorrect,
  onBulkCorrect,
  onBack,
  onNext,
}: Step3ValidationProps) {
  const [localSuggestions, setLocalSuggestions] = useState<LocalSuggestion[]>([]);
  const [stepByStepMode, setStepByStepMode] = useState(false);
  const stepByStepRef = useRef<HTMLDivElement>(null);
  const [currentErrorIndex, setCurrentErrorIndex] = useState(0);
  const [stepEditValue, setStepEditValue] = useState('');
  const [filteredErrorRows, setFilteredErrorRows] = useState<number[] | null>(null);
  const [filteredErrorColumn, setFilteredErrorColumn] = useState<string | null>(null);
  const [showAllOtherDifferences, setShowAllOtherDifferences] = useState(false);
  const [analysisTime, setAnalysisTime] = useState<number | null>(null);
  const [hasRunAnalysis, setHasRunAnalysis] = useState(false);
  const [previousUncorrectedCount, setPreviousUncorrectedCount] = useState<number | null>(null);
  const isAutoFixingRef = useRef(false);
  const validationTrackedRef = useRef(false);

  // Telemetry: send aggregated error counts once per Step3 entry (no values).
  useEffect(() => {
    if (validationTrackedRef.current) return;
    if (rows.length === 0) return;
    validationTrackedRef.current = true;
    const errorsByType: Record<string, number> = {};
    const errorsByColumn: Record<string, number> = {};
    for (const e of errors) {
      const type = e.type || 'unknown';
      errorsByType[type] = (errorsByType[type] ?? 0) + 1;
      errorsByColumn[e.column] = (errorsByColumn[e.column] ?? 0) + 1;
    }
    trackEvent({
      event_type: 'validation_completed',
      step_number: 3,
      payload: {
        row_count_bucket:
          rows.length < 100 ? '<100'
          : rows.length < 500 ? '100-500'
          : rows.length < 1000 ? '500-1000'
          : rows.length < 3000 ? '1000-3000' : '>3000',
        total_errors: errors.length,
        error_count_by_type: errorsByType,
        // top 10 columns to keep payload small
        top_error_columns: Object.fromEntries(
          Object.entries(errorsByColumn).sort((a, b) => b[1] - a[1]).slice(0, 10),
        ),
      },
    });

    // Additional telemetry: unmapped raw values (whitelisted columns only)
    // and anonymised pattern masks for all other columns.
    try {
      const { unmapped, patterns } = summarizeForTelemetry(errors);
      if (!isUnmappedEmpty(unmapped)) {
        trackEvent({
          event_type: 'unmapped_value',
          step_number: 3,
          payload: unmapped as unknown as Record<string, unknown>,
        });
      }
      if (!isPatternsEmpty(patterns)) {
        trackEvent({
          event_type: 'unfixed_pattern',
          step_number: 3,
          payload: patterns as unknown as Record<string, unknown>,
        });
      }
    } catch {
      // never break the wizard for telemetry
    }
  }, [errors, rows.length]);
  

  // Language dropdown state for step-by-step modal
  const LANGUAGE_COLUMNS = new Set(['S_Muttersprache', 'S_Umgangssprache']);
  const BISTA_LANGUAGES_SORTED = useMemo(() => [...VALID_BISTA_LANGUAGES].sort((a, b) => a.localeCompare(b, 'de')), []);
  const NATIONALITY_COLUMNS = new Set(['S_Nationalitaet']);
  const NATIONALITIES_SORTED = useMemo(() => [...VALID_NATIONALITIES].sort((a, b) => a.localeCompare(b, 'de')), []);
  const [nationalitySearch, setNationalitySearch] = useState<string | null>(null);

  const { toast } = useToast();

  // Auto-scroll to step-by-step card when activated
  useEffect(() => {
    if (stepByStepMode && currentError && stepByStepRef.current) {
      stepByStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [stepByStepMode]);
  
  // Web Worker for background processing
  const { isProcessing: isAnalyzing, error: workerError } = useValidationWorker();

  /**
   * Generic staleness check: hides errors whose underlying data has changed
   * since the initial validation. Covers ID conflicts, duplicates, parent
   * consolidation, PLZ↔Ort mismatches and sibling inconsistencies.
   */
  const isErrorStillValid = useCallback((error: ValidationError): boolean => {
    const currentRow = rows[error.row - 2];
    if (!currentRow) return false;

    // --- 1. Generic value-changed check (covers ID conflicts, duplicates, format errors) ---
    // If the cell value changed since the error was recorded, the error is stale.
    if (error.column && error.value !== undefined) {
      const currentValue = String(currentRow[error.column] ?? '').trim();
      const errorValue = String(error.value).trim();
      if (currentValue !== errorValue) return false;
    }

    // --- 2. Geschwister-Inkonsistenz: live re-check against current rows ---
    if (error.message.includes('Geschwister-Inkonsistenz')) {
      const match = error.message.match(/von\s+(P_ERZ\d_ID)="([^"]+)"/);
      if (!match) return false;
      const [, idField, parentId] = match;
      if (String(currentRow[idField] ?? '').trim() !== parentId) return false;

      const familyRows = rows.filter(row => String(row[idField] ?? '').trim() === parentId);
      if (familyRows.length < 2) return false;

      const valueCounts = new Map<string, number>();
      for (const row of familyRows) {
        const value = String(row[error.column] ?? '').trim();
        if (!value) continue;
        valueCounts.set(value, (valueCounts.get(value) ?? 0) + 1);
      }
      if (valueCounts.size <= 1) return false;

      let majorityValue = '';
      let maxCount = 0;
      for (const [value, count] of valueCounts.entries()) {
        if (count > maxCount) { majorityValue = value; maxCount = count; }
      }
      const currentValue = String(currentRow[error.column] ?? '').trim();
      return currentValue !== '' && currentValue !== majorityValue;
    }

    // --- 3. Inkonsistente ID (parent consolidation): check if the two IDs still differ ---
    if (error.message.includes('Inkonsistente ID:')) {
      // The error reports that row X has a different ID than an earlier row for the same parent.
      // If the current value now matches the "correct" ID mentioned in the message, it's resolved.
      const idMatch = error.message.match(/Inkonsistente ID:\s*"([^"]+)"/);
      if (idMatch) {
        const reportedConflictId = idMatch[1];
        const currentValue = String(currentRow[error.column] ?? '').trim();
        // Error was: this row has a different ID. If it changed away from the conflict value, it's resolved.
        if (currentValue !== reportedConflictId) return false;
      }
    }

    // --- 4. PLZ↔Ort mismatch: check if PLZ or Ort changed ---
    if (error.message.includes('PLZ') && error.message.includes('Ort') && error.column === 'S_PLZ') {
      // Already covered by generic value-changed check above
    }

    return true;
  }, [rows]);

  const uncorrectedErrors = useMemo(
    () => errors.filter(e => e.correctedValue === undefined && isErrorStillValid(e)),
    [errors, isErrorStillValid]
  );
  const correctedErrors = useMemo(() => errors.filter(e => e.correctedValue !== undefined), [errors]);

  // Helper function to get student name - must be defined BEFORE useMemo that uses it
  const getStudentNameForRow = useCallback((rowNumber: number) => {
    const row = rows[rowNumber - 2];
    if (!row) return null;
    const name = row['S_Name'] || row['S_name'] || '';
    const vorname = row['S_Vorname'] || row['S_vorname'] || '';
    if (name || vorname) {
      return `${vorname} ${name}`.trim();
    }
    // Fallback for other import types
    const eintragFuer = row['Eintrag_fuer'] || '';
    if (eintragFuer) return String(eintragFuer);
    return null;
  }, [rows]);

  // Detect all parent ID inconsistency groups for bulk correction
  const parentIdInconsistencyGroups = useMemo((): ParentIdInconsistencyGroup[] => {
    const groups: ParentIdInconsistencyGroup[] = [];
    
    // Find all parent ID inconsistency errors (uncorrected only)
    const parentInconsistencyErrors = uncorrectedErrors.filter(e => 
      e.message.includes('Inkonsistente ID:') && e.column.startsWith('P_ERZ')
    );
    
    if (parentInconsistencyErrors.length === 0) return groups;
    
    // Group by identifier (extracted from message)
    const groupedByIdentifier = new Map<string, ValidationError[]>();
    
    for (const error of parentInconsistencyErrors) {
      // Extract identifier like "AHV: 756.1234.5678.90" or "Max Müller, Hauptstrasse 1"
      const identifierMatch = error.message.match(/\(([^)]+)\)/);
      const identifier = identifierMatch ? identifierMatch[1] : error.column;
      
      // Also extract the "correct" ID mentioned in the message
      const correctIdMatch = error.message.match(/die ID '([^']+)'/);
      // Group by identifier AND correctId: for pair-matched groups, ERZ1 and ERZ2
      // have the same identifier but different correctIds → must be separate groups
      const correctId = correctIdMatch ? correctIdMatch[1] : '';
      const key = correctId ? `${identifier}::${correctId}` : identifier;
      
      const existing = groupedByIdentifier.get(key);
      if (existing) {
        existing.push(error);
      } else {
        groupedByIdentifier.set(key, [error]);
      }
    }
    
    // Convert to groups
    groupedByIdentifier.forEach((groupErrors, identifier) => {
      const column = groupErrors[0].column; // primary column for display
      
      // Get correct ID from first error message
      const firstError = groupErrors[0];
      const correctIdMatch = firstError.message.match(/die ID '([^']+)'/);
      const correctId = correctIdMatch ? correctIdMatch[1] : '';
      
      if (!correctId) return;
      
      // Extract reference row number and slot from message: "hat in Zeile (\d+) (Erziehungsberechtigte/r (\d))"
      const refRowMatch = firstError.message.match(/hat in Zeile (\d+)/);
      const referenceRow = refRowMatch ? parseInt(refRowMatch[1]) : undefined;
      
      // Extract reference slot number to build correct prefix for reference row
      const refSlotMatch = firstError.message.match(/\(Erziehungsberechtigte\/r (\d)\)/);
      const referencePrefix = refSlotMatch ? `P_ERZ${refSlotMatch[1]}_` : undefined;
      
      // Extract match reason: "[Erkannt via: AHV-Nummer – Hohe Zuverlässigkeit]"
      const matchReasonMatch = firstError.message.match(/\[Erkannt via: ([^\]]+)\]/);
      const matchReason = matchReasonMatch ? matchReasonMatch[1] : '';
      
      const affectedRows = groupErrors.map(e => ({
        row: e.row,
        currentId: e.value,
        studentName: getStudentNameForRow(e.row),
        column: e.column, // per-row column (P_ERZ1_ID or P_ERZ2_ID)
      }));

      // Extract parent name & address — use referencePrefix for reference row, prefix for affected rows
      // column is e.g. "P_ERZ1_ID" → prefix is "P_ERZ1_"
      const prefix = column.replace(/_ID$/, '_');
      // For display: prefer reference row data if available (with correct prefix)
      const effectiveDisplayPrefix = referencePrefix || prefix;
      const displayRow = referenceRow != null ? (rows[referenceRow - 2] ?? {}) : (rows[groupErrors[0].row - 2] ?? {});
      const vorname = displayRow[`${effectiveDisplayPrefix}Vorname`] ?? '';
      const name = displayRow[`${effectiveDisplayPrefix}Name`] ?? '';
      const strasse = displayRow[`${effectiveDisplayPrefix}Strasse`] ?? '';
      const plz = displayRow[`${effectiveDisplayPrefix}PLZ`] ?? '';
      const ort = displayRow[`${effectiveDisplayPrefix}Ort`] ?? '';

      const parentName = [vorname, name].filter(Boolean).join(' ') || undefined;
      const addressParts = [strasse, [plz, ort].filter(Boolean).join(' ')].filter(Boolean);
      const parentAddress = addressParts.join(', ') || undefined;

      // Safety check: detect name mismatch between reference row and affected rows
      // Compare each affected row's parent name against the GROUP's known parent identity
      // This handles cross-slot scenarios (e.g. ERZ1 in ref row, ERZ2 in affected row)
      // Diacritical differences (e.g. Harambasic vs Harambašic) are NOT treated as name mismatches
      let hasNameMismatch = false;
      let hasDiacriticNameDiff = false;
      let diacriticNameVariants: { prefix: string; row: number; name: string; vorname: string }[] = [];
      if (referenceRow != null) {
        const refRow = rows[referenceRow - 2];
        if (refRow) {
          // Use the group's reference parent name (from effectiveDisplayPrefix) as ground truth
          const refVornameBase = String(refRow[`${effectiveDisplayPrefix}Vorname`] ?? '').trim();
          const refNameBase = String(refRow[`${effectiveDisplayPrefix}Name`] ?? '').trim();
          
          let allMatchExact = true;
          let allMatchNormalized = true;
          // Track which prefix matched for each affected row (for diacritic variant collection)
          const arMatchedPrefixes = new Map<number, string>();
          const parentPrefixes = ['P_ERZ1_', 'P_ERZ2_'];
          for (const ar of affectedRows) {
            const arRow = rows[ar.row - 2];
            if (!arRow) continue;
            
            if (!refVornameBase && !refNameBase) continue;
            
            // Try to find the group's parent in ANY parent slot of the affected row
            let foundExact = false;
            let foundNormalized = false;
            let matchedPrefix = ar.column.replace(/_ID$/, '_');
            for (const pfx of parentPrefixes) {
              const arVorname = String(arRow[`${pfx}Vorname`] ?? '').trim();
              const arName = String(arRow[`${pfx}Name`] ?? '').trim();
              if (!arVorname && !arName) continue;
              
              const exactVorMatch = !refVornameBase || !arVorname || refVornameBase.toLowerCase() === arVorname.toLowerCase();
              const exactNameMatch = !refNameBase || !arName || refNameBase.toLowerCase() === arName.toLowerCase();
              // Match found
              if (exactVorMatch && exactNameMatch) {
                foundExact = true;
                matchedPrefix = pfx;
                break;
              }
              const normVorMatch = !refVornameBase || !arVorname || stripDiacritics(refVornameBase.toLowerCase()) === stripDiacritics(arVorname.toLowerCase());
              const normNameMatch = !refNameBase || !arName || stripDiacritics(refNameBase.toLowerCase()) === stripDiacritics(arName.toLowerCase());
              if (normVorMatch && normNameMatch) {
                foundNormalized = true;
                matchedPrefix = pfx;
              }
            }
            arMatchedPrefixes.set(ar.row, matchedPrefix);
            if (!foundExact) allMatchExact = false;
            if (!foundExact && !foundNormalized) allMatchNormalized = false;
            
          }
          
          let matchFoundWithAnyPrefix = false;
          let diacriticMatchPrefix: string | null = null;
          if (allMatchExact) {
            matchFoundWithAnyPrefix = true;
          } else if (allMatchNormalized) {
            matchFoundWithAnyPrefix = true;
            // Use first affected row's prefix for diacritic variant collection
            diacriticMatchPrefix = affectedRows[0]?.column.replace(/_ID$/, '_') || referencePrefix;
          }
          hasNameMismatch = !matchFoundWithAnyPrefix;
          
          // Collect diacritic name variants for unification UI
          if (diacriticMatchPrefix) {
            hasDiacriticNameDiff = true;
            // Collect variants per affected row using their own prefix
            diacriticNameVariants = [];
            // Add reference entry using the group's known parent name
            diacriticNameVariants.push({ prefix: effectiveDisplayPrefix, row: referenceRow, name: refNameBase, vorname: refVornameBase });
            // Add affected rows that differ from reference
            for (const ar of affectedRows) {
              const arRow = rows[ar.row - 2];
              if (!arRow) continue;
              const arPrefix = arMatchedPrefixes.get(ar.row) || ar.column.replace(/_ID$/, '_');
              const arVorname = String(arRow[`${arPrefix}Vorname`] ?? '').trim();
              const arName = String(arRow[`${arPrefix}Name`] ?? '').trim();
              if (arName !== refNameBase || arVorname !== refVornameBase) {
                diacriticNameVariants.push({ prefix: arPrefix, row: ar.row, name: arName, vorname: arVorname });
              }
            }
          }
        }
      }
      
      // Get reference child name
      const referenceStudentName = referenceRow != null ? getStudentNameForRow(referenceRow) : undefined;

      groups.push({
        identifier,
        column,
        correctId,
        matchReason,
        severity: groupErrors.some(e => e.severity === 'warning') ? 'warning' : 'error',
        parentName,
        parentAddress,
        referenceRow,
        referencePrefix,
        referenceStudentName,
        affectedRows,
        hasNameMismatch,
        hasDiacriticNameDiff,
        diacriticNameVariants,
      });
    });
    
    return groups;
  }, [uncorrectedErrors, getStudentNameForRow, rows]);
// Helper: strip diacritical marks for comparison
function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}





  // Detect name change warnings from uncorrected errors (NameChangeEntry type imported from NameChangeCard)

  const nameChangeEntries = useMemo((): NameChangeEntry[] => {
    const entries: NameChangeEntry[] = [];
    for (const error of uncorrectedErrors) {
      if (!error.message.includes('Möglicher Namenswechsel')) continue;
      const typeMatch = error.message.match(/Möglicher Namenswechsel \(([^)]+)\)/);
      const fromMatch = error.message.match(/"([^"]+)" \(Zeile (\d+)\)/);
      const toMatch = error.message.match(/→ "([^"]+)"/);
      const studentMatch = error.message.match(/Schüler\/in: ([^)]+)/);
      const fromRowData = fromMatch ? rows[parseInt(fromMatch[2]) - 1] : null;
      const fromStudentVorname = fromRowData ? String(fromRowData['S_Vorname'] ?? '') : '';
      const fromStudentNachname = fromRowData ? String(fromRowData['S_Name'] ?? '') : '';
      const fromStudentFull = [fromStudentVorname, fromStudentNachname].filter(Boolean).join(' ');
      entries.push({
        error,
        changeType: typeMatch?.[1] ?? 'Unbekannt',
        fromName: fromMatch?.[1] ?? error.value,
        fromRow: fromMatch ? parseInt(fromMatch[2]) : error.row,
        toName: toMatch?.[1] ?? error.value,
        studentName: studentMatch?.[1] ?? (getStudentNameForRow(error.row) ?? `Zeile ${error.row}`),
        fromStudentName: fromStudentFull || (fromMatch ? `Zeile ${fromMatch[2]}` : ''),
        column: error.column,
      });
    }
    return entries;
  }, [uncorrectedErrors, getStudentNameForRow]);



  // Filtered errors for step-by-step mode (only specific rows and column if set)
  const stepByStepErrors = useMemo(() => {
    let filtered = uncorrectedErrors;
    if (filteredErrorRows !== null) {
      filtered = filtered.filter(e => filteredErrorRows.includes(e.row));
    }
    if (filteredErrorColumn !== null) {
      filtered = filtered.filter(e => e.column === filteredErrorColumn);
    }
    return filtered;
  }, [uncorrectedErrors, filteredErrorRows, filteredErrorColumn]);

  // Current error for step-by-step mode
  const currentError = stepByStepErrors[currentErrorIndex];




  // Step-by-step mode functions
  const startStepByStep = (filterRows?: number[], filterColumn?: string) => {
    let targetErrors = uncorrectedErrors;
    
    if (filterRows) {
      targetErrors = targetErrors.filter(e => filterRows.includes(e.row));
    }
    if (filterColumn) {
      targetErrors = targetErrors.filter(e => e.column === filterColumn);
    }
    
    // Fallback: if filtered result is empty but uncorrected errors exist, try without column filter
    if (targetErrors.length === 0 && filterColumn && filterRows) {
      targetErrors = uncorrectedErrors.filter(e => filterRows.includes(e.row));
    }
    // Fallback: if still empty, try without any filter
    if (targetErrors.length === 0 && uncorrectedErrors.length > 0) {
      targetErrors = uncorrectedErrors;
      filterRows = undefined;
      filterColumn = undefined;
    }
    
    if (targetErrors.length > 0) {
      setFilteredErrorRows(filterRows || null);
      setFilteredErrorColumn(filterColumn || null);
      setStepByStepMode(true);
      setCurrentErrorIndex(0);
      setNationalitySearch(null);
      const firstErr = targetErrors[0];
      // For nationality columns, start with empty so user must pick from dropdown
      const isNatCol = firstErr && NATIONALITY_COLUMNS.has(firstErr.column);
      const isLangCol = firstErr && LANGUAGE_COLUMNS.has(firstErr.column);
      setStepEditValue((isNatCol || isLangCol) ? '' : (firstErr?.value || ''));
    } else {
      toast({
        title: 'Keine offenen Fehler',
        description: 'Alle Fehler in dieser Kategorie wurden bereits korrigiert.',
      });
    }
  };

  // Jump to a specific error by row and column
  const jumpToError = (targetRow: number, targetColumn: string) => {
    // Find the error index in stepByStepErrors
    const targetIndex = stepByStepErrors.findIndex(
      e => e.row === targetRow && e.column === targetColumn
    );
    
    if (targetIndex !== -1) {
      setCurrentErrorIndex(targetIndex);
      setStepEditValue(stepByStepErrors[targetIndex]?.value || '');
    } else {
      // If not in filtered list, try to find in all uncorrected errors and reset filter
      const allErrorIndex = uncorrectedErrors.findIndex(
        e => e.row === targetRow && e.column === targetColumn
      );
      if (allErrorIndex !== -1) {
        setFilteredErrorRows(null);
        setFilteredErrorColumn(null);
        // Need to recalculate index after filter reset
        setTimeout(() => {
          const newIndex = uncorrectedErrors.findIndex(
            e => e.row === targetRow && e.column === targetColumn
          );
          if (newIndex !== -1) {
            setCurrentErrorIndex(newIndex);
            setStepEditValue(uncorrectedErrors[newIndex]?.value || '');
          }
        }, 0);
      }
    }
  };

  const handleStepSave = () => {
    if (currentError) {
      // Enforce dropdown selection for language and nationality columns
      if (LANGUAGE_COLUMNS.has(currentError.column) && !BISTA_LANGUAGES_SORTED.includes(stepEditValue)) {
        toast({ title: 'Bitte Sprache aus der Liste wählen', variant: 'destructive' });
        return;
      }
      if (NATIONALITY_COLUMNS.has(currentError.column) && !NATIONALITIES_SORTED.includes(stepEditValue)) {
        toast({ title: 'Bitte Nationalität aus der Liste wählen', variant: 'destructive' });
        return;
      }
      onErrorCorrect(currentError.row, currentError.column, stepEditValue);
      // Move to next error (the array will update, so we stay at same index or go to 0)
      if (currentErrorIndex >= stepByStepErrors.length - 1) {
        setCurrentErrorIndex(0);
      }
    }
  };

  const handleStepSkip = () => {
    if (currentErrorIndex < stepByStepErrors.length - 1) {
      setCurrentErrorIndex(currentErrorIndex + 1);
      setStepEditValue(stepByStepErrors[currentErrorIndex + 1]?.value || '');
    } else {
      setCurrentErrorIndex(0);
      setStepEditValue(stepByStepErrors[0]?.value || '');
    }
  };

  const handleStepPrev = () => {
    if (currentErrorIndex > 0) {
      setCurrentErrorIndex(currentErrorIndex - 1);
      setStepEditValue(stepByStepErrors[currentErrorIndex - 1]?.value || '');
    }
  };

  const closeStepByStep = () => {
    setStepByStepMode(false);
    setFilteredErrorRows(null);
    setFilteredErrorColumn(null);
  };

  // Close step-by-step mode when all filtered errors are corrected
  useEffect(() => {
    if (stepByStepMode && stepByStepErrors.length === 0) {
      closeStepByStep();
      toast({
        title: "Alle Fehler korrigiert",
        description: (filteredErrorRows || filteredErrorColumn)
          ? "Alle ausgewählten Fehler wurden bearbeitet."
          : "Alle Fehler wurden bearbeitet.",
      });
    }
  }, [stepByStepErrors.length, stepByStepMode]);

  // Update step edit value when current error changes
  useEffect(() => {
    if (stepByStepMode && currentError) {
      // For nationality/language columns, always start empty so user picks from dropdown
      const isNatCol = NATIONALITY_COLUMNS.has(currentError.column);
      const isLangCol = LANGUAGE_COLUMNS.has(currentError.column);
      setStepEditValue((isNatCol || isLangCol) ? '' : (currentError.value || ''));
      setNationalitySearch(null);
    }
  }, [currentErrorIndex, uncorrectedErrors.length, stepByStepMode]);

  // Get student name for current error row
  const getCurrentStudentName = () => {
    if (!currentError) return null;
    return getStudentNameForRow(currentError.row);
  };

  // Check if current error is a duplicate error and find all related duplicates with full row data
  // Now includes FULL column comparison to detect data differences
  const getDuplicateInfo = useCallback(() => {
    if (!currentError) return null;
    
    // Check if this is a duplicate or inconsistency error
    const isDuplicateOrInconsistency = currentError.message.includes('Duplikat') || 
                                        currentError.message.includes('Inkonsistente ID') ||
                                        currentError.message.includes('gefunden');
    if (!isDuplicateOrInconsistency) return null;

    // Find all UNCORRECTED errors for the same column with the same or similar values
    // Filter out already resolved duplicates
    const relatedErrors = uncorrectedErrors.filter(e => 
      e.column === currentError.column && 
      (e.message.includes('Duplikat') || e.message.includes('Inkonsistente ID') || e.message.includes('gefunden'))
    );

    // Extract all affected rows from messages
    const allAffectedRows = new Set<number>();
    
    relatedErrors.forEach(e => {
      allAffectedRows.add(e.row);
      // Extract row number from message like "kommt auch in Zeile X vor" or "erste Zeile: X"
      const rowMatches = e.message.match(/Zeile[:\s]+(\d+)/gi);
      if (rowMatches) {
        rowMatches.forEach(match => {
          const numMatch = match.match(/(\d+)/);
          if (numMatch) allAffectedRows.add(parseInt(numMatch[1]));
        });
      }
    });

    // Group by the duplicate value
    const duplicateGroups: { value: string; rows: number[] }[] = [];
    const processedValues = new Set<string>();

    relatedErrors.forEach(e => {
      if (processedValues.has(e.value)) return;
      processedValues.add(e.value);
      
      const rowsWithSameValue = [e.row];
      const rowMatches = e.message.match(/Zeile[:\s]+(\d+)/gi);
      if (rowMatches) {
        rowMatches.forEach(match => {
          const numMatch = match.match(/(\d+)/);
          if (numMatch) {
            const rowNum = parseInt(numMatch[1]);
            if (!rowsWithSameValue.includes(rowNum)) {
              rowsWithSameValue.unshift(rowNum);
            }
          }
        });
      }
      
      duplicateGroups.push({ value: e.value, rows: rowsWithSameValue });
    });

    // For the current error, find its group
    const currentValue = currentError.value;
    const currentGroup = duplicateGroups.find(g => g.value === currentValue);
    
    if (!currentGroup || currentGroup.rows.length < 2) return null;

    // Get ALL columns from the data for full comparison
    const allColumns = new Set<string>();
    currentGroup.rows.forEach(rowNum => {
      const rowData = rows[rowNum - 2];
      if (rowData) {
        Object.keys(rowData).forEach(key => allColumns.add(key));
      }
    });

    // Build complete row data for comparison
    interface RowWithFullData {
      row: number;
      studentName: string | null;
      isCurrent: boolean;
      hasError: boolean;
      fullData: Record<string, string>;
    }

    const rowsWithData: RowWithFullData[] = currentGroup.rows
      .filter(rowNum => {
        // Only include rows that still have uncorrected errors for this duplicate column
        return uncorrectedErrors.some(e => e.row === rowNum && e.column === currentError.column);
      })
      .map(rowNum => {
        const rowData = rows[rowNum - 2];
        const studentName = getStudentNameForRow(rowNum);
        
        const fullData: Record<string, string> = {};
        if (rowData) {
          allColumns.forEach(col => {
            const val = rowData[col];
            fullData[col] = val !== undefined && val !== null ? String(val) : '';
          });
        }
        
        return {
          row: rowNum,
          studentName,
          isCurrent: rowNum === currentError.row,
          hasError: true, // All rows in this filtered list have errors
          fullData
        };
      });

    // If after filtering we have less than 2 rows, this duplicate is resolved
    if (rowsWithData.length < 2) return null;

    // Determine if this is a parent-related inconsistency (different children, same parent)
    const isParentInconsistency = currentError.column.startsWith('P_ERZ');
    
    // Find columns with DIFFERENT values across duplicate rows
    const columnsWithDifferences: { column: string; values: { row: number; value: string }[] }[] = [];
    
    allColumns.forEach(col => {
      // For parent inconsistencies, ONLY show parent-related fields (P_*)
      // Student fields (S_*) are expected to be different as they represent different students
      if (isParentInconsistency && col.startsWith('S_')) {
        return; // Skip student fields for parent inconsistency checks
      }
      
      const uniqueValues = new Map<string, number[]>();
      
      rowsWithData.forEach(rowInfo => {
        const val = rowInfo.fullData[col] || '';
        if (!uniqueValues.has(val)) {
          uniqueValues.set(val, []);
        }
        uniqueValues.get(val)!.push(rowInfo.row);
      });
      
      // If there are different values (more than 1 unique value, excluding empty)
      const nonEmptyValues = Array.from(uniqueValues.entries()).filter(([v]) => v.trim() !== '');
      if (nonEmptyValues.length > 1 || (uniqueValues.size > 1 && nonEmptyValues.length >= 1)) {
        columnsWithDifferences.push({
          column: col,
          values: rowsWithData.map(r => ({ row: r.row, value: r.fullData[col] || '(leer)' }))
        });
      }
    });

    // Categorize differences by importance - only parent fields for parent inconsistencies
    const criticalColumns = isParentInconsistency 
      ? ['P_ERZ1_AHV', 'P_ERZ2_AHV', 'P_ERZ1_ID', 'P_ERZ2_ID']
      : ['S_AHV', 'P_ERZ1_AHV', 'P_ERZ2_AHV', 'S_Geburtsdatum', 'S_ID'];
    const importantColumns = isParentInconsistency
      ? ['P_ERZ1_Email', 'P_ERZ2_Email', 'P_ERZ1_Telefon', 'P_ERZ2_Telefon', 'P_ERZ1_Adresse', 'P_ERZ1_PLZ', 'P_ERZ1_Ort']
      : ['S_Email', 'P_ERZ1_Email', 'P_ERZ2_Email', 'S_Telefon', 'P_ERZ1_Telefon', 'P_ERZ2_Telefon', 'S_Adresse', 'S_PLZ', 'S_Ort'];
    
    const criticalDifferences = columnsWithDifferences.filter(d => criticalColumns.includes(d.column));
    const importantDifferences = columnsWithDifferences.filter(d => importantColumns.includes(d.column));
    const otherDifferences = columnsWithDifferences.filter(d => 
      !criticalColumns.includes(d.column) && !importantColumns.includes(d.column)
    );

    const hasDifferences = columnsWithDifferences.length > 0;
    const hasCriticalDifferences = criticalDifferences.length > 0;

    // Check if this is an ID conflict (different persons with same ID)
    const isIdConflict = relatedErrors.some(e => e.type === 'id_conflict');

    // Suggest a solution based on the type of duplicate and differences
    let suggestedSolution = '';
    let warningMessage = '';
    
    if (isIdConflict) {
      warningMessage = `Schwerwiegender Fehler: Verschiedene Personen verwenden die gleiche ID "${currentValue}" in Spalte "${currentError.column}".`;
      suggestedSolution = 'Die ID muss bei einer der Personen manuell korrigiert werden. Eine automatische Zusammenführung ist nicht möglich, da es sich um verschiedene Personen handelt.';
    } else if (isParentInconsistency) {
      warningMessage = hasDifferences 
        ? `${columnsWithDifferences.length} Eltern-Feld(er) haben unterschiedliche Werte.`
        : '';
      suggestedSolution = 'Die Eltern-IDs sollten vereinheitlicht werden. Wählen Sie den korrekten Eltern-Datensatz. Schüler*innen-Daten (S_*) bleiben unverändert.';
    } else if (hasDifferences) {
      warningMessage = `Achtung: ${columnsWithDifferences.length} Spalte(n) haben unterschiedliche Werte! `;
      if (hasCriticalDifferences) {
        warningMessage += 'Kritische Unterschiede (AHV, Geburtsdatum, ID) gefunden.';
      }
      
      if (currentError.column.includes('AHV')) {
        suggestedSolution = 'AHV-Nummern müssen eindeutig sein. Wählen Sie den Datensatz, dessen Daten übernommen werden sollen.';
      } else {
        suggestedSolution = 'Duplikate enthalten unterschiedliche Daten. Wählen Sie den Datensatz, dessen Werte für die Zusammenführung verwendet werden sollen.';
      }
    } else {
      suggestedSolution = 'Duplikate können zusammengeführt werden. Keine Unterschiede in den Daten gefunden.';
    }

    return {
      value: currentValue,
      column: currentError.column,
      rows: rowsWithData,
      suggestedSolution,
      warningMessage,
      hasDifferences,
      hasCriticalDifferences,
      columnsWithDifferences,
      criticalDifferences,
      importantDifferences,
      otherDifferences,
      totalOccurrences: rowsWithData.length,
      allColumns: Array.from(allColumns),
      isParentInconsistency,
      isIdConflict
    };
  }, [currentError, errors, rows, getStudentNameForRow]);

  const duplicateInfo = useMemo(() => getDuplicateInfo(), [getDuplicateInfo]);
  
  // State for selected master record when merging duplicates
  const [selectedMasterRow, setSelectedMasterRow] = useState<number | null>(null);
  
  // Reset selected master when duplicate info changes
  useEffect(() => {
    if (duplicateInfo && duplicateInfo.rows.length > 0) {
      // Default to the first row (usually the "original")
      setSelectedMasterRow(duplicateInfo.rows[0].row);
    } else {
      setSelectedMasterRow(null);
    }
  }, [duplicateInfo?.value, duplicateInfo?.column]);

  // Apply selected master record's data to all duplicates and mark duplicate errors as resolved
  const applyMasterRecord = useCallback(() => {
    if (!duplicateInfo || !selectedMasterRow) return;
    
    const masterRowData = rows[selectedMasterRow - 2];
    if (!masterRowData) return;
    
    const corrections: { row: number; column: string; value: string }[] = [];
    
    // For each difference column, apply the master's value to all other rows
    duplicateInfo.columnsWithDifferences.forEach(diff => {
      const masterValue = masterRowData[diff.column];
      const masterValueStr = masterValue !== undefined && masterValue !== null ? String(masterValue) : '';
      
      duplicateInfo.rows.forEach(rowInfo => {
        if (rowInfo.row !== selectedMasterRow) {
          const currentValue = rowInfo.fullData[diff.column] || '';
          if (currentValue !== masterValueStr) {
            corrections.push({
              row: rowInfo.row,
              column: diff.column,
              value: masterValueStr
            });
          }
        }
      });
    });
    
    // IMPORTANT: Also mark the duplicate/inconsistency errors themselves as resolved
    // by setting their correctedValue to indicate they've been handled via master record merge
    duplicateInfo.rows.forEach(rowInfo => {
      // Mark the duplicate error in the original column as resolved
      // The value stays the same, but we mark it as "corrected" (merged)
      const duplicateValue = rowInfo.fullData[duplicateInfo.column] || '';
      if (duplicateValue) {
        // Add correction for the duplicate column itself to mark it as resolved
        // We use the master's value for consistency
        const masterDuplicateValue = masterRowData[duplicateInfo.column];
        const masterDuplicateValueStr = masterDuplicateValue !== undefined && masterDuplicateValue !== null 
          ? String(masterDuplicateValue) 
          : duplicateValue;
        
        corrections.push({
          row: rowInfo.row,
          column: duplicateInfo.column,
          value: masterDuplicateValueStr
        });
      }
    });
    
    // Remove duplicate corrections (same row+column)
    const uniqueCorrections = corrections.filter((correction, index, self) => 
      index === self.findIndex(c => c.row === correction.row && c.column === correction.column)
    );
    
    if (uniqueCorrections.length > 0) {
      onBulkCorrect(uniqueCorrections, 'bulk');
      
      const dataChanges = uniqueCorrections.filter(c => c.column !== duplicateInfo.column).length;
      const duplicateResolutions = uniqueCorrections.filter(c => c.column === duplicateInfo.column).length;
      
      toast({
        title: 'Duplikate zusammengeführt',
        description: `${duplicateResolutions} Duplikat-Fehler als gelöst markiert${dataChanges > 0 ? `, ${dataChanges} Datenwerte aus Zeile ${selectedMasterRow} übernommen` : ''}.`,
      });
    } else {
      // Even if no data changes, mark duplicates as resolved
      const duplicateCorrections: { row: number; column: string; value: string }[] = [];
      duplicateInfo.rows.forEach(rowInfo => {
        const duplicateValue = rowInfo.fullData[duplicateInfo.column] || '';
        if (duplicateValue) {
          duplicateCorrections.push({
            row: rowInfo.row,
            column: duplicateInfo.column,
            value: duplicateValue
          });
        }
      });
      
      if (duplicateCorrections.length > 0) {
        onBulkCorrect(duplicateCorrections, 'bulk');
        toast({
          title: 'Duplikate zusammengeführt',
          description: `${duplicateCorrections.length} Duplikat-Fehler als gelöst markiert. Alle Werte waren bereits identisch.`,
        });
      } else {
        toast({
          title: 'Keine Änderungen',
          description: 'Alle Werte sind bereits identisch.',
        });
      }
    }
  }, [duplicateInfo, selectedMasterRow, rows, onBulkCorrect, toast]);

  // Analyze errors locally — runs synchronously but is fast (<100ms for typical datasets)
  const analyzeLocally = useCallback((silent: boolean = false) => {
    if (uncorrectedErrors.length === 0) {
      setLocalSuggestions([]);
      return;
    }
    
    const startTime = performance.now();
    
    // Filter out errors handled by dedicated sections (ID conflicts, parent consolidation, etc.)
    const errorsForAnalysis = uncorrectedErrors.filter(e => 
      e.type !== 'id_conflict' && 
      e.type !== 'student_duplicate_id' &&
      e.type !== 'student_parent_id_overlap' &&
      !e.message.includes('Inkonsistente ID:') &&
      !e.message.includes('Geschwister-Inkonsistenz')
    );
    
    const suggestions = analyzeErrorsLocally(errorsForAnalysis, rows);
    const duration = performance.now() - startTime;
    setAnalysisTime(duration);
    setHasRunAnalysis(true);
    setLocalSuggestions(suggestions);
    
    if (!silent) {
      if (suggestions.length > 0) {
        toast({
          title: 'Analyse abgeschlossen',
          description: `${suggestions.length} Korrekturvorschläge gefunden (${Math.round(duration)}ms)`,
        });
      } else {
        toast({
          title: 'Keine automatischen Korrekturen',
          description: 'Bitte nutzen Sie die manuelle Schritt-für-Schritt Korrektur.',
        });
      }
    }
  }, [uncorrectedErrors, rows, toast]);

  // Automatically run analysis on mount when there are uncorrected errors
  useEffect(() => {
    if (!hasRunAnalysis && uncorrectedErrors.length > 0) {
      analyzeLocally(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Automatically re-run analysis when corrections are applied
  useEffect(() => {
    // Initialize on first render
    if (previousUncorrectedCount === null) {
      setPreviousUncorrectedCount(uncorrectedErrors.length);
      return;
    }
    
    // If count decreased (corrections applied), re-analyze silently
    if (hasRunAnalysis && uncorrectedErrors.length < previousUncorrectedCount) {
      analyzeLocally(true); // Silent re-analysis
    }
    
    setPreviousUncorrectedCount(uncorrectedErrors.length);
  }, [uncorrectedErrors.length, hasRunAnalysis, previousUncorrectedCount, analyzeLocally]);

  // Show worker errors
  useEffect(() => {
    if (workerError) {
      toast({
        title: 'Worker-Fehler',
        description: workerError,
        variant: 'destructive',
      });
    }
  }, [workerError, toast]);



  // Auto-apply all fixable patterns whenever new suggestions appear
  useEffect(() => {
    if (!hasRunAnalysis || localSuggestions.length === 0) return;
    if (isAutoFixingRef.current) return;

    const fixable = localSuggestions.filter(s => s.autoFix);
    if (fixable.length === 0) return;

    isAutoFixingRef.current = true;

    // Collect all corrections first, then apply once
    const allCorrections: { row: number; column: string; value: string }[] = [];
    for (const suggestion of fixable) {
      const corrections = applyLocalCorrection(suggestion, errors);
      allCorrections.push(...corrections);
    }
    
    // Remove auto-fix suggestions immediately
    setLocalSuggestions(prev => prev.filter(s => !s.autoFix));

    if (allCorrections.length > 0) {
      onBulkCorrect(allCorrections, 'auto');
      toast({
        title: 'Auto-Fixes automatisch angewendet',
        description: `${allCorrections.length} Formatierungen wurden automatisch korrigiert`,
      });
    }

    // Reset guard after a tick to allow future auto-fixes from re-analysis
    setTimeout(() => { isAutoFixingRef.current = false; }, 500);
  }, [hasRunAnalysis, localSuggestions, errors, onBulkCorrect, toast]);


  // Errors handled by dedicated UI sections (exclude from general error table)
  const dedicatedSectionErrorKeys = useMemo(() => {
    const keys = new Set<string>();
    // Name change errors
    for (const e of errors) {
      if (e.message.includes('Möglicher Namenswechsel')) {
        keys.add(`${e.row}:${e.column}`);
      }
      // Parent ID consolidation errors
      if (e.message.includes('Inkonsistente ID:') && e.column.startsWith('P_ERZ')) {
        keys.add(`${e.row}:${e.column}`);
      }
      // ID conflict errors
      if (e.type === 'id_conflict') {
        keys.add(`${e.row}:${e.column}`);
      }
      // Student deduplication errors
      if (e.type === 'student_duplicate_id') {
        keys.add(`${e.row}:${e.column}`);
      }
    }
    return keys;
  }, [errors]);



  // Apply local bulk correction
  const applyLocalBulkCorrection = useCallback((suggestion: LocalSuggestion) => {
    const corrections = applyLocalCorrection(suggestion, errors);

    if (corrections.length > 0) {
      onBulkCorrect(corrections, 'bulk');
      toast({
        title: 'Korrekturen angewendet',
        description: `${corrections.length} Werte wurden lokal korrigiert`,
      });
      
      // Remove this suggestion
      setLocalSuggestions(prev => prev.filter(s => s !== suggestion));
    } else {
      toast({
        title: 'Keine Korrekturen möglich',
        description: 'Die automatische Korrektur konnte nicht angewendet werden.',
        variant: 'destructive',
      });
    }
  }, [errors, onBulkCorrect, toast]);



  return (
    <div className="space-y-6 pb-32 md:pb-20">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Daten validieren</h2>
        <p className="text-muted-foreground mt-1">
          Überprüfen und korrigieren Sie fehlerhafte Daten vor dem Export.
        </p>
      </div>

      {/* Sticky-on-mobile container: Summary + progress bar stay visible while scrolling */}
      <div className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-sm border-b border-border/40 space-y-3 md:static md:mx-0 md:px-0 md:py-0 md:bg-transparent md:backdrop-blur-none md:border-0 md:space-y-6">
        {/* Summary */}
        <div className={`grid gap-2 md:gap-4 ${nameChangeEntries.length > 0 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
          <div className="p-2 md:p-4 bg-muted rounded-lg text-center">
            <p className="text-xl md:text-3xl font-bold">{rows.length}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Datensätze gesamt</p>
          </div>
          <div className="p-2 md:p-4 bg-destructive/10 rounded-lg text-center">
            <p className="text-xl md:text-3xl font-bold text-destructive">{uncorrectedErrors.length}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Offene Fehler</p>
          </div>
          {nameChangeEntries.length > 0 && (
            <div className="p-2 md:p-4 bg-pupil-warning/10 rounded-lg text-center border border-pupil-warning/20">
              <p className="text-xl md:text-3xl font-bold text-pupil-warning">{nameChangeEntries.length}</p>
              <p className="text-xs md:text-sm text-muted-foreground">Namenswechsel</p>
            </div>
          )}
          <div className="p-2 md:p-4 bg-pupil-success/10 rounded-lg text-center">
            <p className="text-xl md:text-3xl font-bold text-pupil-success">{correctedErrors.length}</p>
            <p className="text-xs md:text-sm text-muted-foreground">Korrigiert</p>
          </div>
        </div>

        {/* Correction progress bar */}
        {errors.length > 0 && (() => {
          const correctionRate = Math.round((correctedErrors.length / errors.length) * 100);
          return (
            <div className="flex items-center gap-3">
              <Progress value={correctionRate} className="flex-1 h-2" />
              <span className="text-xs md:text-sm text-muted-foreground shrink-0 min-w-[8rem] md:min-w-[10rem] text-right">
                {correctionRate === 100 ? (
                  <span className="text-pupil-success font-medium">✓ Alle behoben</span>
                ) : correctionRate > 0 ? (
                  <>{correctionRate}% behoben</>
                ) : (
                  <>{errors.length} ausstehend</>
                )}
              </span>
            </div>
          );
        })()}
      </div>

      {/* Success State - No errors */}
      {errors.length === 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Keine Fehler gefunden</h3>
            <p className="text-muted-foreground max-w-md">
              Ihre Daten sind fehlerfrei und bereit für den Export. Klicken Sie auf «Weiter zur Vorschau», um fortzufahren.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Success State - All errors corrected */}
      {errors.length > 0 && uncorrectedErrors.length === 0 && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">Alle Fehler behoben</h3>
            <p className="text-sm text-muted-foreground">
              {correctedErrors.length} Korrekturen wurden erfolgreich angewendet. Sie können nun zur Vorschau wechseln.
            </p>
          </CardContent>
        </Card>
      )}

      {/* ID Conflict Batch Resolution Card */}
      <IdConflictBatchCard
        errors={errors}
        rows={rows}
        onBulkCorrect={onBulkCorrect}
      />

      {/* Sibling Inconsistency Resolution Card */}
      <SiblingInconsistencyCard
        errors={errors}
        rows={rows}
        onBulkCorrect={onBulkCorrect}
      />

      {/* Student Deduplication Card */}
      <StudentDeduplicationCard
        errors={errors}
        rows={rows}
        onBulkCorrect={onBulkCorrect}
      />

      {/* Student-Parent ID Overlap Card */}
      <StudentParentOverlapCard
        errors={errors}
        rows={rows}
        onBulkCorrect={onBulkCorrect}
      />

      {/* Parent ID Consolidation Card */}
      <ParentConsolidationCard
        parentIdInconsistencyGroups={parentIdInconsistencyGroups}
        rows={rows}
        onErrorCorrect={onErrorCorrect}
        onBulkCorrect={onBulkCorrect}
        getStudentNameForRow={getStudentNameForRow}
      />

      <NameChangeCard
        entries={nameChangeEntries}
        rows={rows}
        onErrorCorrect={onErrorCorrect}
        onBulkCorrect={onBulkCorrect}
      />

      <BulkCorrectionCard
        uncorrectedErrors={uncorrectedErrors}
        errors={errors}
        isAnalyzing={isAnalyzing}
        hasRunAnalysis={hasRunAnalysis}
        analysisTime={analysisTime}
        localSuggestions={localSuggestions}
        onAnalyze={() => analyzeLocally(false)}
        onApplyBulkCorrection={applyLocalBulkCorrection}
        onStartStepByStep={startStepByStep}
      />

      {stepByStepMode && currentError && (
        <Card ref={stepByStepRef} className="border-2 border-primary">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Schritt-für-Schritt Korrektur</CardTitle>
              </div>
              {getCurrentStudentName() && (
                <span className="text-lg font-semibold text-foreground">
                  {getCurrentStudentName()}
                </span>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={closeStepByStep}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>
              Fehler {currentErrorIndex + 1} von {stepByStepErrors.length}
              {filteredErrorRows && (
                <span className="text-primary ml-2">(gefiltert)</span>
              )}
            </CardDescription>
            {/* Progress bar for step-by-step mode */}
            <Progress 
              value={stepByStepErrors.length > 0 ? ((currentErrorIndex) / stepByStepErrors.length) * 100 : 0} 
              className="h-1 mt-2" 
            />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Zeile:</span>
                <span className="ml-2 font-mono font-medium">{currentError.row}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Spalte:</span>
                <span className="ml-2 font-mono font-medium">{currentError.column}</span>
              </div>
            </div>
            
            <div>
              <span className="text-sm text-muted-foreground">Fehler:</span>
              <Badge variant="destructive" className="ml-2">{currentError.message}</Badge>
            </div>

            {/* Show all duplicate occurrences with full details */}
            {duplicateInfo && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">
                    Duplikat-Analyse ({duplicateInfo.totalOccurrences} Vorkommen)
                  </label>
                  <Badge variant="outline" className="text-xs">
                    {duplicateInfo.column}
                  </Badge>
                </div>
                
                {/* ID Conflict warning */}
                {duplicateInfo.isIdConflict && (
                  <Alert variant="destructive" className="border-destructive bg-destructive/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-sm">ID-Konflikt: Verschiedene Personen</AlertTitle>
                    <AlertDescription className="text-xs">
                      Verschiedene Personen verwenden die gleiche ID. Dies ist ein schwerwiegender Datenfehler.
                      <strong className="block mt-1">Eine der IDs muss manuell korrigiert werden. Eine Zusammenführung ist nicht möglich.</strong>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Info for parent inconsistency - explain that student data stays unchanged */}
                {!duplicateInfo.isIdConflict && duplicateInfo.isParentInconsistency && (
                  <Alert className="border-blue-500/30 bg-blue-500/5">
                    <AlertCircle className="h-4 w-4 text-blue-500" />
                    <AlertTitle className="text-sm">Eltern-ID Inkonsistenz</AlertTitle>
                    <AlertDescription className="text-xs">
                      Verschiedene Kinder haben denselben Erziehungsberechtigten, aber unterschiedliche Eltern-IDs.
                      <strong className="block mt-1">Schüler*innen-Daten (S_*) bleiben unverändert.</strong>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Warning about different data */}
                {duplicateInfo.hasDifferences && (
                  <Alert variant={duplicateInfo.isParentInconsistency ? "default" : "destructive"} className={duplicateInfo.isParentInconsistency ? "border-amber-500/50 bg-amber-500/10" : "border-destructive/50 bg-destructive/10"}>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-sm">
                      {duplicateInfo.isParentInconsistency ? 'Eltern-Felder mit unterschiedlichen Werten' : 'Unterschiedliche Daten gefunden!'}
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                      {duplicateInfo.warningMessage}
                      {!duplicateInfo.isParentInconsistency && (
                        <>
                          <br />
                          <strong>{duplicateInfo.columnsWithDifferences.length} Spalte(n)</strong> haben unterschiedliche Werte.
                        </>
                      )}
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Suggested solution */}
                <Alert className="border-primary/30 bg-primary/5">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-sm">Lösungsvorschlag</AlertTitle>
                  <AlertDescription className="text-xs">
                    {duplicateInfo.suggestedSolution}
                  </AlertDescription>
                </Alert>

                {/* Master Record Selection - only for parent fields or non-parent inconsistencies, NOT for ID conflicts */}
                {!duplicateInfo.isIdConflict && (duplicateInfo.hasDifferences || duplicateInfo.isParentInconsistency) && (
                  <div className="p-3 bg-muted/50 rounded-lg border space-y-3">
                    <div className="flex items-center gap-2">
                      <Copy className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {duplicateInfo.isParentInconsistency 
                          ? 'Korrekte Eltern-ID wählen' 
                          : 'Master-Datensatz wählen'}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {duplicateInfo.isParentInconsistency 
                        ? 'Wählen Sie die Zeile mit der korrekten Eltern-ID. Nur Eltern-Felder werden übernommen, Schüler*innen-Daten bleiben unverändert.'
                        : 'Wählen Sie den Datensatz, dessen Werte bei der Zusammenführung übernommen werden sollen:'}
                    </p>
                    <RadioGroup 
                      value={selectedMasterRow?.toString() || ''} 
                      onValueChange={(val) => setSelectedMasterRow(parseInt(val))}
                      className="space-y-2"
                    >
                      {duplicateInfo.rows.map((rowInfo) => (
                        <div key={rowInfo.row} className="flex items-center space-x-2">
                          <RadioGroupItem value={rowInfo.row.toString()} id={`master-${rowInfo.row}`} />
                          <Label htmlFor={`master-${rowInfo.row}`} className="text-sm cursor-pointer flex-1">
                            <span className="font-mono">Zeile {rowInfo.row}</span>
                            {rowInfo.studentName && (
                              <span className="text-muted-foreground ml-2">— {rowInfo.studentName}</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                    <Button 
                      size="sm" 
                      onClick={applyMasterRecord}
                      disabled={!selectedMasterRow}
                      className="w-full gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      {duplicateInfo.isParentInconsistency 
                        ? `Eltern-ID aus Zeile ${selectedMasterRow} übernehmen`
                        : `Daten aus Zeile ${selectedMasterRow} übernehmen`}
                    </Button>
                  </div>
                )}

                {/* Show differences in detail */}
                {duplicateInfo.hasDifferences && duplicateInfo.columnsWithDifferences.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive" />
                      <span className="text-sm font-medium text-destructive">
                        {duplicateInfo.isParentInconsistency 
                          ? 'Eltern-Felder mit unterschiedlichen Werten:' 
                          : 'Spalten mit unterschiedlichen Werten:'}
                      </span>
                    </div>
                    <ScrollArea className="max-h-[400px]">
                      <div className="space-y-3 pr-4">
                        {/* Critical differences first */}
                        {duplicateInfo.criticalDifferences.map((diff, idx) => (
                          <div key={`critical-${idx}`} className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant="destructive" className="text-xs shrink-0">Kritisch</Badge>
                              <span className="text-sm font-mono font-medium truncate">{diff.column}</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {diff.values.map((v, vIdx) => (
                                <div key={vIdx} className="flex items-start gap-3 text-sm">
                                  <span className="text-muted-foreground shrink-0 w-20">Zeile {v.row}:</span>
                                  <code className={`px-2 py-1 rounded break-all flex-1 ${
                                    selectedMasterRow === v.row 
                                      ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary' 
                                      : 'bg-muted'
                                  }`}>
                                    {v.value}
                                  </code>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        
                        {/* Important differences */}
                        {duplicateInfo.importantDifferences.map((diff, idx) => (
                          <div key={`important-${idx}`} className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-amber-500 text-xs shrink-0">Wichtig</Badge>
                              <span className="text-sm font-mono font-medium truncate">{diff.column}</span>
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {diff.values.map((v, vIdx) => (
                                <div key={vIdx} className="flex items-start gap-3 text-sm">
                                  <span className="text-muted-foreground shrink-0 w-20">Zeile {v.row}:</span>
                                  <code className={`px-2 py-1 rounded break-all flex-1 ${
                                    selectedMasterRow === v.row 
                                      ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary' 
                                      : 'bg-muted'
                                  }`}>
                                    {v.value}
                                  </code>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                        
                        {/* Other differences - show all with expand option */}
                        {duplicateInfo.otherDifferences.length > 0 && (
                          <>
                            {(showAllOtherDifferences 
                              ? duplicateInfo.otherDifferences 
                              : duplicateInfo.otherDifferences.slice(0, 5)
                            ).map((diff, idx) => (
                              <div key={`other-${idx}`} className="p-3 bg-muted/50 rounded-lg border">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-mono font-medium truncate">{diff.column}</span>
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                  {diff.values.map((v, vIdx) => (
                                    <div key={vIdx} className="flex items-start gap-3 text-sm">
                                      <span className="text-muted-foreground shrink-0 w-20">Zeile {v.row}:</span>
                                      <code className={`px-2 py-1 rounded break-all flex-1 ${
                                        selectedMasterRow === v.row 
                                          ? 'bg-primary/20 text-primary font-bold ring-1 ring-primary' 
                                          : 'bg-muted'
                                      }`}>
                                        {v.value}
                                      </code>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {duplicateInfo.otherDifferences.length > 5 && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAllOtherDifferences(!showAllOtherDifferences)}
                                className="w-full text-xs text-muted-foreground hover:text-foreground"
                              >
                                {showAllOtherDifferences 
                                  ? 'Weniger anzeigen'
                                  : `+ ${duplicateInfo.otherDifferences.length - 5} weitere Unterschiede anzeigen`
                                }
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </ScrollArea>
                  </div>
                )}
                
                {/* All occurrences with navigation */}
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  <span className="text-xs font-medium text-muted-foreground">Zu Datensatz springen:</span>
                  {duplicateInfo.rows.map((rowInfo, idx) => (
                    <div 
                      key={idx} 
                      className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                        rowInfo.isCurrent 
                          ? 'border-primary bg-primary/10' 
                          : selectedMasterRow === rowInfo.row
                            ? 'border-primary/50 bg-primary/5'
                            : rowInfo.hasError
                              ? 'border-destructive/30 bg-destructive/5 hover:bg-destructive/10'
                              : 'border-muted bg-muted/30 hover:bg-muted/50'
                      }`}
                      onClick={() => {
                        if (!rowInfo.isCurrent) {
                          if (rowInfo.hasError) {
                            jumpToError(rowInfo.row, duplicateInfo.column);
                          } else {
                            const tableRow = document.querySelector(`[data-row="${rowInfo.row}"]`);
                            if (tableRow) {
                              tableRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              tableRow.classList.add('ring-2', 'ring-primary');
                              setTimeout(() => tableRow.classList.remove('ring-2', 'ring-primary'), 2000);
                            }
                          }
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-medium">Zeile {rowInfo.row}</span>
                          {rowInfo.studentName && (
                            <span className="text-xs text-muted-foreground">— {rowInfo.studentName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {rowInfo.isCurrent && (
                            <Badge className="text-xs">aktuell</Badge>
                          )}
                          {selectedMasterRow === rowInfo.row && !rowInfo.isCurrent && (
                            <Badge variant="outline" className="text-xs border-primary text-primary">Master</Badge>
                          )}
                          {!rowInfo.isCurrent && rowInfo.hasError && (
                            <Badge variant="destructive" className="text-xs">Fehler</Badge>
                          )}
                          {!rowInfo.isCurrent && !rowInfo.hasError && selectedMasterRow !== rowInfo.row && (
                            <Badge variant="secondary" className="text-xs">Original</Badge>
                          )}
                          {!rowInfo.isCurrent && (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Aktueller Wert:</label>
              <div className="p-2 bg-destructive/10 rounded border border-destructive/20 font-mono text-sm">
                {currentError.value || '(leer)'}
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Korrigierter Wert:</label>
              {currentError && (NATIONALITY_COLUMNS.has(currentError.column) || LANGUAGE_COLUMNS.has(currentError.column)) ? (
                (() => {
                  const isNatCol = NATIONALITY_COLUMNS.has(currentError.column);
                  const items = isNatCol ? NATIONALITIES_SORTED : BISTA_LANGUAGES_SORTED;
                  const placeholder = isNatCol ? 'Land suchen...' : 'Sprache suchen...';
                  const hint = isNatCol ? 'Land aus der Liste wählen, dann «Speichern & Weiter»' : 'Sprache aus der Liste wählen, dann «Speichern & Weiter»';
                  return (
                    <>
                      <div className="relative">
                        <Button
                          variant="outline"
                          className="w-full justify-between font-mono"
                          onClick={() => setNationalitySearch(prev => prev === null ? '' : null)}
                        >
                          {stepEditValue || 'Bitte wählen...'}
                          <ChevronDown className={`h-4 w-4 ml-2 opacity-50 transition-transform ${nationalitySearch !== null ? 'rotate-180' : ''}`} />
                        </Button>
                        {nationalitySearch !== null && (
                          <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-background border border-border rounded-md shadow-lg">
                            <div className="p-2">
                              <Input
                                placeholder={placeholder}
                                value={nationalitySearch || ''}
                                onChange={(e) => setNationalitySearch(e.target.value)}
                                className="h-8 text-xs"
                                autoFocus
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                            </div>
                            <ScrollArea className="h-52">
                              <div className="p-1">
                                {items
                                  .filter(n => !nationalitySearch || n.toLowerCase().includes(nationalitySearch.toLowerCase()))
                                  .map(item => (
                                    <button
                                      key={item}
                                      className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                                      onClick={() => {
                                        setStepEditValue(item);
                                        setNationalitySearch(null);
                                      }}
                                    >
                                      {item}
                                    </button>
                                  ))}
                              </div>
                            </ScrollArea>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {hint}
                      </p>
                    </>
                  );
                })()
              ) : (
                <>
                  <Input
                    value={stepEditValue}
                    onChange={(e) => setStepEditValue(e.target.value)}
                    placeholder="Korrigierten Wert eingeben..."
                    className="font-mono"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleStepSave();
                      } else if (e.key === 'Escape') {
                        handleStepSkip();
                      }
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter = Speichern & Weiter | Escape = Überspringen
                  </p>
                </>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleStepPrev}
                disabled={currentErrorIndex === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Zurück
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleStepSkip}
                >
                  Überspringen
                </Button>
                <Button
                  onClick={handleStepSave}
                  className="gap-1"
                >
                  <Save className="h-4 w-4" />
                  Speichern & Weiter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Manual correction button */}
      {uncorrectedErrors.length > 0 && !stepByStepMode && (
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => startStepByStep()}
            className="gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Manuelle Schritt-für-Schritt Korrektur starten
          </Button>
        </div>
      )}

      {/* Navigation buttons above table */}
      <NavigationButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel="Weiter zur Vorschau"
        size="lg"
      />

      {errors.length === 0 ? (
        <Alert className="border-pupil-success bg-pupil-success/10">
          <CheckCircle className="h-4 w-4 text-pupil-success" />
          <AlertDescription className="text-pupil-success">
            Alle Daten sind valide. Sie können mit dem Export fortfahren.
          </AlertDescription>
        </Alert>
      ) : (
        <ErrorTable
          errors={errors}
          dedicatedSectionErrorKeys={dedicatedSectionErrorKeys}
          onErrorCorrect={onErrorCorrect}
          onStartStepByStep={startStepByStep}
        />
      )}
      {/* Sticky Bottom Navigation Bar — mobile only (desktop uses inline NavigationButtons above) */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t shadow-[0_-4px_12px_rgba(0,0,0,0.1)] z-50 md:hidden">
        <div className="container mx-auto px-4 max-w-5xl py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {uncorrectedErrors.length > 0 && (
              <Badge variant="destructive" className="text-xs px-2 py-0.5">
                {uncorrectedErrors.length} offen
              </Badge>
            )}
            {correctedErrors.length > 0 && (
              <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs px-2 py-0.5">
                {correctedErrors.length} ok
              </Badge>
            )}
            {errors.length === 0 && (
              <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Keine Fehler
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onBack}>
              Zurück
            </Button>
            <Button onClick={onNext} size="sm">
              Weiter
              {uncorrectedErrors.length > 0 && (
                <Badge variant="secondary" className="ml-2 bg-yellow-100 text-yellow-800 text-xs">
                  {uncorrectedErrors.length} ⚠
                </Badge>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
