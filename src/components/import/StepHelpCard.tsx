import { useState, useEffect } from 'react';
import { HelpCircle, Lightbulb, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const HELP_DISMISSED_PREFIX = 'pupil-wizard-help-dismissed-';

interface StepHelpContent {
  title: string;
  description: string;
  tips?: string[];
}

const stepHelpContent: Record<number, StepHelpContent> = {
  0: {
    title: 'Import-Typ und Modus auswählen',
    description: 'Wählen Sie zunächst, welche Daten Sie importieren möchten. Der Modus bestimmt, ob frühere Korrekturen automatisch angewendet werden.',
    tips: [
      'Bei "Weitere Datenaufbereitung" werden Ihre bisherigen Korrekturen auf die neue Datei angewendet.',
      'Die Korrekturregeln können im Browser gespeichert oder als Datei exportiert werden.',
    ],
  },
  1: {
    title: 'Datei aus LehrerOffice hochladen',
    description: 'Laden Sie die exportierte CSV- oder Excel-Datei hoch. Der Wizard erkennt automatisch das Format und zeigt eine Vorschau.',
    tips: [
      'Unterstützte Formate: CSV, Excel (.xlsx, .xls)',
      'Die Datei wird nur lokal in Ihrem Browser verarbeitet - keine Daten werden hochgeladen.',
    ],
  },
  2: {
    title: 'Spalten überprüfen',
    description: 'Hier wird geprüft, ob alle für PUPIL benötigten Spalten in Ihrer Datei vorhanden sind.',
    tips: [
      'Grün = Spalte gefunden',
      'Gelb = Optionale Spalte fehlt (kein Problem)',
      'Rot = Pflicht-Spalte fehlt (muss in LehrerOffice hinzugefügt werden)',
    ],
  },
  3: {
    title: 'Daten validieren und korrigieren',
    description: 'Der Wizard prüft alle Werte auf Formatfehler. Sie können Fehler einzeln korrigieren oder automatische Vorschläge übernehmen.',
    tips: [
      'Nutzen Sie die Schritt-für-Schritt Korrektur für systematisches Durcharbeiten.',
      'Muster-basierte Korrekturen (z.B. Telefonnummern) werden automatisch erkannt.',
      'Jede Korrektur wird für zukünftige Imports gespeichert.',
    ],
  },
  4: {
    title: 'Vorschau und Export',
    description: 'Hier sehen Sie die bereinigte Datei. Speichern Sie Ihre Korrekturregeln und laden Sie die Datei für PUPIL herunter.',
    tips: [
      'Exportieren Sie die Korrekturregeln, um sie beim nächsten Import wiederzuverwenden.',
      'Das Änderungsprotokoll zeigt alle durchgeführten Korrekturen.',
    ],
  },
};

interface StepHelpCardProps {
  step: number;
  className?: string;
  defaultExpanded?: boolean;
}

export function StepHelpCard({ step, className, defaultExpanded = true }: StepHelpCardProps) {
  // Initialize from localStorage synchronously to avoid flash
  const [isDismissed, setIsDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`${HELP_DISMISSED_PREFIX}${step}`) === 'true';
    }
    return false;
  });
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const content = stepHelpContent[step];

  // Update dismissed state when step changes
  useEffect(() => {
    const dismissed = localStorage.getItem(`${HELP_DISMISSED_PREFIX}${step}`) === 'true';
    setIsDismissed(dismissed);
  }, [step]);

  const handleDismiss = () => {
    localStorage.setItem(`${HELP_DISMISSED_PREFIX}${step}`, 'true');
    setIsDismissed(true);
  };

  const handleRestore = () => {
    localStorage.removeItem(`${HELP_DISMISSED_PREFIX}${step}`);
    setIsDismissed(false);
  };

  if (!content) return null;

  if (isDismissed) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRestore}
        className={cn("text-muted-foreground hover:text-foreground", className)}
      >
        <HelpCircle className="h-4 w-4 mr-1" />
        Hilfe anzeigen
      </Button>
    );
  }

  return (
    <Card className={cn("bg-primary/5 border-primary/20", className)}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h4 className="font-medium text-sm">{content.title}</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                >
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              {isExpanded && (
                <>
                  <p className="text-sm text-muted-foreground mt-1">
                    {content.description}
                  </p>
                  
                  {content.tips && content.tips.length > 0 && (
                    <div className="mt-3 space-y-1.5">
                      {content.tips.map((tip, index) => (
                        <div key={index} className="flex items-start gap-2 text-xs">
                          <Lightbulb className="h-3.5 w-3.5 text-yellow-500 shrink-0 mt-0.5" />
                          <span className="text-muted-foreground">{tip}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Export for external reset
export const resetStepHelp = (step?: number) => {
  if (step !== undefined) {
    localStorage.removeItem(`${HELP_DISMISSED_PREFIX}${step}`);
  } else {
    // Reset all
    for (let i = 0; i <= 4; i++) {
      localStorage.removeItem(`${HELP_DISMISSED_PREFIX}${i}`);
    }
  }
};
