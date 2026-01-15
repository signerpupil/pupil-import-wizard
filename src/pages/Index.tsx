import { useState, useCallback } from 'react';
import { WizardHeader } from '@/components/import/WizardHeader';
import { WizardProgress } from '@/components/import/WizardProgress';
import { Step0TypeSelect } from '@/components/import/Step0TypeSelect';
import { Step1FileUpload } from '@/components/import/Step1FileUpload';
import { Step2ColumnCheck } from '@/components/import/Step2ColumnCheck';
import { Step3Validation } from '@/components/import/Step3Validation';
import { Step4Preview } from '@/components/import/Step4Preview';
import type { ImportType, FoerderplanerSubType, ParsedRow, ValidationError, ColumnStatus, ColumnDefinition } from '@/types/importTypes';
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
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [subType, setSubType] = useState<FoerderplanerSubType | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [columnStatuses, setColumnStatuses] = useState<ColumnStatus[]>([]);
  const [removeExtraColumns, setRemoveExtraColumns] = useState(false);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [correctedRows, setCorrectedRows] = useState<ParsedRow[]>([]);

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
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleErrorCorrect = useCallback((rowIndex: number, column: string, value: string) => {
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
  }, []);

  const handleBulkCorrect = useCallback((corrections: { row: number; column: string; value: string }[]) => {
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
  }, []);

  const handleReset = () => {
    setCurrentStep(0);
    setImportType(null);
    setSubType(null);
    setParseResult(null);
    setColumnStatuses([]);
    setRemoveExtraColumns(false);
    setErrors([]);
    setCorrectedRows([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <WizardHeader title={getStepTitle()} />
      
      <main className="container mx-auto px-4 py-6 max-w-5xl">
        <WizardProgress currentStep={currentStep} steps={wizardSteps} />

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
              onBack={handleBack}
              onReset={handleReset}
            />
          )}
        </div>
      </main>
    </div>
  );
}
