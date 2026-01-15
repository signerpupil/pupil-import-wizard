import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardProgressProps {
  currentStep: number;
  maxVisitedStep: number;
  steps: { label: string; description?: string }[];
  onStepClick?: (stepIndex: number) => void;
}

export function WizardProgress({ currentStep, maxVisitedStep, steps, onStepClick }: WizardProgressProps) {
  const handleStepClick = (index: number) => {
    // Allow clicking on any step up to the max visited step
    if (onStepClick && index <= maxVisitedStep) {
      onStepClick(index);
    }
  };

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isVisited = index <= maxVisitedStep;
          const isClickable = onStepClick && isVisited;

          return (
            <div key={index} className="flex-1 flex items-center">
              <div 
                className={cn(
                  "flex flex-col items-center flex-1",
                  isClickable && "cursor-pointer group"
                )}
                onClick={() => handleStepClick(index)}
              >
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                    isCompleted && 'bg-pupil-success text-pupil-success-foreground',
                    isCurrent && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                    !isCompleted && !isCurrent && isVisited && 'bg-pupil-teal text-pupil-teal-foreground',
                    !isCompleted && !isCurrent && !isVisited && 'bg-muted text-muted-foreground',
                    isClickable && !isCurrent && 'group-hover:ring-2 group-hover:ring-primary/30'
                  )}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : index}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      'text-sm font-medium transition-colors',
                      isCurrent ? 'text-primary' : 'text-muted-foreground',
                      isClickable && !isCurrent && 'group-hover:text-primary'
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description && (
                    <p className="text-xs text-muted-foreground hidden md:block">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    'h-1 flex-1 mx-2 rounded',
                    index < currentStep ? 'bg-pupil-success' : 
                    index < maxVisitedStep ? 'bg-pupil-teal' : 'bg-muted'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
