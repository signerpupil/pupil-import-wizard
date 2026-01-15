import { useState, useCallback } from 'react';
import { WizardHeader } from '@/components/import/WizardHeader';
import { WizardProgress } from '@/components/import/WizardProgress';
import { Step0TypeSelect } from '@/components/import/Step0TypeSelect';
import { Step1FileUpload } from '@/components/import/Step1FileUpload';
import { Step2FieldMapping } from '@/components/import/Step2FieldMapping';
import { Step3Validation } from '@/components/import/Step3Validation';
import { Step4Preview } from '@/components/import/Step4Preview';
import type { ImportType, FoerderplanerSubType, ParsedRow, ValidationError, FieldMapping } from '@/types/importTypes';
import { getFieldsByType, importConfigs, foerderplanerSubTypes } from '@/types/importTypes';
import { validateData, applyCorrectedValues, type ParseResult } from '@/lib/fileParser';

const wizardSteps = [
  { label: 'Typ wählen' },
  { label: 'Datei hochladen' },
  { label: 'Felder zuordnen' },
  { label: 'Validieren' },
  { label: 'Export' },
];

export default function Index() {
  const [currentStep, setCurrentStep] = useState(0);
  const [importType, setImportType] = useState<ImportType | null>(null);
  const [subType, setSubType] = useState<FoerderplanerSubType | null>(null);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [correctedRows, setCorrectedRows] = useState<ParsedRow[]>([]);

  const fieldDefinitions: FieldMapping[] = importType ? getFieldsByType(importType, subType ?? undefined) : [];

  const getImportTypeName = () => {
    if (importType === 'foerderplaner' && subType) {
      const sub = foerderplanerSubTypes.find(s => s.subType === subType);
      return sub?.name ?? 'Förderplaner';
    }
    return importConfigs.find(c => c.type === importType)?.name ?? 'Import';
  };

  const handleNext = () => {
    if (currentStep === 2 && parseResult) {
      // Validate data when moving to step 3
      const validationErrors = validateData(parseResult.rows, mappings, fieldDefinitions);
      setErrors(validationErrors);
      setCorrectedRows([...parseResult.rows]);
    }
    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleErrorCorrect = useCallback((rowIndex: number, field: string, value: string) => {
    setErrors(prev => prev.map(e => 
      e.row === rowIndex && e.field === field 
        ? { ...e, correctedValue: value }
        : e
    ));
    setCorrectedRows(prev => {
      const updated = [...prev];
      if (updated[rowIndex - 1]) {
        updated[rowIndex - 1] = { ...updated[rowIndex - 1], [field]: value };
      }
      return updated;
    });
  }, []);

  const handleReset = () => {
    setCurrentStep(0);
    setImportType(null);
    setSubType(null);
    setParseResult(null);
    setMappings({});
    setErrors([]);
    setCorrectedRows([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <WizardHeader />
      
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

          {currentStep === 2 && parseResult && (
            <Step2FieldMapping
              sourceHeaders={parseResult.headers}
              fieldDefinitions={fieldDefinitions}
              mappings={mappings}
              onMappingsChange={setMappings}
              onBack={handleBack}
              onNext={handleNext}
            />
          )}

          {currentStep === 3 && (
            <Step3Validation
              errors={errors}
              rows={correctedRows}
              onErrorCorrect={handleErrorCorrect}
              onBack={handleBack}
              onNext={handleNext}
            />
          )}

          {currentStep === 4 && (
            <Step4Preview
              rows={correctedRows}
              mappings={mappings}
              errors={errors}
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
