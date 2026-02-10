import { useState, useCallback, useEffect } from 'react';
import { WizardHeader } from '@/components/import/WizardHeader';
import { WizardProgress, type WizardStep } from '@/components/import/WizardProgress';
import { WizardSummary } from '@/components/import/WizardSummary';
import { StepHelpCard } from '@/components/import/StepHelpCard';
import { OnboardingDialog } from '@/components/import/OnboardingDialog';
import { Step0TypeSelect } from '@/components/import/Step0TypeSelect';
import { Step1FileUpload } from '@/components/import/Step1FileUpload';
import { Step2ColumnCheck } from '@/components/import/Step2ColumnCheck';
import { Step3Validation } from '@/components/import/Step3Validation';
import { Step4Preview } from '@/components/import/Step4Preview';
import { GroupImportWizard } from '@/components/import/GroupImportWizard';
import { LPImportWizard } from '@/components/import/LPImportWizard';
import { Footer } from '@/components/layout/Footer';
import type { ImportType, FoerderplanerSubType, ParsedRow, ValidationError, ColumnStatus, ColumnDefinition, ChangeLogEntry } from '@/types/importTypes';
import type { ProcessingMode, CorrectionSource, CorrectionRule } from '@/types/correctionTypes';
import { getColumnsByType, importConfigs, foerderplanerSubTypes } from '@/types/importTypes';
import { checkColumnStatus, validateData, type ParseResult } from '@/lib/fileParser';
import { useCorrectionMemory } from '@/hooks/useCorrectionMemory';
import { useToast } from '@/hooks/use-toast';

const wizardSteps: WizardStep[] = [
  { label: 'Datei hochladen', description: 'CSV oder Excel' },
  { label: 'Spalten prüfen', description: 'Vollständigkeit' },
  { label: 'Validieren', description: 'Fehler korrigieren' },
  { label: 'Export', description: 'Datei herunterladen' },
];

export default function Index() {
  const [currentStep, setCurrentStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [importType, setImportType] = useState<ImportType | null>('schueler'); // Default to schueler for now
  const [subType, setSubType] = useState<FoerderplanerSubType | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [columnStatuses, setColumnStatuses] = useState<ColumnStatus[]>([]);
  const [removeExtraColumns, setRemoveExtraColumns] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [correctedRows, setCorrectedRows] = useState<ParsedRow[]>([]);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);

  // Correction Memory state
  const [processingMode, setProcessingMode] = useState<ProcessingMode>('initial');
  const [correctionSource, setCorrectionSource] = useState<CorrectionSource>('localStorage');
  const [loadedCorrectionRules, setLoadedCorrectionRules] = useState<CorrectionRule[]>([]);
  const [pendingCorrectionRules, setPendingCorrectionRules] = useState<CorrectionRule[]>([]);
  const [autoCorrectionsApplied, setAutoCorrectionsApplied] = useState(false);

  const { toast } = useToast();

  // Use correction memory hook
  const correctionMemory = useCorrectionMemory(importType || 'schueler');

  const columnDefinitions: ColumnDefinition[] = importType ? getColumnsByType(importType, subType ?? undefined) : [];

  // Get localStorage count when import type changes
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
  }, [correctionSource, correctionMemory]);

  // Handle correction source change
  const handleCorrectionSourceChange = useCallback((source: CorrectionSource) => {
    setCorrectionSource(source);
    if (source === 'localStorage') {
      const rules = correctionMemory.loadFromLocalStorage();
      setPendingCorrectionRules(rules);
      setLoadedCorrectionRules([]);
    } else {
      setPendingCorrectionRules([]);
    }
  }, [correctionMemory]);

  // Handle correction rules loaded from file
  const handleCorrectionRulesLoaded = useCallback((rules: CorrectionRule[]) => {
    setLoadedCorrectionRules(rules);
    setPendingCorrectionRules(rules);
  }, []);

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
      // Apply corrections
      const bulkCorrections = corrections.map(c => ({
        row: c.row,
        column: c.column,
        value: c.correctedValue,
      }));

      // Update errors
      setErrors(prev => prev.map(e => {
        const correction = corrections.find(c => c.row === e.row && c.column === e.column);
        return correction ? { ...e, correctedValue: correction.correctedValue } : e;
      }));

      // Update rows
      setCorrectedRows(prev => {
        const updated = [...prev];
        corrections.forEach(c => {
          if (updated[c.row - 1]) {
            updated[c.row - 1] = { ...updated[c.row - 1], [c.column]: c.correctedValue };
          }
        });
        return updated;
      });

      // Add to change log
      corrections.forEach(c => {
        setChangeLog(prev => [...prev, {
          timestamp: new Date(),
          type: 'auto' as const,
          row: c.row,
          column: c.column,
          originalValue: c.originalValue,
          newValue: c.correctedValue,
          studentName: getStudentName(c.row),
        }]);
      });

      toast({
        title: 'Automatische Korrekturen angewendet',
        description: `${stats.totalApplied} Korrekturen aus dem Korrektur-Gedächtnis wurden angewendet.`,
      });
    }

    setAutoCorrectionsApplied(true);
  }, [pendingCorrectionRules, autoCorrectionsApplied, parseResult, correctedRows, errors, correctionMemory, toast]);

  // Apply corrections when entering step 3
  useEffect(() => {
    if (currentStep === 3 && processingMode === 'continued' && !autoCorrectionsApplied) {
      // Small delay to ensure state is settled
      const timer = setTimeout(() => {
        applyPendingCorrections();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [currentStep, processingMode, autoCorrectionsApplied, applyPendingCorrections]);

  const handleNext = () => {
    if (currentStep === 1 && parseResult) {
      // Check column status when moving to step 2
      const statuses = checkColumnStatus(parseResult.headers, columnDefinitions);
      setColumnStatuses(statuses);
    }
    if (currentStep === 2 && parseResult) {
      // Validate data when moving to step 3
      const validationErrors = validateData(parseResult.rows, columnDefinitions);
      setErrors(validationErrors);
      setCorrectedRows([...parseResult.rows]);
      // Reset auto-corrections flag to allow reapplication
      setAutoCorrectionsApplied(false);
    }
    const nextStep = Math.min(currentStep + 1, 4);
    setCurrentStep(nextStep);
    setMaxVisitedStep(prev => Math.max(prev, nextStep));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  // Helper to get student name for a row
  const getStudentName = useCallback((rowIndex: number) => {
    const row = correctedRows[rowIndex - 1];
    if (!row) return undefined;
    const name = row['S_Name'] || row['S_name'] || '';
    const vorname = row['S_Vorname'] || row['S_vorname'] || '';
    if (name || vorname) {
      return `${vorname} ${name}`.trim();
    }
    const eintragFuer = row['Eintrag_fuer'] || '';
    return eintragFuer ? String(eintragFuer) : undefined;
  }, [correctedRows]);

  const handleErrorCorrect = useCallback((rowIndex: number, column: string, value: string, correctionType: 'manual' | 'bulk' | 'auto' = 'manual') => {
    // Find original value from errors
    const error = errors.find(e => e.row === rowIndex && e.column === column);
    const originalValue = error?.correctedValue ?? error?.value ?? '';

    // Add to change log
    if (originalValue !== value) {
      setChangeLog(prev => [...prev, {
        timestamp: new Date(),
        type: correctionType,
        row: rowIndex,
        column,
        originalValue,
        newValue: value,
        studentName: getStudentName(rowIndex),
      }]);
    }

    setErrors(prev => prev.map(e => 
      e.row === rowIndex && e.column === column 
        ? { ...e, correctedValue: value }
        : e
    ));
    setCorrectedRows(prev => {
      const updated = [...prev];
      if (updated[rowIndex - 1]) {
        updated[rowIndex - 1] = { ...updated[rowIndex - 1], [column]: value };
      }
      return updated;
    });
  }, [errors, getStudentName]);

  const handleBulkCorrect = useCallback((corrections: { row: number; column: string; value: string }[], correctionType: 'bulk' | 'auto' = 'bulk') => {
    // Add to change log
    corrections.forEach(c => {
      const error = errors.find(e => e.row === c.row && e.column === c.column);
      const originalValue = error?.correctedValue ?? error?.value ?? '';
      
      if (originalValue !== c.value) {
        setChangeLog(prev => [...prev, {
          timestamp: new Date(),
          type: correctionType,
          row: c.row,
          column: c.column,
          originalValue,
          newValue: c.value,
          studentName: getStudentName(c.row),
        }]);
      }
    });

    setErrors(prev => prev.map(e => {
      const correction = corrections.find(c => c.row === e.row && c.column === e.column);
      return correction ? { ...e, correctedValue: correction.value } : e;
    }));
    setCorrectedRows(prev => {
      const updated = [...prev];
      corrections.forEach(c => {
        if (updated[c.row - 1]) {
          updated[c.row - 1] = { ...updated[c.row - 1], [c.column]: c.value };
        }
      });
      return updated;
    });
  }, [errors, getStudentName]);

  const handleReset = () => {
    setCurrentStep(0);
    setMaxVisitedStep(0);
    setImportType('schueler');
    setSubType(null);
    setParseResult(null);
    setColumnStatuses([]);
    setRemoveExtraColumns(false);
    setErrors([]);
    setCorrectedRows([]);
    setChangeLog([]);
    setProcessingMode('initial');
    setCorrectionSource('localStorage');
    setLoadedCorrectionRules([]);
    setPendingCorrectionRules([]);
    setAutoCorrectionsApplied(false);
  };

  // Show summary from step 1 onwards (not for special types)
  const showSummary = currentStep >= 1 && importType !== 'gruppen' && importType !== 'lp-zuweisung';

  // If gruppen type is selected and step 0 is done, show the group wizard
  const showGroupWizard = importType === 'gruppen' && currentStep >= 1;
  const showLPWizard = importType === 'lp-zuweisung' && currentStep >= 1;
  const showSpecialWizard = showGroupWizard || showLPWizard;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WizardHeader title={getStepTitle()} />
      
      {/* Onboarding Dialog for first-time users */}
      <OnboardingDialog />
      
      <main className="container mx-auto px-4 py-6 max-w-5xl flex-1">
        {!showSpecialWizard && currentStep >= 1 && (
          <WizardProgress 
            currentStep={currentStep - 1}
            maxVisitedStep={Math.max(maxVisitedStep - 1, 0)}
            steps={wizardSteps} 
            onStepClick={(step) => setCurrentStep(step + 1)}
            showDescriptions={true}
          />
        )}

        {/* Summary Banner */}
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
          {/* Contextual Help Card */}
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

          {showGroupWizard && (
            <GroupImportWizard onReset={handleReset} />
          )}

          {showLPWizard && (
            <LPImportWizard onReset={handleReset} />
          )}

          {!showSpecialWizard && currentStep === 1 && (
            <Step1FileUpload
              parseResult={parseResult}
              onFileLoaded={setParseResult}
              onBack={handleBack}
              onNext={handleNext}
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

          {!showSpecialWizard && currentStep === 3 && (
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
