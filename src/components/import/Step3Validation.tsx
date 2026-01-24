import { useState, useMemo, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, Edit2, Save, Zap, Loader2, ChevronLeft, ChevronRight, X, Cpu, AlertTriangle, Copy, Users, Search, ChevronDown, ChevronUp } from 'lucide-react';
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

// Interface for parent ID inconsistency groups
interface ParentIdInconsistencyGroup {
  identifier: string; // e.g., "AHV: 756.1234.5678.90" or "Max Müller, Hauptstrasse 1"
  column: string; // e.g., "P_ERZ1_ID"
  correctId: string; // The ID from the first occurrence
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
  const [currentErrorIndex, setCurrentErrorIndex] = useState(0);
  const [stepEditValue, setStepEditValue] = useState('');
  const [filteredErrorRows, setFilteredErrorRows] = useState<number[] | null>(null);
  const [filteredErrorColumn, setFilteredErrorColumn] = useState<string | null>(null);
  const [showAllOtherDifferences, setShowAllOtherDifferences] = useState(false);
  const [analysisTime, setAnalysisTime] = useState<number | null>(null);
  
  // Parent ID consolidation UI state
  const [parentConsolidationSearch, setParentConsolidationSearch] = useState('');
  const [parentConsolidationPage, setParentConsolidationPage] = useState(0);
  const [parentConsolidationExpanded, setParentConsolidationExpanded] = useState(false);
  const PARENTS_PER_PAGE = 20;
  const { toast } = useToast();
  
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
      
      const affectedRows = groupErrors.map(e => ({
        row: e.row,
        currentId: e.value,
        studentName: getStudentNameForRow(e.row),
      }));
      
      groups.push({
        identifier,
        column,
        correctId,
        affectedRows,
      });
    });
    
    return groups;
  }, [uncorrectedErrors, getStudentNameForRow]);


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

  // Total count for summary
  const totalParentIdInconsistencies = useMemo(() => 
    parentIdInconsistencyGroups.reduce((sum, g) => sum + g.affectedRows.length, 0),
    [parentIdInconsistencyGroups]
  );

  // Filtered parent ID groups for search
  const filteredParentGroups = useMemo(() => {
    if (!parentConsolidationSearch.trim()) return parentIdInconsistencyGroups;
    const searchLower = parentConsolidationSearch.toLowerCase();
    return parentIdInconsistencyGroups.filter(group => 
      group.identifier.toLowerCase().includes(searchLower) ||
      group.correctId.toLowerCase().includes(searchLower) ||
      group.column.toLowerCase().includes(searchLower) ||
      group.affectedRows.some(r => r.studentName?.toLowerCase().includes(searchLower))
    );
  }, [parentIdInconsistencyGroups, parentConsolidationSearch]);

  // Paginated parent groups
  const paginatedParentGroups = useMemo(() => {
    const start = parentConsolidationPage * PARENTS_PER_PAGE;
    return filteredParentGroups.slice(start, start + PARENTS_PER_PAGE);
  }, [filteredParentGroups, parentConsolidationPage, PARENTS_PER_PAGE]);

  const totalParentPages = Math.ceil(filteredParentGroups.length / PARENTS_PER_PAGE);

  // Reset page when search changes
  useEffect(() => {
    setParentConsolidationPage(0);
  }, [parentConsolidationSearch]);

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
    
    if (targetErrors.length > 0) {
      setFilteredErrorRows(filterRows || null);
      setFilteredErrorColumn(filterColumn || null);
      setStepByStepMode(true);
      setCurrentErrorIndex(0);
      setStepEditValue(targetErrors[0]?.value || '');
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
      setStepEditValue(currentError.value || '');
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
  const analyzeWithWorker = useCallback(async () => {
    if (errors.length === 0) return;
    
    const startTime = performance.now();
    
    try {
      // This runs entirely in a background Web Worker thread
      const result = await analyze(errors, rows);
      const duration = performance.now() - startTime;
      setAnalysisTime(duration);
      
      // Convert worker patterns to LocalSuggestion format
      const suggestions = result.patterns.map(convertPatternToSuggestion);
      setLocalSuggestions(suggestions);
      
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
    } catch (err) {
      console.error('Worker analysis failed:', err);
      toast({
        title: 'Analysefehler',
        description: 'Die Hintergrundanalyse konnte nicht durchgeführt werden.',
        variant: 'destructive',
      });
    }
  }, [errors, rows, analyze, convertPatternToSuggestion, toast]);

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
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Daten validieren</h2>
        <p className="text-muted-foreground mt-1">
          Überprüfen und korrigieren Sie fehlerhafte Daten vor dem Export.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-muted rounded-lg text-center">
          <p className="text-3xl font-bold">{rows.length}</p>
          <p className="text-sm text-muted-foreground">Datensätze gesamt</p>
        </div>
        <div className="p-4 bg-destructive/10 rounded-lg text-center">
          <p className="text-3xl font-bold text-destructive">{uncorrectedErrors.length}</p>
          <p className="text-sm text-muted-foreground">Offene Fehler</p>
        </div>
        <div className="p-4 bg-pupil-success/10 rounded-lg text-center">
          <p className="text-3xl font-bold text-pupil-success">{correctedErrors.length}</p>
          <p className="text-sm text-muted-foreground">Korrigiert</p>
        </div>
      </div>

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
                {parentConsolidationSearch && (
                  <p className="text-sm text-muted-foreground">
                    {filteredParentGroups.length} von {parentIdInconsistencyGroups.length} Ergebnissen
                  </p>
                )}
                
                {/* Paginated list */}
                <ScrollArea className="max-h-96">
                  <div className="space-y-2">
                    {paginatedParentGroups.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        Keine Ergebnisse für "{parentConsolidationSearch}"
                      </p>
                    ) : (
                      paginatedParentGroups.map((group, idx) => (
                        <div key={`${group.column}-${group.identifier}-${idx}`} className="p-3 bg-background rounded-lg border space-y-2">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Badge variant="outline" className="shrink-0">{group.column}</Badge>
                                <span className="text-sm font-medium text-muted-foreground truncate">{group.identifier}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <span className="text-muted-foreground shrink-0">Korrekte ID:</span>
                                <code className="px-1.5 py-0.5 bg-blue-500/10 rounded text-blue-600 font-mono text-xs truncate">
                                  {group.correctId}
                                </code>
                              </div>
                              <div className="mt-2 text-xs text-muted-foreground">
                                <span className="font-medium">{group.affectedRows.length} betroffene Kinder:</span>
                                <span className="ml-1">
                                  {group.affectedRows.slice(0, 2).map((r, i) => (
                                    <span key={r.row}>
                                      {i > 0 && ', '}
                                      {r.studentName || `Zeile ${r.row}`}
                                    </span>
                                  ))}
                                  {group.affectedRows.length > 2 && ` +${group.affectedRows.length - 2} weitere`}
                                </span>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  const rowNumbers = group.affectedRows.map(r => r.row);
                                  startStepByStep(rowNumbers, group.column);
                                }}
                                className="gap-1"
                              >
                                <Edit2 className="h-4 w-4" />
                                Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
                
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

      {/* Local Bulk Correction - Web Worker Background Processing */}
      {uncorrectedErrors.length > 0 && (
        <Card className="border-pupil-success/30 bg-pupil-success/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-pupil-success" />
                <CardTitle className="text-lg">Hintergrund-Analyse</CardTitle>
                <Badge variant="outline" className="text-pupil-success border-pupil-success/30">
                  Web Worker
                </Badge>
                <Badge variant="outline" className="text-pupil-success border-pupil-success/30">
                  100% Lokal
                </Badge>
              </div>
              <Button 
                onClick={analyzeWithWorker} 
                disabled={isAnalyzing}
                className="gap-2"
                variant="outline"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analysiere im Hintergrund...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    Muster erkennen
                  </>
                )}
              </Button>
            </div>
            <CardDescription className="flex items-center gap-2">
              <span>Erkennt Formatierungsfehler in einem separaten Thread – UI bleibt reaktiv</span>
              {analysisTime !== null && (
                <Badge variant="secondary" className="text-xs">
                  {Math.round(analysisTime)}ms
                </Badge>
              )}
            </CardDescription>
          </CardHeader>
          
          {localSuggestions.length > 0 && (
            <CardContent className="space-y-3">
              {localSuggestions.map((suggestion, idx) => (
                <div key={idx} className="p-4 bg-background rounded-lg border space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{suggestion.affectedColumn}</Badge>
                        <Badge className="bg-pupil-warning">{suggestion.affectedRows.length} Zeilen</Badge>
                        {suggestion.autoFix && (
                          <Badge variant="secondary" className="text-xs">Auto-Fix</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{suggestion.pattern}</p>
                      <p className="text-sm text-muted-foreground">{suggestion.suggestion}</p>
                    </div>
                    <div className="flex gap-2">
                      {suggestion.autoFix && (
                        <Button 
                          size="sm" 
                          onClick={() => applyLocalBulkCorrection(suggestion)}
                          className="gap-1"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Anwenden
                        </Button>
                      )}
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => startStepByStep(suggestion.affectedRows, suggestion.affectedColumn)}
                        className="gap-1"
                      >
                        <Edit2 className="h-4 w-4" />
                        Manuell
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

      {/* Step-by-Step Mode Modal */}
      {stepByStepMode && currentError && (
        <Card className="border-2 border-primary">
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
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-pupil-teal">
                <TableHead className="text-pupil-teal-foreground w-20">Zeile</TableHead>
                <TableHead className="text-pupil-teal-foreground">Spalte</TableHead>
                <TableHead className="text-pupil-teal-foreground">Wert</TableHead>
                <TableHead className="text-pupil-teal-foreground">Fehler</TableHead>
                <TableHead className="text-pupil-teal-foreground w-32">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.slice(0, 50).map((error, idx) => {
                const isEditing = editingCell?.row === error.row && editingCell?.column === error.column;
                const isCorrected = error.correctedValue !== undefined;

                return (
                  <TableRow 
                    key={idx} 
                    data-row={error.row}
                    className={`transition-all ${isCorrected ? 'bg-pupil-success/5' : 'bg-destructive/5'}`}
                  >
                    <TableCell className="font-mono">{error.row}</TableCell>
                    <TableCell className="font-medium font-mono text-sm">{error.column}</TableCell>
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
                      <Badge variant={isCorrected ? 'secondary' : 'destructive'}>
                        {error.message}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Save className="h-4 w-4 mr-1" />
                          Speichern
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(error.row, error.column, error.correctedValue ?? error.value)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          {isCorrected ? 'Ändern' : 'Korrigieren'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {errors.length > 50 && (
            <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
              Zeige 50 von {errors.length} Fehlern. Nutzen Sie die lokale Musteranalyse oder die Schritt-für-Schritt Korrektur.
            </div>
          )}
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
