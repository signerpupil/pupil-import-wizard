import { useState, useCallback } from 'react';
import { WizardProgress, type WizardStep } from '@/components/import/WizardProgress';
import { LPStep1Classes } from './lp-zuweisung/LPStep1Classes';
import { LPStep2Teachers } from './lp-zuweisung/LPStep2Teachers';
import { LPStep3Export } from './lp-zuweisung/LPStep3Export';
import type { ClassTeacherData, PupilPerson, TeacherAssignment } from '@/types/importTypes';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ClipboardList } from 'lucide-react';

const lpWizardSteps: WizardStep[] = [
  { label: 'Klassen erfassen', description: 'Copy-Paste aus LehrerOffice' },
  { label: 'LP zuordnen', description: 'Personen-PUPIL Upload' },
  { label: 'Export', description: 'Excel herunterladen' },
];

interface LPImportWizardProps {
  onReset: () => void;
}

export function LPImportWizard({ onReset }: LPImportWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [classData, setClassData] = useState<ClassTeacherData[]>([]);
  const [persons, setPersons] = useState<PupilPerson[]>([]);
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([]);

  const handleNext = useCallback(() => {
    const nextStep = Math.min(currentStep + 1, 2);
    setCurrentStep(nextStep);
    setMaxVisitedStep(prev => Math.max(prev, nextStep));
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep === 0) {
      onReset();
    } else {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep, onReset]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-5">
        <Button variant="ghost" size="icon" onClick={onReset} className="shrink-0 h-10 w-10 rounded-xl hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">LP-Klassenzuweisungen</h2>
            <p className="text-sm text-muted-foreground">Lehrpersonen-Zuweisungen für Fächer der Stundentafel erstellen</p>
          </div>
        </div>
      </div>

      <WizardProgress
        currentStep={currentStep}
        maxVisitedStep={maxVisitedStep}
        steps={lpWizardSteps}
        onStepClick={(step) => setCurrentStep(step)}
        showDescriptions={true}
      />

      {currentStep === 0 && (
        <LPStep1Classes
          classData={classData}
          onClassDataChange={setClassData}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}

      {currentStep === 1 && (
        <LPStep2Teachers
          classData={classData}
          persons={persons}
          onPersonsChange={setPersons}
          assignments={assignments}
          onAssignmentsChange={setAssignments}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}

      {currentStep === 2 && (
        <LPStep3Export
          assignments={assignments}
          onBack={handleBack}
          onReset={onReset}
        />
      )}
    </div>
  );
}
