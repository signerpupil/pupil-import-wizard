import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileSpreadsheet, Upload, Columns, CheckCircle, Download, Sparkles } from 'lucide-react';

const ONBOARDING_KEY = 'pupil-wizard-onboarding-completed';

interface OnboardingDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const steps = [
  {
    icon: FileSpreadsheet,
    title: 'Import-Typ wählen',
    description: 'Wählen Sie, welche Daten Sie importieren möchten.',
  },
  {
    icon: Upload,
    title: 'Datei hochladen',
    description: 'Laden Sie Ihre CSV oder Excel-Datei hoch.',
  },
  {
    icon: Columns,
    title: 'Spalten prüfen',
    description: 'Der Wizard prüft, ob alle benötigten Spalten vorhanden sind.',
  },
  {
    icon: CheckCircle,
    title: 'Fehler korrigieren',
    description: 'Korrigieren Sie Validierungsfehler einzeln oder automatisch.',
  },
  {
    icon: Download,
    title: 'Export',
    description: 'Laden Sie die bereinigte Datei für PUPIL herunter.',
  },
];

export function OnboardingDialog({ open: controlledOpen, onOpenChange }: OnboardingDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    if (controlledOpen === undefined) {
      const completed = localStorage.getItem(ONBOARDING_KEY);
      if (!completed) {
        setInternalOpen(true);
      }
    }
  }, [controlledOpen]);

  const isOpen = controlledOpen !== undefined ? controlledOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (controlledOpen !== undefined) {
      onOpenChange?.(newOpen);
    } else {
      setInternalOpen(newOpen);
    }
  };

  const handleGetStarted = () => {
    if (dontShowAgain) {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
    handleOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl">Willkommen beim Import Wizard</DialogTitle>
          <DialogDescription className="text-base">
            Dieser Assistent hilft Ihnen, Daten aus LehrerOffice für PUPIL aufzubereiten.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4 text-center">
            In 5 einfachen Schritten zur bereinigten Datei:
          </p>
          
          <div className="space-y-3">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-semibold shrink-0">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <step.icon className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium text-sm">{step.title}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 pt-2">
          <div className="flex items-center gap-2">
            <Checkbox 
              id="dont-show-again"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label 
              htmlFor="dont-show-again" 
              className="text-sm text-muted-foreground cursor-pointer"
            >
              Diesen Dialog nicht mehr anzeigen
            </label>
          </div>
          
          <Button onClick={handleGetStarted} className="w-full" size="lg">
            Los geht's
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Export the key for external reset capability
export const ONBOARDING_STORAGE_KEY = ONBOARDING_KEY;
