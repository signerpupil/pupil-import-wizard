import pupilLogo from '@/assets/pupil-logo.png';

interface WizardHeaderProps {
  title?: string;
  showStep?: boolean;
  onHomeClick?: () => void;
}

export function WizardHeader({ title, showStep = false, onHomeClick }: WizardHeaderProps) {
  const trimmed = title?.trim();

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border/60 shadow-[0_1px_3px_hsl(var(--foreground)/0.04)]">
      <div className="container mx-auto px-4 max-w-5xl h-20 relative flex items-center justify-center">
        {onHomeClick ? (
          <button
            type="button"
            onClick={onHomeClick}
            aria-label="Zurück zur Startseite"
            title="Zurück zur Startseite"
            className="rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          >
            <img src={pupilLogo} alt="pupil by seven education" className="h-14 w-auto" />
          </button>
        ) : (
          <img src={pupilLogo} alt="pupil by seven education" className="h-14 w-auto" />
        )}
        {showStep && trimmed && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 shrink-0 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            {trimmed}
          </span>
        )}
      </div>
    </header>
  );
}
