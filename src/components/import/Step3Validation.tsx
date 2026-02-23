import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { AlertCircle, CheckCircle, Edit2, Save, Zap, Loader2, ChevronLeft, ChevronRight, X, Cpu, AlertTriangle, Copy, Users, Search, ChevronDown, ChevronUp, UserCog, Phone, Hash, Mail, MapPin, User, CalendarDays, CreditCard, ArrowRight, Scissors, Info, Languages, Globe } from 'lucide-react';
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
import { useValidationWorker, type AnalysisPattern } from '@/hooks/useValidationWorker';
import { 
  applyLocalCorrection, 
  type LocalSuggestion,
  formatSwissPhone,
  formatAHV,
  formatSwissPLZ,
  formatEmail,
  convertExcelDate,
  formatGender
} from '@/lib/localBulkCorrections';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';

// Interface for parent ID inconsistency groups
interface ParentIdInconsistencyGroup {
  identifier: string; // e.g., "AHV: 756.1234.5678.90" or "Max Müller, Hauptstrasse 1"
  column: string; // e.g., "P_ERZ1_ID"
  correctId: string; // The ID from the first occurrence
  matchReason: string; // e.g., "AHV-Nummer – Hohe Zuverlässigkeit"
  severity?: 'error' | 'warning'; // warning = name_only strategy
  parentName?: string;   // Vorname + Name of the parent
  parentAddress?: string; // Strasse + PLZ + Ort
  affectedRows: {
    row: number;
    currentId: string;
    studentName: string | null;
  }[];
}

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
  const [editingCell, setEditingCell] = useState<{ row: number; column: string } | null>(null);
  const [editValue, setEditValue] = useState('');
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
  
  // Parent ID consolidation UI state
  const [parentConsolidationSearch, setParentConsolidationSearch] = useState('');
  const [parentConsolidationPage, setParentConsolidationPage] = useState(0);
  const [parentConsolidationExpanded, setParentConsolidationExpanded] = useState(false);
  const [parentReliabilityFilter, setParentReliabilityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
  const PARENTS_PER_PAGE = 4;

  // Name change UI state
  const [nameChangeExpanded, setNameChangeExpanded] = useState(true);
  const [nameChangePage, setNameChangePage] = useState(0);
  const NAME_CHANGES_PER_PAGE = 5;
  const [expandedParentGroups, setExpandedParentGroups] = useState<Set<string>>(new Set());
  const [expandedNameChanges, setExpandedNameChanges] = useState<Set<string>>(new Set());
  const [expandedErrorColumns, setExpandedErrorColumns] = useState<Set<string>>(new Set(['__first__']));
  
  // Filter toggle: show only open (uncorrected) errors in table
  const [showOnlyOpenErrors, setShowOnlyOpenErrors] = useState(true);

  // Language dropdown state: tracks which cell has the dropdown open
  const [languageDropdownCell, setLanguageDropdownCell] = useState<{ row: number; column: string } | null>(null);
  const LANGUAGE_COLUMNS = new Set(['S_Muttersprache', 'S_Umgangssprache']);
  const BISTA_LANGUAGES_SORTED = useMemo(() => [...VALID_BISTA_LANGUAGES].sort((a, b) => a.localeCompare(b, 'de')), []);

  // Nationality dropdown state
  const [nationalityDropdownCell, setNationalityDropdownCell] = useState<{ row: number; column: string } | null>(null);
  const NATIONALITY_COLUMNS = new Set(['S_Nationalitaet']);
  const NATIONALITIES_SORTED = useMemo(() => [...VALID_NATIONALITIES].sort((a, b) => a.localeCompare(b, 'de')), []);
  const [nationalitySearch, setNationalitySearch] = useState<string | null>(null);

  const toggleParentGroupExpanded = (key: string) =>
    setExpandedParentGroups(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
  const toggleNameChangeExpanded = (key: string) =>
    setExpandedNameChanges(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  const { toast } = useToast();

  // Auto-scroll to step-by-step card when activated
  useEffect(() => {
    if (stepByStepMode && currentError && stepByStepRef.current) {
      stepByStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [stepByStepMode]);
  
  // Web Worker for background processing
  const { analyze, isProcessing: isAnalyzing, error: workerError } = useValidationWorker();

  const uncorrectedErrors = useMemo(() => errors.filter(e => e.correctedValue === undefined), [errors]);
  const correctedErrors = useMemo(() => errors.filter(e => e.correctedValue !== undefined), [errors]);

  // Helper function to get student name - must be defined BEFORE useMemo that uses it
  const getStudentNameForRow = useCallback((rowNumber: number) => {
    const row = rows.find((_, index) => index + 1 === rowNumber);
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
      const key = `${error.column}:${identifier}`;
      
      const existing = groupedByIdentifier.get(key);
      if (existing) {
        existing.push(error);
      } else {
        groupedByIdentifier.set(key, [error]);
      }
    }
    
    // Convert to groups
    groupedByIdentifier.forEach((groupErrors, key) => {
      const [column, identifier] = key.split(':', 2);
      
      // Get correct ID from first error message
      const firstError = groupErrors[0];
      const correctIdMatch = firstError.message.match(/die ID '([^']+)'/);
      const correctId = correctIdMatch ? correctIdMatch[1] : '';
      
      if (!correctId) return;
      
      // Extract match reason: "[Erkannt via: AHV-Nummer – Hohe Zuverlässigkeit]"
      const matchReasonMatch = firstError.message.match(/\[Erkannt via: ([^\]]+)\]/);
      const matchReason = matchReasonMatch ? matchReasonMatch[1] : '';
      
      const affectedRows = groupErrors.map(e => ({
        row: e.row,
        currentId: e.value,
        studentName: getStudentNameForRow(e.row),
      }));

      // Extract parent name & address from first row that has data for this column
      // column is e.g. "P_ERZ1_ID" → prefix is "P_ERZ1_"
      const prefix = column.replace(/_ID$/, '_');
      const firstRowIndex = groupErrors[0].row - 1; // rows is 0-indexed
      const sampleRow = rows[firstRowIndex] ?? {};
      const vorname = sampleRow[`${prefix}Vorname`] ?? '';
      const name = sampleRow[`${prefix}Name`] ?? '';
      const strasse = sampleRow[`${prefix}Strasse`] ?? '';
      const plz = sampleRow[`${prefix}PLZ`] ?? '';
      const ort = sampleRow[`${prefix}Ort`] ?? '';

      const parentName = [vorname, name].filter(Boolean).join(' ') || undefined;
      const addressParts = [strasse, [plz, ort].filter(Boolean).join(' ')].filter(Boolean);
      const parentAddress = addressParts.join(', ') || undefined;
      
      groups.push({
        identifier,
        column,
        correctId,
        matchReason,
        severity: groupErrors.some(e => e.severity === 'warning') ? 'warning' : 'error',
        parentName,
        parentAddress,
        affectedRows,
      });
    });
    
    return groups;
  }, [uncorrectedErrors, getStudentNameForRow, rows]);


  // Apply bulk correction for all parent ID inconsistencies at once
  const applyBulkParentIdCorrection = useCallback(() => {
    if (parentIdInconsistencyGroups.length === 0) return;
    
    const corrections: { row: number; column: string; value: string }[] = [];
    let totalAffectedChildren = 0;
    
    for (const group of parentIdInconsistencyGroups) {
      for (const affectedRow of group.affectedRows) {
        corrections.push({
          row: affectedRow.row,
          column: group.column,
          value: group.correctId,
        });
        totalAffectedChildren++;
      }
    }
    
    if (corrections.length > 0) {
      onBulkCorrect(corrections, 'bulk');
      toast({
        title: 'Eltern-IDs konsolidiert',
        description: `${parentIdInconsistencyGroups.length} Eltern mit insgesamt ${totalAffectedChildren} Kindern korrigiert.`,
      });
    }
  }, [parentIdInconsistencyGroups, onBulkCorrect, toast]);

  // Dismiss a single parent ID inconsistency group (mark all affected rows as "ignored")
  const dismissParentGroup = useCallback((group: ParentIdInconsistencyGroup) => {
    const corrections = group.affectedRows.map(r => ({
      row: r.row,
      column: group.column,
      value: r.currentId, // keep current value → marks as correctedValue = same → disappears from uncorrected
    }));
    onBulkCorrect(corrections, 'bulk');
    toast({
      title: 'Inkonsistenz ignoriert',
      description: `ID-Konflikt für "${group.identifier}" wurde als geprüft markiert.`,
    });
  }, [onBulkCorrect, toast]);

  // Helper: compare parent fields across all affected rows for a consolidation group
  function getParentFieldComparison(
    affectedRows: { row: number; currentId: string; studentName: string | null }[],
    column: string,
    allRows: ParsedRow[]
  ) {
    const prefix = column.replace(/_ID$/, '_');
    const FIELDS_TO_COMPARE = [
      { key: 'Name',             label: 'Name' },
      { key: 'Vorname',          label: 'Vorname' },
      { key: 'AHV',              label: 'AHV' },
      { key: 'Strasse',          label: 'Strasse' },
      { key: 'PLZ',              label: 'PLZ' },
      { key: 'Ort',              label: 'Ort' },
      { key: 'EMail',            label: 'E-Mail' },
      { key: 'TelefonPrivat',    label: 'Tel. Privat' },
      { key: 'TelefonGeschaeft', label: 'Tel. Geschäft' },
      { key: 'Mobil',            label: 'Mobil' },
      { key: 'Rolle',            label: 'Rolle' },
      { key: 'Beruf',            label: 'Beruf' },
    ];
    return FIELDS_TO_COMPARE.map(field => {
      const values = affectedRows.map(r => {
        const row = allRows[r.row - 1];
        return String(row?.[`${prefix}${field.key}`] ?? '').trim();
      });
      const uniqueNonEmpty = [...new Set(values.filter(v => v !== ''))];
      const allEmpty = values.every(v => v === '');
      const allSame = uniqueNonEmpty.length <= 1;
      return {
        fieldKey: field.key,
        label: field.label,
        values,
        allSame,
        allEmpty,
        uniqueValues: uniqueNonEmpty,
        singleValue: allSame ? (uniqueNonEmpty[0] ?? '') : null,
      };
    }).filter(f => !f.allEmpty);
  }

  // Total count for summary
  const totalParentIdInconsistencies = useMemo(() =>
    parentIdInconsistencyGroups.reduce((sum, g) => sum + g.affectedRows.length, 0),
    [parentIdInconsistencyGroups]
  );

  // Filtered parent ID groups for search + reliability filter
  const filteredParentGroups = useMemo(() => {
    let result = parentIdInconsistencyGroups;

    // Reliability filter
    if (parentReliabilityFilter !== 'all') {
      result = result.filter(group => {
        const r = group.matchReason.toLowerCase();
        if (parentReliabilityFilter === 'high') return r.includes('hohe');
        if (parentReliabilityFilter === 'medium') return r.includes('mittlere');
        if (parentReliabilityFilter === 'low') return r.includes('tiefe');
        return true;
      });
    }

    // Text search
    if (parentConsolidationSearch.trim()) {
      const searchLower = parentConsolidationSearch.toLowerCase();
      result = result.filter(group =>
        group.identifier.toLowerCase().includes(searchLower) ||
        group.correctId.toLowerCase().includes(searchLower) ||
        group.column.toLowerCase().includes(searchLower) ||
        (group.parentName?.toLowerCase().includes(searchLower) ?? false) ||
        group.affectedRows.some(r => r.studentName?.toLowerCase().includes(searchLower))
      );
    }

    return result;
  }, [parentIdInconsistencyGroups, parentConsolidationSearch, parentReliabilityFilter]);

  // Paginated parent groups
  const paginatedParentGroups = useMemo(() => {
    const start = parentConsolidationPage * PARENTS_PER_PAGE;
    return filteredParentGroups.slice(start, start + PARENTS_PER_PAGE);
  }, [filteredParentGroups, parentConsolidationPage, PARENTS_PER_PAGE]);

  const totalParentPages = Math.ceil(filteredParentGroups.length / PARENTS_PER_PAGE);

  // Reset page when search or filter changes
  useEffect(() => {
    setParentConsolidationPage(0);
  }, [parentConsolidationSearch, parentReliabilityFilter]);

  // Detect name change warnings from uncorrected errors
  interface NameChangeEntry {
    error: ValidationError;
    changeType: string;
    fromName: string;
    fromRow: number;
    toName: string;
    studentName: string;
    column: string;
  }

  const nameChangeEntries = useMemo((): NameChangeEntry[] => {
    const entries: NameChangeEntry[] = [];
    for (const error of uncorrectedErrors) {
      if (!error.message.includes('Möglicher Namenswechsel')) continue;
      const typeMatch = error.message.match(/Möglicher Namenswechsel \(([^)]+)\)/);
      const fromMatch = error.message.match(/"([^"]+)" \(Zeile (\d+)\)/);
      const toMatch = error.message.match(/→ "([^"]+)"/);
      const studentMatch = error.message.match(/Schüler\/in: ([^)]+)/);
      entries.push({
        error,
        changeType: typeMatch?.[1] ?? 'Unbekannt',
        fromName: fromMatch?.[1] ?? error.value,
        fromRow: fromMatch ? parseInt(fromMatch[2]) : error.row,
        toName: toMatch?.[1] ?? error.value,
        studentName: studentMatch?.[1] ?? (getStudentNameForRow(error.row) ?? `Zeile ${error.row}`),
        column: error.column,
      });
    }
    return entries;
  }, [uncorrectedErrors, getStudentNameForRow]);

  const paginatedNameChanges = useMemo(() => {
    const start = nameChangePage * NAME_CHANGES_PER_PAGE;
    return nameChangeEntries.slice(start, start + NAME_CHANGES_PER_PAGE);
  }, [nameChangeEntries, nameChangePage, NAME_CHANGES_PER_PAGE]);

  const totalNameChangePages = Math.ceil(nameChangeEntries.length / NAME_CHANGES_PER_PAGE);

  const dismissNameChange = useCallback((entry: NameChangeEntry) => {
    onErrorCorrect(entry.error.row, entry.error.column, entry.error.value, 'manual');
  }, [onErrorCorrect]);

  const dismissAllNameChanges = useCallback(() => {
    const corrections = nameChangeEntries.map(e => ({
      row: e.error.row,
      column: e.error.column,
      value: e.error.value,
    }));
    onBulkCorrect(corrections, 'bulk');
    toast({
      title: 'Namenswechsel bestätigt',
      description: `${corrections.length} Fälle als geprüft markiert.`,
    });
  }, [nameChangeEntries, onBulkCorrect, toast]);



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

  const handleStartEdit = (row: number, column: string, currentValue: string) => {
    setEditingCell({ row, column });
    setEditValue(currentValue);
  };

  const handleSaveEdit = () => {
    if (editingCell) {
      onErrorCorrect(editingCell.row, editingCell.column, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  };

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
      const rowData = rows[rowNum - 1];
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
        const rowData = rows[rowNum - 1];
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

    // Suggest a solution based on the type of duplicate and differences
    let suggestedSolution = '';
    let warningMessage = '';
    
    if (isParentInconsistency) {
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
      isParentInconsistency
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
    
    const masterRowData = rows[selectedMasterRow - 1];
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

  // Convert worker patterns to LocalSuggestion format
  const convertPatternToSuggestion = useCallback((pattern: AnalysisPattern): LocalSuggestion => {
    return {
      type: pattern.type,
      affectedColumn: pattern.column,
      affectedRows: pattern.affectedRows,
      pattern: pattern.description,
      suggestion: pattern.canAutoFix 
        ? 'Automatische Korrektur verfügbar - kein Datenversand erforderlich'
        : 'Manuelle Überprüfung empfohlen',
      autoFix: pattern.canAutoFix,
      fixFunction: pattern.type, // Worker uses type as fix function identifier
      correctValue: null,
    };
  }, []);

  // Analyze errors using Web Worker - runs in background thread, never blocks UI
  const analyzeWithWorker = useCallback(async (silent: boolean = false) => {
    if (uncorrectedErrors.length === 0) {
      setLocalSuggestions([]);
      return;
    }
    
    const startTime = performance.now();
    
    try {
      // This runs entirely in a background Web Worker thread
      // Use only uncorrected errors so resolved duplicates don't appear
      const result = await analyze(uncorrectedErrors, rows);
      const duration = performance.now() - startTime;
      setAnalysisTime(duration);
      setHasRunAnalysis(true);
      
      // Convert worker patterns to LocalSuggestion format
      const suggestions = result.patterns.map(convertPatternToSuggestion);
      setLocalSuggestions(suggestions);
      
      if (!silent) {
        if (suggestions.length > 0) {
          toast({
            title: 'Hintergrund-Analyse abgeschlossen',
            description: `${suggestions.length} Korrekturvorschläge gefunden (${Math.round(duration)}ms) - Web Worker`,
          });
        } else {
          toast({
            title: 'Keine automatischen Korrekturen',
            description: 'Bitte nutzen Sie die manuelle Schritt-für-Schritt Korrektur.',
          });
        }
      }
    } catch (err) {
      console.error('Worker analysis failed:', err);
      if (!silent) {
        toast({
          title: 'Analysefehler',
          description: 'Die Hintergrundanalyse konnte nicht durchgeführt werden.',
          variant: 'destructive',
        });
      }
    }
  }, [uncorrectedErrors, rows, analyze, convertPatternToSuggestion, toast]);

  // Automatically run analysis on mount when there are uncorrected errors
  useEffect(() => {
    if (!hasRunAnalysis && uncorrectedErrors.length > 0) {
      analyzeWithWorker(false);
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
      analyzeWithWorker(true); // Silent re-analysis
    }
    
    setPreviousUncorrectedCount(uncorrectedErrors.length);
  }, [uncorrectedErrors.length, hasRunAnalysis, previousUncorrectedCount, analyzeWithWorker]);

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

  // Pre-compute which suggestions actually have applicable corrections
  // Only include suggestions that still have uncorrected errors for their column
  const suggestionsWithApplicability = useMemo(() => {
    const uncorrectedRowsByColumn = new Map<string, Set<number>>();
    for (const err of uncorrectedErrors) {
      if (!uncorrectedRowsByColumn.has(err.column)) uncorrectedRowsByColumn.set(err.column, new Set());
      uncorrectedRowsByColumn.get(err.column)!.add(err.row);
    }
    return localSuggestions
      .map(suggestion => ({
        suggestion,
        hasApplicableCorrections: suggestion.autoFix
          ? applyLocalCorrection(suggestion, errors).length > 0
          : false,
      }))
      .filter(({ suggestion }) => {
        // Hide if all affected rows for this column are already corrected
        const uncorrected = uncorrectedRowsByColumn.get(suggestion.affectedColumn);
        return suggestion.affectedRows.some(row => uncorrected?.has(row));
      });
  }, [localSuggestions, errors, uncorrectedErrors]);

  // Group errors by column for grouped display
  const errorsByColumn = useMemo(() => {
    const map = new Map<string, ValidationError[]>();
    for (const e of errors) {
      if (!map.has(e.column)) map.set(e.column, []);
      map.get(e.column)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const aUncorrected = a[1].filter(e => !e.correctedValue).length;
      const bUncorrected = b[1].filter(e => !e.correctedValue).length;
      return bUncorrected - aUncorrected;
    });
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

  // Helper: map pattern type to display metadata (icon, label, before/after example)
  function getPatternMeta(type: string): { icon: React.ReactNode; label: string; example?: { from: string; to: string } } {
    switch (type) {
      case 'phone_format':
        return { icon: <Phone className="h-3.5 w-3.5 text-pupil-success" />, label: 'Telefonnummer', example: { from: '0791234567', to: '+41 79 123 45 67' } };
      case 'ahv_format':
        return { icon: <Hash className="h-3.5 w-3.5 text-pupil-success" />, label: 'AHV-Nummer', example: { from: '7561234567890', to: '756.1234.5678.90' } };
      case 'email_format':
        return { icon: <Mail className="h-3.5 w-3.5 text-pupil-success" />, label: 'E-Mail', example: { from: 'name @gmial.com', to: 'name@gmail.com' } };
      case 'plz_format':
        return { icon: <MapPin className="h-3.5 w-3.5 text-pupil-success" />, label: 'Postleitzahl', example: { from: '8001 Zürich', to: '8001' } };
      case 'gender_format':
        return { icon: <User className="h-3.5 w-3.5 text-pupil-success" />, label: 'Geschlecht', example: { from: 'männlich', to: 'M' } };
      case 'name_format':
        return { icon: <User className="h-3.5 w-3.5 text-pupil-success" />, label: 'Namen', example: { from: 'MÜLLER', to: 'Müller' } };
      case 'street_format':
        return { icon: <MapPin className="h-3.5 w-3.5 text-pupil-success" />, label: 'Strasse', example: { from: 'HAUPTSTRASSE 1', to: 'Hauptstrasse 1' } };
      case 'date_format':
        return { icon: <CalendarDays className="h-3.5 w-3.5 text-pupil-success" />, label: 'Datum (Excel)', example: { from: '45291', to: '01.01.2024' } };
      case 'date_de_format':
        return { icon: <CalendarDays className="h-3.5 w-3.5 text-pupil-success" />, label: 'Datumsformat', example: { from: '2014-03-15', to: '15.03.2014' } };
      case 'whitespace_trim':
        return { icon: <Scissors className="h-3.5 w-3.5 text-pupil-success" />, label: 'Leerzeichen trimmen', example: { from: ' Meier ', to: 'Meier' } };
      case 'iban_format':
        return { icon: <CreditCard className="h-3.5 w-3.5 text-pupil-success" />, label: 'IBAN', example: { from: 'CH930076201162385295 7', to: 'CH93 0076 2011 6238 5295 7' } };
      case 'duplicate':
        return { icon: <Users className="h-3.5 w-3.5 text-muted-foreground" />, label: 'Duplikate' };
      case 'parent_id_inconsistent':
        return { icon: <UserCog className="h-3.5 w-3.5 text-muted-foreground" />, label: 'Eltern-ID Inkonsistenz' };
      case 'nationality_correction':
        return { icon: <Globe className="h-3.5 w-3.5 text-pupil-success" />, label: 'Nationalität', example: { from: 'Türkei', to: 'Türkiye' } };
      case 'manual_review':
        return { icon: <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />, label: 'Manuelle Prüfung' };
      case 'language_bista':
        return { icon: <Languages className="h-3.5 w-3.5 text-pupil-success" />, label: 'BISTA-Sprache', example: { from: 'Englsh', to: 'Englisch' } };
      default:
        return { icon: <Zap className="h-3.5 w-3.5 text-pupil-success" />, label: type };
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Daten validieren</h2>
        <p className="text-muted-foreground mt-1">
          Überprüfen und korrigieren Sie fehlerhafte Daten vor dem Export.
        </p>
      </div>

      {/* Summary */}
      <div className={`grid gap-4 ${nameChangeEntries.length > 0 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3'}`}>
        <div className="p-4 bg-muted rounded-lg text-center">
          <p className="text-3xl font-bold">{rows.length}</p>
          <p className="text-sm text-muted-foreground">Datensätze gesamt</p>
        </div>
        <div className="p-4 bg-destructive/10 rounded-lg text-center">
          <p className="text-3xl font-bold text-destructive">{uncorrectedErrors.length}</p>
          <p className="text-sm text-muted-foreground">Offene Fehler</p>
        </div>
        {nameChangeEntries.length > 0 && (
          <div className="p-4 bg-pupil-warning/10 rounded-lg text-center border border-pupil-warning/20">
            <p className="text-3xl font-bold text-pupil-warning">{nameChangeEntries.length}</p>
            <p className="text-sm text-muted-foreground">Namenswechsel</p>
          </div>
        )}
        <div className="p-4 bg-pupil-success/10 rounded-lg text-center">
          <p className="text-3xl font-bold text-pupil-success">{correctedErrors.length}</p>
          <p className="text-sm text-muted-foreground">Korrigiert</p>
        </div>
      </div>

      {/* Correction progress bar */}
      {errors.length > 0 && (() => {
        const correctionRate = Math.round((correctedErrors.length / errors.length) * 100);
        return (
          <div className="flex items-center gap-3">
            <Progress value={correctionRate} className="flex-1 h-2" />
            <span className="text-sm text-muted-foreground shrink-0 min-w-[10rem] text-right">
              {correctionRate === 100 ? (
                <span className="text-pupil-success font-medium">✓ Alle Fehler behoben</span>
              ) : correctionRate > 0 ? (
                <>{correctionRate}% der Fehler behoben</>
              ) : (
                <>{errors.length} Fehler ausstehend</>
              )}
            </span>
          </div>
        );
      })()}

      {/* Bulk Parent ID Consolidation Card - Optimized for 800+ entries */}
      {parentIdInconsistencyGroups.length > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Users className="h-5 w-5 text-blue-500" />
                <CardTitle className="text-lg">Eltern-ID Konsolidierung</CardTitle>
                <Badge variant="outline" className="text-blue-500 border-blue-500/30">
                  {parentIdInconsistencyGroups.length} Eltern
                </Badge>
                <Badge variant="outline" className="text-blue-500 border-blue-500/30">
                  {totalParentIdInconsistencies} Kinder
                </Badge>
              </div>
              <Button 
                onClick={applyBulkParentIdCorrection}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <CheckCircle className="h-4 w-4" />
                Alle {parentIdInconsistencyGroups.length} konsolidieren
              </Button>
            </div>
            <CardDescription>
              Gleiche Eltern wurden mit unterschiedlichen IDs erfasst. Mit einem Klick alle auf die korrekte ID vereinheitlichen.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Quick stats for large datasets */}
            {parentIdInconsistencyGroups.length > 10 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{parentIdInconsistencyGroups.length}</p>
                  <p className="text-xs text-muted-foreground">Eltern zu konsolidieren</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">{totalParentIdInconsistencies}</p>
                  <p className="text-xs text-muted-foreground">Betroffene Kinder</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {new Set(parentIdInconsistencyGroups.map(g => g.column)).size}
                  </p>
                  <p className="text-xs text-muted-foreground">Spalten betroffen</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {Math.round((parentIdInconsistencyGroups.length / rows.length) * 100)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Betroffene Zeilen</p>
                </div>
              </div>
            )}

            {/* Collapsible detail list */}
            <Collapsible open={parentConsolidationExpanded} onOpenChange={setParentConsolidationExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  {parentConsolidationExpanded ? (
                    <>
                      <ChevronUp className="h-4 w-4" />
                      Details ausblenden
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4" />
                      Details anzeigen ({parentIdInconsistencyGroups.length} Eltern)
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="mt-4 space-y-3">
                {/* Reliability filter buttons - always visible */}
                {(() => {
                  const countHigh = parentIdInconsistencyGroups.filter(g => g.matchReason.toLowerCase().includes('hohe')).length;
                  const countMedium = parentIdInconsistencyGroups.filter(g => g.matchReason.toLowerCase().includes('mittlere')).length;
                  const countLow = parentIdInconsistencyGroups.filter(g => g.matchReason.toLowerCase().includes('tiefe')).length;
                  return (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={parentReliabilityFilter === 'all' ? 'default' : 'outline'}
                        onClick={() => setParentReliabilityFilter('all')}
                        className="gap-1.5"
                      >
                        Alle ({parentIdInconsistencyGroups.length})
                      </Button>
                      {countHigh > 0 && (
                        <Button
                          size="sm"
                          variant={parentReliabilityFilter === 'high' ? 'default' : 'outline'}
                          onClick={() => setParentReliabilityFilter('high')}
                          className={`gap-1.5 ${parentReliabilityFilter !== 'high' ? 'border-green-500/50 text-green-700 hover:bg-green-50' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                          <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />
                          Hohe Zuverlässigkeit ({countHigh})
                        </Button>
                      )}
                      {countMedium > 0 && (
                        <Button
                          size="sm"
                          variant={parentReliabilityFilter === 'medium' ? 'default' : 'outline'}
                          onClick={() => setParentReliabilityFilter('medium')}
                          className={`gap-1.5 ${parentReliabilityFilter !== 'medium' ? 'border-pupil-warning/50 text-pupil-warning hover:bg-pupil-warning/5' : 'bg-pupil-warning hover:bg-pupil-warning/90 text-white'}`}
                        >
                          <span className="inline-block w-2 h-2 rounded-full bg-pupil-warning shrink-0" />
                          Mittlere Zuverlässigkeit ({countMedium})
                        </Button>
                      )}
                      {countLow > 0 && (
                        <Button
                          size="sm"
                          variant={parentReliabilityFilter === 'low' ? 'default' : 'outline'}
                          onClick={() => setParentReliabilityFilter('low')}
                          className={`gap-1.5 ${parentReliabilityFilter !== 'low' ? 'border-destructive/50 text-destructive hover:bg-destructive/5' : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'}`}
                        >
                          <span className="inline-block w-2 h-2 rounded-full bg-destructive shrink-0" />
                          Tiefe Zuverlässigkeit ({countLow})
                        </Button>
                      )}
                    </div>
                  );
                })()}

                {/* Search for large datasets */}
                {parentIdInconsistencyGroups.length > 10 && (
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Suchen nach Name, ID, Spalte..."
                      value={parentConsolidationSearch}
                      onChange={(e) => setParentConsolidationSearch(e.target.value)}
                      className="pl-10"
                    />
                    {parentConsolidationSearch && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                        onClick={() => setParentConsolidationSearch('')}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                )}
                
                {/* Results info */}
                {(parentConsolidationSearch || parentReliabilityFilter !== 'all') && (
                  <p className="text-sm text-muted-foreground">
                    {filteredParentGroups.length} von {parentIdInconsistencyGroups.length} Ergebnissen
                  </p>
                )}
                
                {/* Paginated list */}
                <div>
                  <div className="space-y-2">
                    {paginatedParentGroups.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Keine Ergebnisse{parentConsolidationSearch ? ` für "${parentConsolidationSearch}"` : ''}{parentReliabilityFilter !== 'all' ? ' in dieser Kategorie' : ''}
                      </p>
                    ) : (
                       paginatedParentGroups.map((group, idx) => {
                          const groupKey = `${group.column}:${group.identifier}`;
                          const isExpanded = expandedParentGroups.has(groupKey);
                          const prefix = group.column.replace(/_ID$/, '_');
                          const PERSON_FIELDS = ['Vorname', 'Name', 'Strasse', 'PLZ', 'Ort', 'AHV'];
                          return (
                         <div key={`${group.column}-${group.identifier}-${idx}`} className="bg-background rounded-lg border overflow-hidden">
                           {/* Card header */}
                           <div className="p-3 space-y-2">
                           <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <Badge variant="outline" className="shrink-0">{group.column}</Badge>
                                  {group.matchReason && (
                                    <Badge
                                      variant="secondary"
                                      className={`text-xs shrink-0 ${group.severity === 'warning' ? 'border border-pupil-warning/40 text-pupil-warning bg-pupil-warning/10' : ''}`}
                                    >
                                      {group.matchReason}
                                    </Badge>
                                  )}
                                </div>

                                {/* Person info */}
                                {(group.parentName || group.parentAddress) && (
                                  <div className="mb-2 space-y-0.5">
                                    {group.parentName && (
                                      <p className="text-sm font-semibold">{group.parentName}</p>
                                    )}
                                    {group.parentAddress && (
                                      <p className="text-xs text-muted-foreground">{group.parentAddress}</p>
                                    )}
                                  </div>
                                )}

                                <div className="flex items-center gap-2 text-sm flex-wrap">
                                  <span className="text-muted-foreground shrink-0">Korrekte ID:</span>
                                  <code className="px-1.5 py-0.5 bg-blue-500/10 rounded text-blue-600 font-mono text-xs truncate">
                                    {group.correctId}
                                  </code>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                                          <Info className="h-3 w-3" />
                                          Aus Zeile {group.affectedRows[0]?.row} (erster Eintrag)
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-xs text-xs">
                                        Die «korrekte ID» ist der Wert aus dem <strong>ersten Auftreten</strong> dieses Elternteils in der Datei (Zeile {group.affectedRows[0]?.row}).<br />
                                        Erkannt via: {group.matchReason}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                <div className="mt-1.5 text-xs text-muted-foreground">
                                  <span className="font-medium">{group.affectedRows.length} betroffene {group.affectedRows.length === 1 ? 'Kind' : 'Kinder'}:</span>
                                  <span className="ml-1">
                                    {group.affectedRows.slice(0, 3).map((r, i) => (
                                      <span key={r.row}>
                                        {i > 0 && ', '}
                                        {r.studentName || `Zeile ${r.row}`}
                                        {r.currentId !== group.correctId && <span className="text-destructive"> ✕</span>}
                                      </span>
                                    ))}
                                    {group.affectedRows.length > 3 && ` +${group.affectedRows.length - 3} weitere`}
                                  </span>
                                </div>
                                {/* Warning badge if there are field differences */}
                                {(() => {
                                  const fc = getParentFieldComparison(group.affectedRows, group.column, rows);
                                  const diffCount = fc.filter(f => !f.allSame).length;
                                  return diffCount > 0 ? (
                                    <div className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                                      <AlertTriangle className="h-3 w-3 shrink-0" />
                                      <span>{diffCount} {diffCount === 1 ? 'Feld' : 'Felder'} mit Unterschieden – Details prüfen</span>
                                    </div>
                                  ) : null;
                                })()}
                              </div>
                            <div className="flex gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant={isExpanded ? 'default' : 'outline'}
                                onClick={(e) => { e.stopPropagation(); toggleParentGroupExpanded(groupKey); }}
                                className="gap-1"
                              >
                                {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                Details
                              </Button>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => { e.stopPropagation(); dismissParentGroup(group); }}
                                      className="gap-1.5 text-muted-foreground hover:text-foreground"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                      Ignorieren
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs">
                                    Markiert diesen ID-Konflikt als geprüft und blendet ihn aus.<br />
                                    Der aktuelle Wert bleibt unverändert im Änderungsprotokoll sichtbar.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                          </div>

          {/* Inline details expansion – 2-Karten-Layout + Feldvergleich */}
                          {isExpanded && (() => {
                            const fieldComparison = getParentFieldComparison(group.affectedRows, group.column, rows);
                            return (
                            <div className="border-t bg-muted/20 p-3 space-y-3">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                                Einträge im Vergleich
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                {/* Linke Karte: Aktueller Stand */}
                                <div className="rounded-md border bg-muted/50 p-2.5 space-y-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">Aktueller Stand</span>
                                    <span className="text-muted-foreground text-[10px]">{group.affectedRows.length} Einträge</span>
                                  </div>
                                  <div className="space-y-1 border-t pt-1.5">
                                    {group.affectedRows.map(r => (
                                      <div key={r.row} className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-muted-foreground truncate">{r.studentName || `Zeile ${r.row}`}:</span>
                                        <code className={`px-1.5 py-0.5 rounded font-mono ${r.currentId !== group.correctId ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700'}`}>
                                          {r.currentId}
                                        </code>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                                {/* Rechte Karte: Nach Konsolidierung */}
                                <div className="rounded-md border bg-blue-500/5 border-blue-500/30 p-2.5 space-y-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-blue-700">Nach Konsolidierung</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 pb-1.5 border-b">
                                    <span className="text-muted-foreground shrink-0">Einheitliche ID:</span>
                                    <code className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded font-mono font-bold">{group.correctId}</code>
                                  </div>
                                  <div className="space-y-1 pt-0.5">
                                    {group.affectedRows.map(r => (
                                      <div key={r.row} className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-muted-foreground truncate">{r.studentName || `Zeile ${r.row}`}:</span>
                                        {r.currentId !== group.correctId ? (
                                          <div className="flex items-center gap-1">
                                            <code className="px-1 py-0.5 bg-destructive/10 text-destructive rounded font-mono line-through text-[10px]">{r.currentId}</code>
                                            <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                                            <code className="px-1 py-0.5 bg-green-500/10 text-green-700 rounded font-mono text-[10px]">{group.correctId}</code>
                                          </div>
                                        ) : (
                                          <div className="flex items-center gap-1">
                                            <CheckCircle className="h-3 w-3 text-green-500" />
                                            <span className="text-green-700">bereits korrekt</span>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Feldvergleich der Elternperson */}
                              {fieldComparison.length > 0 && (
                                <div className="border-t pt-3 space-y-1.5">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                    Felder der Elternperson
                                  </p>
                                  {fieldComparison.map(field => (
                                    <div
                                      key={field.fieldKey}
                                      className={`rounded-md p-2 text-xs ${field.allSame ? 'bg-muted/30' : 'bg-amber-500/10 border border-amber-500/30'}`}
                                    >
                                      {field.allSame ? (
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground w-28 shrink-0">{field.label}</span>
                                          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                                          <span className="text-foreground truncate">{field.singleValue || '–'}</span>
                                          <span className="text-muted-foreground text-[10px] ml-auto whitespace-nowrap">alle gleich</span>
                                        </div>
                                      ) : (
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                            <span className="font-medium text-amber-700 dark:text-amber-400">{field.label} – Unterschiede</span>
                                          </div>
                                          <div className="grid gap-0.5 pl-4">
                                            {group.affectedRows.map((r, i) => (
                                              <div key={r.row} className="flex items-center gap-2">
                                                <span className="text-muted-foreground w-24 shrink-0 truncate text-[11px]">
                                                  {r.studentName || `Zeile ${r.row}`}:
                                                </span>
                                                <span className={`text-[11px] ${field.values[i] !== field.uniqueValues[0] ? 'text-amber-700 dark:text-amber-400 font-medium' : 'text-foreground'}`}>
                                                  {field.values[i] || '–'}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            );
                          })()}

                         </div>
                          );
                        })
                    )}
                  </div>
                </div>
                
                {/* Pagination controls */}
                {totalParentPages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setParentConsolidationPage(p => Math.max(0, p - 1))}
                      disabled={parentConsolidationPage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Zurück
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Seite {parentConsolidationPage + 1} von {totalParentPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setParentConsolidationPage(p => Math.min(totalParentPages - 1, p + 1))}
                      disabled={parentConsolidationPage >= totalParentPages - 1}
                    >
                      Weiter
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Name Change Detection Card */}
      {nameChangeEntries.length > 0 && (
        <Card className="border-pupil-warning/30 bg-pupil-warning/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <UserCog className="h-5 w-5 text-pupil-warning" />
                <CardTitle className="text-lg">Namenswechsel prüfen</CardTitle>
                <Badge variant="outline" className="text-pupil-warning border-pupil-warning/30">
                  {nameChangeEntries.length} {nameChangeEntries.length === 1 ? 'Fall' : 'Fälle'}
                </Badge>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={dismissAllNameChanges}
                  className="gap-1.5"
                >
                  <CheckCircle className="h-4 w-4" />
                  Alle als geprüft markieren
                </Button>
              </div>
            </div>
            <CardDescription>
              Eltern mit gleichem Vornamen, aber unterschiedlichem Nachnamen wurden gefunden. Bitte manuell prüfen – keine automatischen Korrekturen.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <Collapsible open={nameChangeExpanded} onOpenChange={setNameChangeExpanded}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full gap-2">
                  {nameChangeExpanded ? (
                    <><ChevronUp className="h-4 w-4" />Details ausblenden</>
                  ) : (
                    <><ChevronDown className="h-4 w-4" />Details anzeigen ({nameChangeEntries.length} Fälle)</>
                  )}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent className="mt-3 space-y-2">
                {paginatedNameChanges.map((entry, idx) => {
                  const entryKey = `${entry.error.row}:${entry.error.column}`;
                  const isExpanded = expandedNameChanges.has(entryKey);
                  // Get row data for both rows to show identical fields
                  const fromRow = rows[entry.fromRow - 1] ?? {};
                  const toRow = rows[entry.error.row - 1] ?? {};
                  // Determine which column prefix to check for other name fields
                  const colPrefix = entry.column.replace(/Name$/, '');
                  const vornameCol = `${colPrefix}Vorname`;
                  const sharedVorname = fromRow[vornameCol] ?? toRow[vornameCol];
                  // Other stable identifiers from the student row
                  const studentCols = ['S_ID', 'S_AHV', 'K_Name'];
                  return (
                  <div
                    key={`namechange-${entry.error.row}-${entry.error.column}-${idx}`}
                    className="bg-background rounded-lg border border-pupil-warning/20 overflow-hidden"
                  >
                    {/* Card header */}
                    <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs shrink-0">{entry.column}</Badge>
                          <Badge variant="secondary" className="text-xs">{entry.changeType}</Badge>
                          <span className="text-xs text-muted-foreground shrink-0">Schüler/in:</span>
                          <span className="text-xs font-medium truncate">{entry.studentName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{entry.fromName}</code>
                          <span className="text-muted-foreground">→</span>
                          <code className="px-1.5 py-0.5 bg-pupil-warning/10 rounded text-xs font-mono text-pupil-warning">{entry.toName}</code>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={isExpanded ? 'default' : 'outline'}
                          onClick={(e) => { e.stopPropagation(); toggleNameChangeExpanded(entryKey); }}
                          className="gap-1.5"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); dismissNameChange(entry); }}
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                          title="Kein Namenswechsel – diesen Fall ignorieren und ausblenden"
                        >
                          <X className="h-3.5 w-3.5" />
                          Ignorieren
                        </Button>
                      </div>
                    </div>
                    </div>

                    {/* Inline comparison – Person Card Layout */}
                     {isExpanded && (
                       <div className="border-t bg-muted/20 p-3 space-y-3">
                         <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Einträge im Vergleich</p>
                         <div className="grid grid-cols-2 gap-2">
                           {/* Left card: bisheriger Eintrag */}
                           <div className="rounded-md border bg-muted/50 p-2.5 space-y-2 text-xs">
                             <div className="flex items-center justify-between">
                               <span className="font-semibold text-foreground">Bisheriger Eintrag</span>
                               <span className="text-muted-foreground text-[10px]">Zeile {entry.fromRow}</span>
                             </div>
                             <div className="space-y-1 border-t pt-1.5">
                               <div className="flex items-baseline gap-1">
                                 <span className="text-muted-foreground w-14 shrink-0">Name:</span>
                                 <span className="font-medium">{entry.fromName}</span>
                               </div>
                               {sharedVorname && (
                                 <div className="flex items-baseline gap-1">
                                   <span className="text-muted-foreground w-14 shrink-0">Vorname:</span>
                                   <span className="font-medium">{String(sharedVorname)}</span>
                                 </div>
                               )}
                               {studentCols.map(col => {
                                 const val = fromRow[col];
                                 if (!val) return null;
                                 const label = col === 'S_ID' ? 'S_ID' : col === 'S_AHV' ? 'AHV' : col === 'K_Name' ? 'Klasse' : col;
                                 return (
                                   <div key={col} className="flex items-baseline gap-1">
                                     <span className="text-muted-foreground w-14 shrink-0">{label}:</span>
                                     <span className="font-medium">{String(val)}</span>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                           {/* Right card: neuer Eintrag */}
                           <div className="rounded-md border border-pupil-warning/30 bg-pupil-warning/5 p-2.5 space-y-2 text-xs">
                             <div className="flex items-center justify-between">
                               <span className="font-semibold text-foreground">Neuer Eintrag</span>
                               <span className="text-muted-foreground text-[10px]">Zeile {entry.error.row}</span>
                             </div>
                             <div className="space-y-1 border-t pt-1.5">
                               <div className="flex items-baseline gap-1">
                                 <span className="text-muted-foreground w-14 shrink-0">Name:</span>
                                 <span className="font-bold text-pupil-warning">{entry.toName}</span>
                               </div>
                               {sharedVorname && (
                                 <div className="flex items-baseline gap-1">
                                   <span className="text-muted-foreground w-14 shrink-0">Vorname:</span>
                                   <span className="font-medium">{String(sharedVorname)}</span>
                                 </div>
                               )}
                               {studentCols.map(col => {
                                 const val = toRow[col] ?? fromRow[col];
                                 if (!val) return null;
                                 const label = col === 'S_ID' ? 'S_ID' : col === 'S_AHV' ? 'AHV' : col === 'K_Name' ? 'Klasse' : col;
                                 return (
                                   <div key={col} className="flex items-baseline gap-1">
                                     <span className="text-muted-foreground w-14 shrink-0">{label}:</span>
                                     <span className="font-medium">{String(val)}</span>
                                   </div>
                                 );
                               })}
                             </div>
                           </div>
                         </div>
                         <p className="text-xs text-muted-foreground">
                           ℹ Bei «Ignorieren» bleiben beide Zeilen unverändert im Export.
                         </p>
                       </div>
                     )}
                  </div>
                  );
                })}

                {/* Pagination */}
                {totalNameChangePages > 1 && (
                  <div className="flex items-center justify-between pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNameChangePage(p => Math.max(0, p - 1))}
                      disabled={nameChangePage === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Zurück
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Seite {nameChangePage + 1} von {totalNameChangePages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNameChangePage(p => Math.min(totalNameChangePages - 1, p + 1))}
                      disabled={nameChangePage >= totalNameChangePages - 1}
                    >
                      Weiter
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      )}

      {/* Local Bulk Correction - Web Worker Background Processing */}
      {uncorrectedErrors.length > 0 && (
        <Card className="border-pupil-success/30 bg-pupil-success/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Cpu className="h-5 w-5 text-pupil-success" />
                <CardTitle className="text-lg">Muster-Analyse</CardTitle>
                <Badge variant="outline" className="text-pupil-success border-pupil-success/30 text-xs">
                  Web Worker · 100% Lokal
                </Badge>
                {analysisTime !== null && (
                  <Badge variant="secondary" className="text-xs">
                    {Math.round(analysisTime)}ms
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                {/* Apply all auto-fixable at once */}
                {suggestionsWithApplicability.filter(s => s.hasApplicableCorrections).length > 1 && (
                  <Button
                    size="sm"
                    onClick={() => {
                      suggestionsWithApplicability
                        .filter(s => s.hasApplicableCorrections)
                        .forEach(({ suggestion }) => applyLocalBulkCorrection(suggestion));
                    }}
                    className="gap-2 bg-pupil-success hover:bg-pupil-success/90"
                  >
                    <Zap className="h-4 w-4" />
                    Alle {suggestionsWithApplicability.filter(s => s.hasApplicableCorrections).length} Auto-Fixes anwenden
                  </Button>
                )}
                <Button 
                  onClick={() => analyzeWithWorker(false)} 
                  disabled={isAnalyzing}
                  className="gap-2"
                  variant="outline"
                  size="sm"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analysiere...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4" />
                      Neu analysieren
                    </>
                  )}
                </Button>
              </div>
            </div>
            <CardDescription>
              Erkennt Formatierungsmuster und schlägt automatische Korrekturen vor – ohne Datenweitergabe
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {isAnalyzing && (
              <div className="flex items-center gap-3 p-4 bg-background rounded-lg border">
                <Loader2 className="h-5 w-5 animate-spin text-pupil-success" />
                <div>
                  <p className="text-sm font-medium">Analysiere Daten im Hintergrund…</p>
                  <p className="text-xs text-muted-foreground">UI bleibt reaktiv – Web Worker verarbeitet {uncorrectedErrors.length} Fehler</p>
                </div>
              </div>
            )}

            {!isAnalyzing && hasRunAnalysis && suggestionsWithApplicability.length === 0 && (
              <div className="flex items-center gap-3 p-4 bg-background rounded-lg border border-dashed">
                <CheckCircle className="h-5 w-5 text-pupil-success shrink-0" />
                <div>
                  <p className="text-sm font-medium">Keine automatischen Korrekturen gefunden</p>
                  <p className="text-xs text-muted-foreground">Nutzen Sie die manuelle Schritt-für-Schritt Korrektur für die verbleibenden Fehler</p>
                </div>
              </div>
            )}

            {suggestionsWithApplicability.length > 0 && (
              <div className="space-y-2">
                {suggestionsWithApplicability.map(({ suggestion, hasApplicableCorrections }, idx) => {
                  // Derive icon and example from pattern type
                  const patternMeta = getPatternMeta(suggestion.type);
                  return (
                    <div key={idx} className={`rounded-lg border overflow-hidden ${hasApplicableCorrections ? 'border-pupil-success/30' : 'border-muted'}`}>
                      <div className={`px-3 py-2 flex items-center gap-2 text-xs font-medium ${hasApplicableCorrections ? 'bg-pupil-success/10 text-pupil-success' : 'bg-muted/50 text-muted-foreground'}`}>
                        {hasApplicableCorrections ? (
                          <><Zap className="h-3 w-3" /> Auto-Fix verfügbar</>
                        ) : (
                          <><Edit2 className="h-3 w-3" /> Manuelle Prüfung</>
                        )}
                      </div>
                      <div className="p-3 bg-background space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1 min-w-0">
                            <div className={`mt-0.5 p-1.5 rounded-md shrink-0 ${hasApplicableCorrections ? 'bg-pupil-success/10' : 'bg-muted'}`}>
                              {patternMeta.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-sm font-semibold">{patternMeta.label}</span>
                                <Badge variant="outline" className="text-xs font-mono">{suggestion.affectedColumn}</Badge>
                                <Badge variant="secondary" className="text-xs">{suggestion.affectedRows.length} Einträge</Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">{suggestion.pattern}</p>
                              {/* Generic format example */}
                              {patternMeta.example && (
                                <div className="flex items-center gap-1.5 mt-1.5 text-xs">
                                  <span className="text-muted-foreground shrink-0">Beispiel:</span>
                                  <code className="px-1.5 py-0.5 bg-destructive/10 text-destructive rounded font-mono">{patternMeta.example.from}</code>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <code className="px-1.5 py-0.5 bg-pupil-success/10 text-pupil-success rounded font-mono">{patternMeta.example.to}</code>
                                </div>
                              )}
                              {/* Concrete before/after from actual data */}
                              {hasApplicableCorrections && (() => {
                                const corrections = applyLocalCorrection(suggestion, errors);
                                const previews = corrections.slice(0, 3);
                                if (previews.length === 0) return null;
                                return (
                                  <div className="mt-2 space-y-1">
                                    <span className="text-xs text-muted-foreground font-medium">Aus Ihren Daten:</span>
                                    {previews.map((c, i) => {
                                      const originalError = errors.find(e => e.row === c.row && e.column === c.column);
                                      return (
                                        <div key={i} className="flex items-center gap-1.5 text-xs">
                                          <code className="px-1 py-0.5 bg-destructive/10 text-destructive rounded font-mono text-[10px] max-w-[120px] truncate">{originalError?.value ?? '?'}</code>
                                          <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                                          <code className="px-1 py-0.5 bg-pupil-success/10 text-pupil-success rounded font-mono text-[10px] max-w-[120px] truncate">{c.value}</code>
                                        </div>
                                      );
                                    })}
                                    {corrections.length > 3 && (
                                      <span className="text-xs text-muted-foreground">+{corrections.length - 3} weitere</span>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {hasApplicableCorrections && (
                              <Button 
                                size="sm" 
                                onClick={() => applyLocalBulkCorrection(suggestion)}
                                className="gap-1.5 bg-pupil-success hover:bg-pupil-success/90"
                              >
                                <CheckCircle className="h-3.5 w-3.5" />
                                Anwenden
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => startStepByStep(suggestion.affectedRows, suggestion.affectedColumn)}
                              className="gap-1.5"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                              Manuell
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step-by-Step Mode Modal */}
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
                
                {/* Info for parent inconsistency - explain that student data stays unchanged */}
                {duplicateInfo.isParentInconsistency && (
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

                {/* Master Record Selection - only for parent fields or non-parent inconsistencies */}
                {(duplicateInfo.hasDifferences || duplicateInfo.isParentInconsistency) && (
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
        <div className="space-y-2">
          {/* Filter toggle for corrected errors */}
          <div className="flex items-center justify-between px-1 pb-1">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-destructive/20 border border-destructive/40" />
                <span className="text-xs text-muted-foreground">Offen</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-3 rounded-sm bg-pupil-success/15 border border-pupil-success/30" />
                <span className="text-xs text-muted-foreground">Korrigiert</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {showOnlyOpenErrors ? 'Nur offene Fehler' : 'Alle anzeigen'}
              </span>
              <Switch
                checked={!showOnlyOpenErrors}
                onCheckedChange={(checked) => setShowOnlyOpenErrors(!checked)}
                id="show-corrected"
              />
              <label htmlFor="show-corrected" className="text-xs text-muted-foreground cursor-pointer">
                Korrigierte einblenden
              </label>
            </div>
          </div>
          {errorsByColumn
            .filter(([, colErrors]) => {
              if (showOnlyOpenErrors) {
                return colErrors.some(e => e.correctedValue === undefined);
              }
              return true;
            })
            .map(([column, colErrors], colIdx) => {
            const uncorrected = colErrors.filter(e => !e.correctedValue);
            const corrected = colErrors.filter(e => e.correctedValue !== undefined);
            // First column is expanded by default (using index 0)
            const isOpen = colIdx === 0
              ? !expandedErrorColumns.has(`__closed__${column}`)
              : expandedErrorColumns.has(column);
            const toggleCol = () => {
              setExpandedErrorColumns(prev => {
                const s = new Set(prev);
                if (colIdx === 0) {
                  // Toggle "closed" marker for first column
                  s.has(`__closed__${column}`) ? s.delete(`__closed__${column}`) : s.add(`__closed__${column}`);
                } else {
                  s.has(column) ? s.delete(column) : s.add(column);
                }
                return s;
              });
            };

            return (
              <div key={column} className="border rounded-lg overflow-hidden">
                {/* Column group header */}
                <button
                  onClick={toggleCol}
                  className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                    <code className="text-sm font-semibold font-mono">{column}</code>
                    <div className="flex items-center gap-1.5">
                      {uncorrected.length > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          {uncorrected.length} offen
                        </Badge>
                      )}
                      {corrected.length > 0 && (
                        <Badge variant="secondary" className="text-xs text-pupil-success">
                          {corrected.length} korrigiert
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    className="inline-flex items-center gap-1.5 text-xs shrink-0 px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); startStepByStep(colErrors.filter(err => !err.correctedValue).map(err => err.row), column); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); startStepByStep(colErrors.filter(err => !err.correctedValue).map(err => err.row), column); } }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    Alle korrigieren
                  </div>
                </button>

                {/* Collapsible table */}
                {isOpen && (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-pupil-teal">
                        <TableHead className="text-pupil-teal-foreground w-20">Zeile</TableHead>
                        <TableHead className="text-pupil-teal-foreground">Wert</TableHead>
                        <TableHead className="text-pupil-teal-foreground">Fehler</TableHead>
                        <TableHead className="text-pupil-teal-foreground w-32">Aktion</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {colErrors
                        .filter(error => showOnlyOpenErrors ? error.correctedValue === undefined : true)
                        .map((error, idx) => {
                        const isEditing = editingCell?.row === error.row && editingCell?.column === error.column;
                        const isCorrected = error.correctedValue !== undefined;
                        const isLanguageCol = LANGUAGE_COLUMNS.has(error.column);
                        const isNationalityCol = NATIONALITY_COLUMNS.has(error.column);
                        const isLanguageDropdownOpen = languageDropdownCell?.row === error.row && languageDropdownCell?.column === error.column;
                        const isNationalityDropdownOpen = nationalityDropdownCell?.row === error.row && nationalityDropdownCell?.column === error.column;
                        const isDropdownCol = isLanguageCol || isNationalityCol;
                        const shortMessage = error.message.length > 45
                          ? error.message.slice(0, 42) + '…'
                          : error.message;
                        return (
                          <TableRow
                            key={idx}
                            data-row={error.row}
                            className={`transition-all ${isCorrected ? 'bg-pupil-success/5' : 'bg-destructive/5'}`}
                          >
                            <TableCell className="font-mono">{error.row}</TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="h-8"
                                  autoFocus
                                />
                              ) : (
                                <span className={isCorrected ? 'line-through text-muted-foreground' : ''}>
                                  {error.value || '(leer)'}
                                </span>
                              )}
                              {isCorrected && !isEditing && (
                                <span className="ml-2 text-pupil-success font-medium">
                                  → {error.correctedValue}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant={isCorrected ? 'secondary' : 'destructive'} className="cursor-help max-w-[180px] truncate inline-block">
                                      {shortMessage}
                                    </Badge>
                                  </TooltipTrigger>
                                  {error.message.length > 45 && (
                                    <TooltipContent side="top" className="max-w-sm text-xs">
                                      {error.message}
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>
                              {isLanguageCol && !isCorrected ? (
                                /* Language dropdown for BISTA language columns */
                                <div className="relative">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 w-full"
                                    onClick={() => setLanguageDropdownCell(isLanguageDropdownOpen ? null : { row: error.row, column: error.column })}
                                  >
                                    <Languages className="h-3.5 w-3.5" />
                                    Sprache wählen
                                    <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} />
                                  </Button>
                                  {isLanguageDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-md shadow-lg w-56">
                                      <ScrollArea className="h-64">
                                        <div className="p-1">
                                          {BISTA_LANGUAGES_SORTED.map(lang => (
                                            <button
                                              key={lang}
                                              className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                                              onClick={() => {
                                                onErrorCorrect(error.row, error.column, lang, 'manual');
                                                setLanguageDropdownCell(null);
                                              }}
                                            >
                                              {lang}
                                            </button>
                                          ))}
                                        </div>
                                      </ScrollArea>
                                    </div>
                                  )}
                                </div>
                              ) : isNationalityCol && !isCorrected ? (
                                /* Nationality dropdown for S_Nationalitaet column */
                                <div className="relative">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 w-full"
                                    onClick={() => setNationalityDropdownCell(isNationalityDropdownOpen ? null : { row: error.row, column: error.column })}
                                  >
                                    <Globe className="h-3.5 w-3.5" />
                                    Land wählen
                                    <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${isNationalityDropdownOpen ? 'rotate-180' : ''}`} />
                                  </Button>
                                  {isNationalityDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-md shadow-lg w-64">
                                      <ScrollArea className="h-72">
                                        <div className="p-1">
                                          {NATIONALITIES_SORTED.map(nat => (
                                            <button
                                              key={nat}
                                              className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                                              onClick={() => {
                                                onErrorCorrect(error.row, error.column, nat, 'manual');
                                                setNationalityDropdownCell(null);
                                              }}
                                            >
                                              {nat}
                                            </button>
                                          ))}
                                        </div>
                                      </ScrollArea>
                                    </div>
                                  )}
                                </div>
                              ) : isEditing ? (
                                <Button size="sm" onClick={handleSaveEdit}>
                                  <Save className="h-4 w-4 mr-1" />
                                  Speichern
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => isLanguageCol
                                    ? setLanguageDropdownCell({ row: error.row, column: error.column })
                                    : isNationalityCol
                                    ? setNationalityDropdownCell({ row: error.row, column: error.column })
                                    : handleStartEdit(error.row, error.column, error.correctedValue ?? error.value)
                                  }
                                >
                                  {isLanguageCol ? <Languages className="h-4 w-4 mr-1" /> : isNationalityCol ? <Globe className="h-4 w-4 mr-1" /> : <Edit2 className="h-4 w-4 mr-1" />}
                                  {isCorrected ? 'Ändern' : 'Korrigieren'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            );
          })}
        </div>
      )}
      <NavigationButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel="Weiter zur Vorschau"
        size="lg"
      />
    </div>
  );
}
