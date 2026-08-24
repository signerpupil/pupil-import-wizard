import pupilLogo from '@/assets/pupil-logo.png';

interface WizardHeaderProps {
  title?: string;
  showStep?: boolean;
}

export function WizardHeader({ title, showStep = false }: WizardHeaderProps) {
  const trimmed = title?.trim();

  return (
    <header className="sticky top-0 z-40 bg-card border-b border-border/60 shadow-[0_1px_3px_hsl(var(--foreground)/0.04)]">
      <div className="container mx-auto px-4 max-w-5xl h-16 flex items-center gap-4">
        <img src={pupilLogo} alt="pupil by seven education" className="h-10 w-auto" />
        <div className="h-8 w-px bg-border" aria-hidden="true" />
        <div className="min-w-0">
          <span className="block text-sm font-semibold tracking-tight text-foreground">
</span>
          <span className="block text-xs text-muted-foreground truncate">
</span>
        </div>
        {showStep && trimmed && (
          <span className="ml-auto shrink-0 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            {trimmed}
          </span>
        )}
      </div>
    </header>
  );
}
