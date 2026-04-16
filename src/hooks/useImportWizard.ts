import { useReducer, useCallback, useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/analytics';
import type { ImportType, FoerderplanerSubType, ParsedRow, ValidationError, ColumnStatus, ColumnDefinition, ChangeLogEntry } from '@/types/importTypes';
import type { ProcessingMode, CorrectionSource, CorrectionRule } from '@/types/correctionTypes';
import type { ParseResult } from '@/lib/fileParser';

export interface ImportWizardState {
  currentStep: number;
  maxVisitedStep: number;
  importType: ImportType | null;
  subType: FoerderplanerSubType | null;
  parseResult: ParseResult | null;
  columnStatuses: ColumnStatus[];
  removeExtraColumns: boolean;
  errors: ValidationError[];
  correctedRows: ParsedRow[];
  changeLog: ChangeLogEntry[];
  isValidating: boolean;
  processingMode: ProcessingMode;
  correctionSource: CorrectionSource;
  loadedCorrectionRules: CorrectionRule[];
  pendingCorrectionRules: CorrectionRule[];
  autoCorrectionsApplied: boolean;
}

type Action =
  | { type: 'SET_STEP'; step: number }
  | { type: 'NEXT_STEP'; maxStep?: number }
  | { type: 'BACK_STEP' }
  | { type: 'SET_IMPORT_TYPE'; importType: ImportType | null }
  | { type: 'SET_SUB_TYPE'; subType: FoerderplanerSubType | null }
  | { type: 'SET_PARSE_RESULT'; parseResult: ParseResult | null }
  | { type: 'SET_COLUMN_STATUSES'; statuses: ColumnStatus[] }
  | { type: 'SET_REMOVE_EXTRA_COLUMNS'; value: boolean }
  | { type: 'SET_ERRORS'; errors: ValidationError[] }
  | { type: 'UPDATE_ERRORS'; updater: (prev: ValidationError[]) => ValidationError[] }
  | { type: 'SET_CORRECTED_ROWS'; rows: ParsedRow[] }
  | { type: 'UPDATE_CORRECTED_ROWS'; updater: (prev: ParsedRow[]) => ParsedRow[] }
  | { type: 'ADD_CHANGELOG_ENTRY'; entry: ChangeLogEntry }
  | { type: 'ADD_CHANGELOG_ENTRIES'; entries: ChangeLogEntry[] }
  | { type: 'SET_IS_VALIDATING'; value: boolean }
  | { type: 'SET_PROCESSING_MODE'; mode: ProcessingMode }
  | { type: 'SET_CORRECTION_SOURCE'; source: CorrectionSource }
  | { type: 'SET_LOADED_CORRECTION_RULES'; rules: CorrectionRule[] }
  | { type: 'SET_PENDING_CORRECTION_RULES'; rules: CorrectionRule[] }
  | { type: 'SET_AUTO_CORRECTIONS_APPLIED'; value: boolean }
  | { type: 'CORRECT_ERROR'; rowIndex: number; column: string; value: string }
  | { type: 'BULK_CORRECT'; corrections: { row: number; column: string; value: string }[] }
  | { type: 'VALIDATION_COMPLETE'; errors: ValidationError[]; rows: ParsedRow[] }
  | { type: 'RESET' };

const initialState: ImportWizardState = {
  currentStep: 0,
  maxVisitedStep: 0,
  importType: 'schueler',
  subType: null,
  parseResult: null,
  columnStatuses: [],
  removeExtraColumns: false,
  errors: [],
  correctedRows: [],
  changeLog: [],
  isValidating: false,
  processingMode: 'initial',
  correctionSource: 'localStorage',
  loadedCorrectionRules: [],
  pendingCorrectionRules: [],
  autoCorrectionsApplied: false,
};

function reducer(state: ImportWizardState, action: Action): ImportWizardState {
  switch (action.type) {
    case 'SET_STEP':
      return { ...state, currentStep: action.step, maxVisitedStep: Math.max(state.maxVisitedStep, action.step) };
    case 'NEXT_STEP': {
      const next = Math.min(state.currentStep + 1, action.maxStep ?? 4);
      return { ...state, currentStep: next, maxVisitedStep: Math.max(state.maxVisitedStep, next) };
    }
    case 'BACK_STEP':
      return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };
    case 'SET_IMPORT_TYPE':
      return { ...state, importType: action.importType };
    case 'SET_SUB_TYPE':
      return { ...state, subType: action.subType };
    case 'SET_PARSE_RESULT':
      return { ...state, parseResult: action.parseResult };
    case 'SET_COLUMN_STATUSES':
      return { ...state, columnStatuses: action.statuses };
    case 'SET_REMOVE_EXTRA_COLUMNS':
      return { ...state, removeExtraColumns: action.value };
    case 'SET_ERRORS':
      return { ...state, errors: action.errors };
    case 'UPDATE_ERRORS':
      return { ...state, errors: action.updater(state.errors) };
    case 'SET_CORRECTED_ROWS':
      return { ...state, correctedRows: action.rows };
    case 'UPDATE_CORRECTED_ROWS':
      return { ...state, correctedRows: action.updater(state.correctedRows) };
    case 'ADD_CHANGELOG_ENTRY':
      return { ...state, changeLog: [...state.changeLog, action.entry] };
    case 'ADD_CHANGELOG_ENTRIES':
      return { ...state, changeLog: [...state.changeLog, ...action.entries] };
    case 'SET_IS_VALIDATING':
      return { ...state, isValidating: action.value };
    case 'SET_PROCESSING_MODE':
      return { ...state, processingMode: action.mode };
    case 'SET_CORRECTION_SOURCE':
      return { ...state, correctionSource: action.source };
    case 'SET_LOADED_CORRECTION_RULES':
      return { ...state, loadedCorrectionRules: action.rules };
    case 'SET_PENDING_CORRECTION_RULES':
      return { ...state, pendingCorrectionRules: action.rules };
    case 'SET_AUTO_CORRECTIONS_APPLIED':
      return { ...state, autoCorrectionsApplied: action.value };
    case 'CORRECT_ERROR': {
      const { rowIndex, column, value } = action;
      const updatedErrors = state.errors.map(e =>
        e.row === rowIndex && e.column === column ? { ...e, correctedValue: value } : e
      );
      const updatedRows = [...state.correctedRows];
      if (updatedRows[rowIndex - 2]) {
        updatedRows[rowIndex - 2] = { ...updatedRows[rowIndex - 2], [column]: value };
      }
      return { ...state, errors: updatedErrors, correctedRows: updatedRows };
    }
    case 'BULK_CORRECT': {
      const updatedErrors = state.errors.map(e => {
        const c = action.corrections.find(c => c.row === e.row && c.column === e.column);
        return c ? { ...e, correctedValue: c.value } : e;
      });
      const updatedRows = [...state.correctedRows];
      action.corrections.forEach(c => {
        if (updatedRows[c.row - 2]) {
          updatedRows[c.row - 2] = { ...updatedRows[c.row - 2], [c.column]: c.value };
        }
      });
      return { ...state, errors: updatedErrors, correctedRows: updatedRows };
    }
    case 'VALIDATION_COMPLETE':
      return { ...state, errors: action.errors, correctedRows: action.rows, autoCorrectionsApplied: false, isValidating: false };
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}

export function useImportWizard() {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Convenience dispatchers
  const setStep = useCallback((step: number) => dispatch({ type: 'SET_STEP', step }), []);
  const nextStep = useCallback((maxStep?: number) => dispatch({ type: 'NEXT_STEP', maxStep }), []);
  const backStep = useCallback(() => dispatch({ type: 'BACK_STEP' }), []);
  const setImportType = useCallback((importType: ImportType | null) => dispatch({ type: 'SET_IMPORT_TYPE', importType }), []);
  const setSubType = useCallback((subType: FoerderplanerSubType | null) => dispatch({ type: 'SET_SUB_TYPE', subType }), []);
  const setParseResult = useCallback((parseResult: ParseResult | null) => dispatch({ type: 'SET_PARSE_RESULT', parseResult }), []);
  const setColumnStatuses = useCallback((statuses: ColumnStatus[]) => dispatch({ type: 'SET_COLUMN_STATUSES', statuses }), []);
  const setRemoveExtraColumns = useCallback((value: boolean) => dispatch({ type: 'SET_REMOVE_EXTRA_COLUMNS', value }), []);
  const setErrors = useCallback((errors: ValidationError[]) => dispatch({ type: 'SET_ERRORS', errors }), []);
  const updateErrors = useCallback((updater: (prev: ValidationError[]) => ValidationError[]) => dispatch({ type: 'UPDATE_ERRORS', updater }), []);
  const setCorrectedRows = useCallback((rows: ParsedRow[]) => dispatch({ type: 'SET_CORRECTED_ROWS', rows }), []);
  const setIsValidating = useCallback((value: boolean) => dispatch({ type: 'SET_IS_VALIDATING', value }), []);
  const setProcessingMode = useCallback((mode: ProcessingMode) => dispatch({ type: 'SET_PROCESSING_MODE', mode }), []);
  const setCorrectionSource = useCallback((source: CorrectionSource) => dispatch({ type: 'SET_CORRECTION_SOURCE', source }), []);
  const setLoadedCorrectionRules = useCallback((rules: CorrectionRule[]) => dispatch({ type: 'SET_LOADED_CORRECTION_RULES', rules }), []);
  const setPendingCorrectionRules = useCallback((rules: CorrectionRule[]) => dispatch({ type: 'SET_PENDING_CORRECTION_RULES', rules }), []);
  const setAutoCorrectionsApplied = useCallback((value: boolean) => dispatch({ type: 'SET_AUTO_CORRECTIONS_APPLIED', value }), []);
  const correctError = useCallback((rowIndex: number, column: string, value: string) => dispatch({ type: 'CORRECT_ERROR', rowIndex, column, value }), []);
  const bulkCorrect = useCallback((corrections: { row: number; column: string; value: string }[]) => dispatch({ type: 'BULK_CORRECT', corrections }), []);
  const addChangeLogEntry = useCallback((entry: ChangeLogEntry) => dispatch({ type: 'ADD_CHANGELOG_ENTRY', entry }), []);
  const addChangeLogEntries = useCallback((entries: ChangeLogEntry[]) => dispatch({ type: 'ADD_CHANGELOG_ENTRIES', entries }), []);
  const validationComplete = useCallback((errors: ValidationError[], rows: ParsedRow[]) => dispatch({ type: 'VALIDATION_COMPLETE', errors, rows }), []);
  const reset = useCallback(() => {
    trackEvent({ type: 'import_reset' } as never);
    trackEvent({ event_type: 'import_reset' });
    dispatch({ type: 'RESET' });
  }, []);

  return {
    state,
    dispatch,
    // Convenience methods
    setStep,
    nextStep,
    backStep,
    setImportType,
    setSubType,
    setParseResult,
    setColumnStatuses,
    setRemoveExtraColumns,
    setErrors,
    updateErrors,
    setCorrectedRows,
    setIsValidating,
    setProcessingMode,
    setCorrectionSource,
    setLoadedCorrectionRules,
    setPendingCorrectionRules,
    setAutoCorrectionsApplied,
    correctError,
    bulkCorrect,
    addChangeLogEntry,
    addChangeLogEntries,
    validationComplete,
    reset,
  };
}
