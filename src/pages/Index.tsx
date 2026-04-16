import { useCallback, useEffect, useRef } from 'react';
import { WizardHeader } from '@/components/import/WizardHeader';
import { WizardProgress, type WizardStep } from '@/components/import/WizardProgress';
import { WizardSummary } from '@/components/import/WizardSummary';
import { StepHelpCard } from '@/components/import/StepHelpCard';

import { Step0TypeSelect } from '@/components/import/Step0TypeSelect';
import { Step1FileUpload } from '@/components/import/Step1FileUpload';
import { Step2ColumnCheck } from '@/components/import/Step2ColumnCheck';
import { Step3Validation } from '@/components/import/Step3Validation';
import { Step4Preview } from '@/components/import/Step4Preview';
import { GroupImportWizard } from '@/components/import/GroupImportWizard';
import { LPImportWizard } from '@/components/import/LPImportWizard';
import { LehrpersonenImportWizard } from '@/components/import/LehrpersonenImportWizard';
import { ResumeSessionBanner } from '@/components/import/ResumeSessionBanner';
import { Footer } from '@/components/layout/Footer';
import type { ChangeLogEntry } from '@/types/importTypes';
import type { ProcessingMode, CorrectionSource, CorrectionRule } from '@/types/correctionTypes';
import { getColumnsByType, importConfigs, foerderplanerSubTypes } from '@/types/importTypes';
import { checkColumnStatus, validateData } from '@/lib/fileParser';
import { useCorrectionMemory } from '@/hooks/useCorrectionMemory';
import { useToast } from '@/hooks/use-toast';
import { useImportWizard } from '@/hooks/useImportWizard';
import { useSessionAutoSave, useSessionRestore } from '@/hooks/useSessionPersistence';
import { loadSession, clearSession } from '@/lib/sessionStore';

const wizardSteps: WizardStep[] = [
  { label: 'Datei hochladen', description: 'CSV oder Excel' },
  { label: 'Spalten prüfen', description: 'Vollständigkeit' },
  { label: 'Validieren', description: 'Fehler korrigieren' },
  { label: 'Export', description: 'Datei herunterladen' },
];

export default function Index() {
  const {
    state,
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
    restore,
    reset,
  } = useImportWizard();

  // Session-Persistenz: Restore-Banner + Auto-Save
  const { meta: resumeMeta, isChecked: isRestoreChecked, dismiss: dismissResume } = useSessionRestore();
  useSessionAutoSave({ state, isRestoreDecided: isRestoreChecked });

  const handleResumeSession = useCallback(async () => {
    const session = await loadSession();
    if (session) {
      restore(session.state);
      toast({
        title: 'Sitzung wiederhergestellt',
        description: `${session.state.parseResult?.rows.length ?? 0} Zeilen und ${session.state.changeLog.length} Korrekturen geladen.`,
      });
    }
    await dismissResume();
  }, [restore, dismissResume, toast]);

  const {
    currentStep, maxVisitedStep, importType, subType, parseResult,
    columnStatuses, removeExtraColumns, errors, correctedRows, changeLog,
    isValidating, processingMode, correctionSource, loadedCorrectionRules,
    pendingCorrectionRules, autoCorrectionsApplied,
  } = state;

  const { toast } = useToast();
  const correctionMemory = useCorrectionMemory(importType || 'schueler');

  const columnDefinitions = importType ? getColumnsByType(importType, subType ?? undefined) : [];
  const localStorageRulesCount = importType ? correctionMemory.getLocalStorageCount() : 0;

  const getImportTypeName = () => {
    if (importType === 'foerderplaner' && subType) {
      const sub = foerderplanerSubTypes.find(s => s.subType === subType);
      return sub?.name ?? 'Förderplaner';
    }
    return importConfigs.find(c => c.type === importType)?.name ?? 'Import';
  };

  const getStepTitle = () => {
    const stepTitles = [
      'Import-Typ auswählen',
      'Datei hochladen',
      'Spalten prüfen',
      'Daten validieren',
      'Vorschau & Export',
    ];
    return stepTitles[currentStep] || 'Import Wizard';
  };

  // Load correction rules when entering continued mode
  const handleProcessingModeChange = useCallback((mode: ProcessingMode) => {
    setProcessingMode(mode);
    if (mode === 'continued' && correctionSource === 'localStorage') {
      const rules = correctionMemory.loadFromLocalStorage();
      setPendingCorrectionRules(rules);
    }
  }, [correctionSource, correctionMemory, setProcessingMode, setPendingCorrectionRules]);

  const handleCorrectionSourceChange = useCallback((source: CorrectionSource) => {
    setCorrectionSource(source);
    if (source === 'localStorage') {
      const rules = correctionMemory.loadFromLocalStorage();
      setPendingCorrectionRules(rules);
      setLoadedCorrectionRules([]);
    } else {
      setPendingCorrectionRules([]);
    }
  }, [correctionMemory, setCorrectionSource, setPendingCorrectionRules, setLoadedCorrectionRules]);

  const handleCorrectionRulesLoaded = useCallback((rules: CorrectionRule[]) => {
    setLoadedCorrectionRules(rules);
    setPendingCorrectionRules(rules);
  }, [setLoadedCorrectionRules, setPendingCorrectionRules]);

  // Helper to get student name for a row
  const getStudentName = useCallback((rowIndex: number) => {
    const row = correctedRows[rowIndex - 2];
    if (!row) return undefined;
    const name = row['S_Name'] || row['S_name'] || '';
    const vorname = row['S_Vorname'] || row['S_vorname'] || '';
    if (name || vorname) {
      return `${vorname} ${name}`.trim();
    }
    const eintragFuer = row['Eintrag_fuer'] || '';
    return eintragFuer ? String(eintragFuer) : undefined;
  }, [correctedRows]);

  // Apply pending corrections when moving to validation step
  const applyPendingCorrections = useCallback(() => {
    if (pendingCorrectionRules.length === 0 || autoCorrectionsApplied) return;
    if (!parseResult || correctedRows.length === 0) return;

    const { corrections, stats } = correctionMemory.applyRulesToData(
      pendingCorrectionRules,
      correctedRows,
      errors
    );

    if (corrections.length > 0) {
      const bulkCorrections = corrections.map(c => ({
        row: c.row,
        column: c.column,
        value: c.correctedValue,
      }));

      updateErrors(prev => prev.map(e => {
        const correction = corrections.find(c => c.row === e.row && c.column === e.column);
        return correction ? { ...e, correctedValue: correction.correctedValue } : e;
      }));

      setCorrectedRows(correctedRows.map((row, i) => {
        const rowCorrections = corrections.filter(c => c.row === i + 2);
        if (rowCorrections.length === 0) return row;
        const updated = { ...row };
        rowCorrections.forEach(c => { updated[c.column] = c.correctedValue; });
        return updated;
      }));

      const entries: ChangeLogEntry[] = corrections.map(c => ({
        timestamp: new Date(),
        type: 'auto' as const,
        row: c.row,
        column: c.column,
        originalValue: c.originalValue,
        newValue: c.correctedValue,
        studentName: getStudentName(c.row),
      }));
      addChangeLogEntries(entries);

      toast({
        title: 'Automatische Korrekturen angewendet',
        description: `${stats.totalApplied} Korrekturen aus dem Korrektur-Gedächtnis wurden angewendet.`,
      });
    }

    setAutoCorrectionsApplied(true);
  }, [pendingCorrectionRules, autoCorrectionsApplied, parseResult, correctedRows, errors, correctionMemory, toast, updateErrors, setCorrectedRows, addChangeLogEntries, getStudentName, setAutoCorrectionsApplied]);

  // Re-validation after corrections
  const revalidationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialValidationDone = useRef(false);

  useEffect(() => {
    if (currentStep !== 3 || !initialValidationDone.current) return;
    if (correctedRows.length === 0 || columnDefinitions.length === 0) return;

    if (revalidationTimer.current) clearTimeout(revalidationTimer.current);

    revalidationTimer.current = setTimeout(() => {
      const freshErrors = validateData(correctedRows, columnDefinitions);

      updateErrors(prev => {
        const merged = prev.filter(old => old.correctedValue !== undefined);
        for (const fresh of freshErrors) {
          const alreadyCorrected = merged.some(
            m => m.row === fresh.row && m.column === fresh.column && m.correctedValue !== undefined
          );
          if (alreadyCorrected) continue;
          const existingUncorrected = prev.find(
            old => old.row === fresh.row && old.column === fresh.column && old.type === fresh.type && old.correctedValue === undefined
          );
          merged.push(existingUncorrected ?? fresh);
        }
        return merged;
      });
    }, 300);

    return () => {
      if (revalidationTimer.current) clearTimeout(revalidationTimer.current);
    };
  }, [correctedRows, currentStep, columnDefinitions, updateErrors]);

  // Apply corrections when entering step 3
  useEffect(() => {
    if (currentStep === 3 && processingMode === 'continued' && !autoCorrectionsApplied) {
      const timer = setTimeout(() => applyPendingCorrections(), 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, processingMode, autoCorrectionsApplied, applyPendingCorrections]);

  const handleNext = () => {
    if (currentStep === 1 && parseResult) {
      const statuses = checkColumnStatus(parseResult.headers, columnDefinitions);
      setColumnStatuses(statuses);
    }
    if (currentStep === 2 && parseResult) {
      if (parseResult.rows.length > 200) {
        setIsValidating(true);
        setStep(Math.min(currentStep + 1, 4));
        setTimeout(() => {
          const validationErrors = validateData(parseResult.rows, columnDefinitions);
          validationComplete(validationErrors, [...parseResult.rows]);
          initialValidationDone.current = true;
        }, 50);
        return;
      }
      const validationErrors = validateData(parseResult.rows, columnDefinitions);
      validationComplete(validationErrors, [...parseResult.rows]);
      initialValidationDone.current = true;
    }
    nextStep();
  };

  const handleBack = () => backStep();

  const handleErrorCorrect = useCallback((rowIndex: number, column: string, value: string, correctionType: 'manual' | 'bulk' | 'auto' = 'manual') => {
    const error = errors.find(e => e.row === rowIndex && e.column === column);
    const originalValue = error?.correctedValue ?? error?.value ?? '';

    if (originalValue !== value) {
      addChangeLogEntry({
        timestamp: new Date(),
        type: correctionType,
        row: rowIndex,
        column,
        originalValue,
        newValue: value,
        studentName: getStudentName(rowIndex),
      });
    }

    correctError(rowIndex, column, value);
  }, [errors, getStudentName, addChangeLogEntry, correctError]);

  const handleBulkCorrect = useCallback((corrections: { row: number; column: string; value: string }[], correctionType: 'bulk' | 'auto' = 'bulk') => {
    const entries: ChangeLogEntry[] = [];
    corrections.forEach(c => {
      const error = errors.find(e => e.row === c.row && e.column === c.column);
      const originalValue = error?.correctedValue ?? error?.value ?? '';
      if (originalValue !== c.value) {
        entries.push({
          timestamp: new Date(),
          type: correctionType,
          row: c.row,
          column: c.column,
          originalValue,
          newValue: c.value,
          studentName: getStudentName(c.row),
        });
      }
    });
    if (entries.length > 0) addChangeLogEntries(entries);
    bulkCorrect(corrections);
  }, [errors, getStudentName, addChangeLogEntries, bulkCorrect]);

  const handleReset = () => {
    reset();
    initialValidationDone.current = false;
  };

  const showSummary = currentStep >= 1 && importType !== 'gruppen' && importType !== 'lp-zuweisung' && importType !== 'lehrpersonen';
  const showGroupWizard = importType === 'gruppen' && currentStep >= 1;
  const showLPWizard = importType === 'lp-zuweisung' && currentStep >= 1;
  const showLehrpersonenWizard = importType === 'lehrpersonen' && currentStep >= 1;
  const showSpecialWizard = showGroupWizard || showLPWizard || showLehrpersonenWizard;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WizardHeader title={getStepTitle()} />
      
      <main className="container mx-auto px-4 py-6 max-w-5xl flex-1">
        {!showSpecialWizard && currentStep >= 1 && (
          <WizardProgress 
            currentStep={currentStep - 1}
            maxVisitedStep={Math.max(maxVisitedStep - 1, 0)}
            steps={wizardSteps} 
            onStepClick={(step) => setStep(step + 1)}
            showDescriptions={true}
          />
        )}

        {showSummary && (
          <WizardSummary
            importType={importType}
            subType={subType}
            processingMode={processingMode}
            fileName={parseResult?.fileName}
            rowCount={parseResult?.rows.length}
            columnStatuses={currentStep >= 2 ? columnStatuses : undefined}
            className="mt-4"
          />
        )}

        <div className="mt-6 space-y-4">
          {!showSpecialWizard && <StepHelpCard step={currentStep} />}

          {currentStep === 0 && (
            <Step0TypeSelect
              selectedType={importType}
              selectedSubType={subType}
              onSelectType={setImportType}
              onSelectSubType={setSubType}
              onNext={handleNext}
              processingMode={processingMode}
              onProcessingModeChange={handleProcessingModeChange}
              correctionSource={correctionSource}
              onCorrectionSourceChange={handleCorrectionSourceChange}
              onCorrectionRulesLoaded={handleCorrectionRulesLoaded}
              loadCorrectionRulesFromFile={correctionMemory.loadFromFile}
              isLoadingCorrectionRules={correctionMemory.isLoading}
              correctionRulesError={correctionMemory.error}
              localStorageRulesCount={localStorageRulesCount}
              loadedCorrectionRules={loadedCorrectionRules}
            />
          )}

          {showGroupWizard && <GroupImportWizard onReset={handleReset} />}
          {showLPWizard && <LPImportWizard onReset={handleReset} />}
          {showLehrpersonenWizard && <LehrpersonenImportWizard onReset={handleReset} />}

          {!showSpecialWizard && currentStep === 1 && (
            <Step1FileUpload
              parseResult={parseResult}
              onFileLoaded={setParseResult}
              onBack={handleBack}
              onNext={handleNext}
              importType={state.importType}
              expectedColumns={columnDefinitions}
            />
          )}

          {!showSpecialWizard && currentStep === 2 && (
            <Step2ColumnCheck
              columnStatuses={columnStatuses}
              removeExtraColumns={removeExtraColumns}
              onRemoveExtraColumnsChange={setRemoveExtraColumns}
              onBack={handleBack}
              onNext={handleNext}
            />
          )}

          {!showSpecialWizard && currentStep === 3 && isValidating && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4" />
              <p className="text-lg font-medium text-foreground">Daten werden validiert…</p>
              <p className="text-sm text-muted-foreground mt-1">
                {parseResult?.rows.length} Datensätze werden geprüft
              </p>
            </div>
          )}

          {!showSpecialWizard && currentStep === 3 && !isValidating && (
            <Step3Validation
              errors={errors}
              rows={correctedRows}
              onErrorCorrect={handleErrorCorrect}
              onBulkCorrect={handleBulkCorrect}
              onBack={handleBack}
              onNext={handleNext}
            />
          )}

          {!showSpecialWizard && currentStep === 4 && parseResult && (
            <Step4Preview
              rows={correctedRows}
              headers={parseResult.headers}
              errors={errors}
              columnStatuses={columnStatuses}
              removeExtraColumns={removeExtraColumns}
              importTypeName={getImportTypeName()}
              changeLog={changeLog}
              fileName={parseResult.fileName}
              sourceFiles={parseResult.sourceFiles}
              onBack={handleBack}
              onReset={handleReset}
              correctionRules={correctionMemory.rules}
              onExportCorrectionRules={correctionMemory.exportToFile}
              onSaveCorrectionRulesToLocalStorage={correctionMemory.saveToLocalStorage}
              onClearCorrectionRulesFromLocalStorage={correctionMemory.clearLocalStorage}
              localStorageCorrectionRulesCount={localStorageRulesCount}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
