import { useState, useCallback } from 'react';
import { WizardHeader } from '@/components/import/WizardHeader';
import { WizardProgress } from '@/components/import/WizardProgress';
import { Step0TypeSelect } from '@/components/import/Step0TypeSelect';
import { Step1FileUpload } from '@/components/import/Step1FileUpload';
import { Step2ColumnCheck } from '@/components/import/Step2ColumnCheck';
import { Step3Validation } from '@/components/import/Step3Validation';
import { Step4Preview } from '@/components/import/Step4Preview';
import { ChangeLog } from '@/components/import/ChangeLog';
import { Footer } from '@/components/layout/Footer';
import type { ImportType, FoerderplanerSubType, ParsedRow, ValidationError, ColumnStatus, ColumnDefinition, ChangeLogEntry } from '@/types/importTypes';
import { getColumnsByType, importConfigs, foerderplanerSubTypes } from '@/types/importTypes';
import { checkColumnStatus, validateData, type ParseResult } from '@/lib/fileParser';

const wizardSteps = [
  { label: 'Typ wählen' },
  { label: 'Datei hochladen' },
  { label: 'Spalten prüfen' },
  { label: 'Validieren' },
  { label: 'Export' },
];

export default function Index() {
  const [currentStep, setCurrentStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [subType, setSubType] = useState<FoerderplanerSubType | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [columnStatuses, setColumnStatuses] = useState<ColumnStatus[]>([]);
  const [removeExtraColumns, setRemoveExtraColumns] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [correctedRows, setCorrectedRows] = useState<ParsedRow[]>([]);
  const [changeLog, setChangeLog] = useState<ChangeLogEntry[]>([]);

  const columnDefinitions: ColumnDefinition[] = importType ? getColumnsByType(importType, subType ?? undefined) : [];

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
    setImportType(null);
    setSubType(null);
    setParseResult(null);
    setColumnStatuses([]);
    setRemoveExtraColumns(false);
    setErrors([]);
    setCorrectedRows([]);
    setChangeLog([]);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WizardHeader title={getStepTitle()} />
      
      <main className="container mx-auto px-4 py-6 max-w-5xl flex-1">
        <WizardProgress 
          currentStep={currentStep}
          maxVisitedStep={maxVisitedStep}
          steps={wizardSteps} 
          onStepClick={(step) => setCurrentStep(step)}
        />

        <div className="mt-8">
          {currentStep === 0 && (
            <Step0TypeSelect
              selectedType={importType}
              selectedSubType={subType}
              onSelectType={setImportType}
              onSelectSubType={setSubType}
              onNext={handleNext}
            />
          )}

          {currentStep === 1 && (
            <Step1FileUpload
              parseResult={parseResult}
              onFileLoaded={setParseResult}
              onBack={handleBack}
              onNext={handleNext}
            />
          )}

          {currentStep === 2 && (
            <Step2ColumnCheck
              columnStatuses={columnStatuses}
              removeExtraColumns={removeExtraColumns}
              onRemoveExtraColumnsChange={setRemoveExtraColumns}
              onBack={handleBack}
              onNext={handleNext}
            />
          )}

          {currentStep === 3 && (
            <Step3Validation
              errors={errors}
              rows={correctedRows}
              onErrorCorrect={handleErrorCorrect}
              onBulkCorrect={handleBulkCorrect}
              onBack={handleBack}
              onNext={handleNext}
            />
          )}

          {currentStep === 4 && parseResult && (
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
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
