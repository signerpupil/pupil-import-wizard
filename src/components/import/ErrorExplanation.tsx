import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { getErrorExplanation } from '@/lib/errorExplanations';

interface ErrorExplanationProps {
  /** Spaltenname (z.B. "S_AHV") */
  column: string;
  /** Optionale konkrete Fehlermeldung — wenn gesetzt, wird Message-Lookup priorisiert */
  message?: string;
  /** Visuelle Variante: Icon im Spaltenkopf vs. inline neben Badge */
  variant?: 'icon' | 'inline';
  /** Zusätzliche CSS-Klassen für den Trigger */
  className?: string;
}

/**
 * Inline-Fehlererklärung als Popover.
 * Zeigt einen Info-Icon-Button, der bei Klick eine Erklärung des Fehlers/der Spalte
 * mit Beispiel und Hinweis anzeigt.
 *
 * Rendert nichts, wenn keine Erklärung verfügbar ist.
 */
export function ErrorExplanation({
  column,
  message,
  variant = 'icon',
  className = '',
}: ErrorExplanationProps) {
  const explanation = getErrorExplanation(column, message);
  if (!explanation) return null;

  const sizeClass = variant === 'icon' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`Erklärung zu ${explanation.title}`}
          onClick={(e) => e.stopPropagation()}
          className={`inline-flex items-center justify-center rounded-full text-muted-foreground hover:text-pupil-teal hover:bg-pupil-teal/10 transition-colors p-0.5 ${className}`}
        >
          <Info className={sizeClass} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-80 text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <div className="font-semibold text-foreground">{explanation.title}</div>
          <p className="text-muted-foreground leading-relaxed">{explanation.description}</p>
          {explanation.example && (
            <div className="rounded-md bg-muted/50 px-3 py-2 border border-border/50">
              <div className="text-xs uppercase tracking-wide text-muted-foreground mb-0.5">
                Beispiel
              </div>
              <code className="text-xs font-mono text-foreground">{explanation.example}</code>
            </div>
          )}
          {explanation.hint && (
            <div className="text-xs text-muted-foreground italic border-l-2 border-pupil-teal/40 pl-2">
              {explanation.hint}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
