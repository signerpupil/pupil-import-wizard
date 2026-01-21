import { useState, useMemo, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, Edit2, Save, Zap, Loader2, ChevronLeft, ChevronRight, X, Shield, Cpu } from 'lucide-react';
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
  const [analysisTime, setAnalysisTime] = useState<number | null>(null);
  const { toast } = useToast();
  
  // Web Worker for background processing
  const { analyze, isProcessing: isAnalyzing, error: workerError } = useValidationWorker();

  const uncorrectedErrors = useMemo(() => errors.filter(e => e.correctedValue === undefined), [errors]);
  const correctedErrors = useMemo(() => errors.filter(e => e.correctedValue !== undefined), [errors]);

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

  // Get student name for a specific row
  const getStudentNameForRow = (rowNumber: number) => {
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
  };

  // Get student name for current error row
  const getCurrentStudentName = () => {
    if (!currentError) return null;
    return getStudentNameForRow(currentError.row);
  };

  // Check if current error is a duplicate error and find all related duplicates with full row data
  const getDuplicateInfo = useCallback(() => {
    if (!currentError) return null;
    
    // Check if this is a duplicate or inconsistency error
    const isDuplicateOrInconsistency = currentError.message.includes('Duplikat') || 
                                        currentError.message.includes('Inkonsistente ID') ||
                                        currentError.message.includes('gefunden');
    if (!isDuplicateOrInconsistency) return null;

    // Find all errors for the same column with the same or similar values
    const relatedErrors = errors.filter(e => 
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

    // Get full row data for each duplicate occurrence
    const rowsWithData = currentGroup.rows.map(rowNum => {
      const rowData = rows[rowNum - 1]; // Convert to 0-indexed
      const studentName = getStudentNameForRow(rowNum);
      
      // Get key fields to display for comparison
      const keyFields: { field: string; value: string }[] = [];
      if (rowData) {
        // Add the duplicate column value
        const dupValue = rowData[currentError.column];
        if (dupValue !== undefined && dupValue !== null) {
          keyFields.push({ field: currentError.column, value: String(dupValue) });
        }
        
        // Add student name fields if available
        const nameFields = ['S_Name', 'S_Vorname', 'S_name', 'S_vorname', 'S_Geburtsdatum', 'S_Klasse'];
        nameFields.forEach(field => {
          const val = rowData[field];
          if (val !== undefined && val !== null && field !== currentError.column) {
            keyFields.push({ field, value: String(val) });
          }
        });
        
        // Add parent fields for parent duplicates
        if (currentError.column.includes('ERZ')) {
          const parentFields = ['P_ERZ1_Name', 'P_ERZ1_Vorname', 'P_ERZ2_Name', 'P_ERZ2_Vorname'];
          parentFields.forEach(field => {
            const val = rowData[field];
            if (val !== undefined && val !== null && field !== currentError.column) {
              keyFields.push({ field, value: String(val) });
            }
          });
        }
      }
      
      return {
        row: rowNum,
        studentName,
        isCurrent: rowNum === currentError.row,
        keyFields: keyFields.slice(0, 6), // Limit to 6 fields for display
        hasError: errors.some(e => e.row === rowNum && e.column === currentError.column && !e.correctedValue)
      };
    });

    // Suggest a solution based on the type of duplicate
    let suggestedSolution = '';
    let canAutoResolve = false;
    
    if (currentError.message.includes('Inkonsistente ID')) {
      // For inconsistent IDs, suggest using the most common value
      suggestedSolution = 'Die IDs sollten vereinheitlicht werden. Prüfen Sie welcher Wert korrekt ist.';
      canAutoResolve = false;
    } else if (currentError.column.includes('AHV')) {
      suggestedSolution = 'AHV-Nummern müssen eindeutig sein. Prüfen Sie ob es sich um dieselbe Person handelt oder eine fehlerhafte Eingabe vorliegt.';
      canAutoResolve = false;
    } else {
      suggestedSolution = 'Duplikate können zusammengeführt oder einzeln korrigiert werden.';
      canAutoResolve = false;
    }

    return {
      value: currentValue,
      column: currentError.column,
      rows: rowsWithData,
      suggestedSolution,
      canAutoResolve,
      totalOccurrences: rowsWithData.length
    };
  }, [currentError, errors, rows, getStudentNameForRow]);

  const duplicateInfo = useMemo(() => getDuplicateInfo(), [getDuplicateInfo]);

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
                
                {/* Suggested solution */}
                <Alert className="border-primary/30 bg-primary/5">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  <AlertTitle className="text-sm">Lösungsvorschlag</AlertTitle>
                  <AlertDescription className="text-xs">
                    {duplicateInfo.suggestedSolution}
                  </AlertDescription>
                </Alert>
                
                {/* All occurrences with full data */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {duplicateInfo.rows.map((rowInfo, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg border transition-colors ${
                        rowInfo.isCurrent 
                          ? 'border-primary bg-primary/10' 
                          : rowInfo.hasError
                            ? 'border-destructive/30 bg-destructive/5 cursor-pointer hover:bg-destructive/10'
                            : 'border-muted bg-muted/30 cursor-pointer hover:bg-muted/50'
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
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-medium">Zeile {rowInfo.row}</span>
                          {rowInfo.studentName && (
                            <span className="text-sm text-muted-foreground">— {rowInfo.studentName}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {rowInfo.isCurrent && (
                            <Badge className="text-xs">aktuell</Badge>
                          )}
                          {!rowInfo.isCurrent && rowInfo.hasError && (
                            <Badge variant="destructive" className="text-xs">Fehler</Badge>
                          )}
                          {!rowInfo.isCurrent && !rowInfo.hasError && (
                            <Badge variant="secondary" className="text-xs">Original</Badge>
                          )}
                          {!rowInfo.isCurrent && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                      
                      {/* Show key fields for comparison */}
                      {rowInfo.keyFields && rowInfo.keyFields.length > 0 && (
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                          {rowInfo.keyFields.map((field, fieldIdx) => (
                            <div key={fieldIdx} className="flex gap-1">
                              <span className="text-muted-foreground truncate">{field.field}:</span>
                              <span className="font-mono truncate font-medium">{field.value}</span>
                            </div>
                          ))}
                        </div>
                      )}
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
