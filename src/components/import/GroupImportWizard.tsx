import { useState, useCallback } from 'react';
import { WizardProgress, type WizardStep } from '@/components/import/WizardProgress';
import { GroupStep1Groups } from './groups/GroupStep1Groups';
import { GroupStep2Students } from './groups/GroupStep2Students';
import { GroupStep3Export } from './groups/GroupStep3Export';
import type { GroupData, StudentGroupAssignment } from '@/types/importTypes';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const groupWizardSteps: WizardStep[] = [
  { label: 'Gruppen erfassen', description: 'Copy-Paste aus LehrerOffice' },
  { label: 'Schüler zuweisen', description: 'CSV/Excel Upload' },
  { label: 'Export', description: 'Dateien herunterladen' },
];

interface GroupImportWizardProps {
  onReset: () => void;
}

export function GroupImportWizard({ onReset }: GroupImportWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [assignments, setAssignments] = useState<StudentGroupAssignment[]>([]);

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
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zur Typauswahl
        </Button>
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gruppenzuweisungen</h2>
          <p className="text-sm text-muted-foreground">Manuelle Gruppen und Schüler-Zuweisungen für PUPIL erstellen</p>
        </div>
      </div>

      <WizardProgress
        currentStep={currentStep}
        maxVisitedStep={maxVisitedStep}
        steps={groupWizardSteps}
        onStepClick={(step) => setCurrentStep(step)}
        showDescriptions={true}
      />

      {currentStep === 0 && (
        <GroupStep1Groups
          groups={groups}
          onGroupsChange={setGroups}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}

      {currentStep === 1 && (
        <GroupStep2Students
          groups={groups}
          assignments={assignments}
          onAssignmentsChange={setAssignments}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}

      {currentStep === 2 && (
        <GroupStep3Export
          groups={groups}
          assignments={assignments}
          onBack={handleBack}
          onReset={onReset}
        />
      )}
    </div>
  );
}
