import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NavigationButtonsProps {
  onBack: () => void;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  showNext?: boolean;
  size?: 'default' | 'sm' | 'lg';
}

export function NavigationButtons({
  onBack,
  onNext,
  nextLabel = 'Weiter',
  nextDisabled = false,
  showNext = true,
  size = 'default',
}: NavigationButtonsProps) {
  return (
    <div className="flex justify-between">
      <Button variant="outline" onClick={onBack} size={size}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Zurück
      </Button>
      {showNext && onNext && (
        <Button onClick={onNext} disabled={nextDisabled} size={size}>
          {nextLabel}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
