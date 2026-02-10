import { useState, useCallback } from 'react';
import { WizardProgress, type WizardStep } from '@/components/import/WizardProgress';
import { GroupStep1Groups } from './groups/GroupStep1Groups';
import { GroupStep2Students } from './groups/GroupStep2Students';
import { GroupStep3Export } from './groups/GroupStep3Export';
import type { GroupData, StudentGroupAssignment } from '@/types/importTypes';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FolderOpen } from 'lucide-react';

export interface SubjectMapping {
  fachname: string;
  kuerzel: string;
  schluessel: string;
  zeugnisname: string;
}

export interface PupilSubject {
  name: string;
  schluessel: string;
}

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
  const [subjectMap, setSubjectMap] = useState<SubjectMapping[]>([]);
  const [pupilSubjects, setPupilSubjects] = useState<PupilSubject[]>([]);

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
            <FolderOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Gruppenzuweisungen</h2>
            <p className="text-sm text-muted-foreground">Manuelle Gruppen und Schüler-Zuweisungen für PUPIL erstellen</p>
          </div>
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
          subjectMap={subjectMap}
          onSubjectMapChange={setSubjectMap}
          pupilSubjects={pupilSubjects}
          onPupilSubjectsChange={setPupilSubjects}
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
          subjectMap={subjectMap}
          onBack={handleBack}
          onReset={onReset}
        />
      )}
    </div>
  );
}
