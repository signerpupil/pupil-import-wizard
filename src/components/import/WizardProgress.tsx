import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WizardProgressProps {
  currentStep: number;
  steps: { label: string; description?: string }[];
  onStepClick?: (stepIndex: number) => void;
}

export function WizardProgress({ currentStep, steps, onStepClick }: WizardProgressProps) {
  const handleStepClick = (index: number) => {
    // Only allow clicking on completed steps or the current step
    if (onStepClick && index <= currentStep) {
      onStepClick(index);
    }
  };

  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isClickable = onStepClick && index <= currentStep;

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
                    !isCompleted && !isCurrent && 'bg-muted text-muted-foreground',
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
                    isCompleted ? 'bg-pupil-success' : 'bg-muted'
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
