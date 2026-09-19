import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { AlertTriangle, ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ExternalLink, Info } from 'lucide-react';

export interface TutorialHotspot {
  left: number;
  top: number;
  width: number;
  height: number;
  label?: string;
}

export interface GuidedTutorialStep {
  title: string;
  description: string;
  image?: string;
  alt?: string;
  hotspots?: TutorialHotspot[];
  details?: { title: string; value?: string; description: string }[];
  success?: string;
  warning?: string;
  info?: string;
  checklist?: boolean;
}

export interface TutorialDocLink {
  url: string;
  title?: string;
  description?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  steps: GuidedTutorialStep[];
  checklistItems: string[];
  finalWarning: string;
  docLink?: TutorialDocLink;
}

export function GuidedImportTutorialDialog({
  open,
  onOpenChange,
  title,
  steps,
  checklistItems,
  finalWarning,
  docLink,
}: Props) {
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<boolean[]>(checklistItems.map(() => false));
  const [warningOpen, setWarningOpen] = useState(false);

  useEffect(() => {
    setIndex(0);
    setChecked(checklistItems.map(() => false));
    setWarningOpen(false);
  }, [checklistItems, open]);

  useEffect(() => {
    if (open && index === steps.length - 1 && index > 0) setWarningOpen(true);
  }, [index, open, steps.length]);

  const step = steps[index];
  if (!step) return null;

  const isLast = index === steps.length - 1;
  const isChecklist = step.checklist === true;
  const checkedCount = checked.filter(Boolean).length;
  const checklistDone = checkedCount === checklistItems.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b space-y-1 text-left">
          <div className="flex flex-row items-center justify-between">
            <DialogTitle className="text-base">{title}</DialogTitle>
            <Badge variant="secondary" className="shrink-0 mr-8">
              Schritt {index + 1} / {steps.length}
            </Badge>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            <span className="font-medium text-foreground">{step.title}</span> – {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto bg-muted/40 p-4">
          <div className="mx-auto w-full space-y-3">
            {isChecklist && (
              <div className="mx-auto w-full max-w-3xl rounded-lg border bg-background p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-foreground">Checkliste abhaken</p>
                  <Badge variant={checklistDone ? 'default' : 'secondary'}>
                    {checkedCount} / {checklistItems.length} erledigt
                  </Badge>
                </div>
                <ul className="space-y-2">
                  {checklistItems.map((item, itemIndex) => (
                    <li key={item}>
                      <label
                        className={cn(
                          'flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors',
                          checked[itemIndex] ? 'border-pupil-success/40 bg-pupil-success/5' : 'hover:bg-muted/50',
                        )}
                      >
                        <Checkbox
                          checked={checked[itemIndex]}
                          onCheckedChange={(value) =>
                            setChecked((previous) =>
                              previous.map((current, currentIndex) =>
                                currentIndex === itemIndex ? value === true : current,
                              ),
                            )
                          }
                          className="mt-0.5"
                        />
                        <span
                          className={cn(
                            'text-sm leading-relaxed',
                            checked[itemIndex] && 'text-muted-foreground line-through',
                          )}
                        >
                          {item}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                {!checklistDone && (
                  <p className="text-xs text-muted-foreground">Hake alle Punkte ab, um mit dem Tutorial zu starten.</p>
                )}
              </div>
            )}

            {step.details && (
              <div className="mx-auto w-full max-w-3xl rounded-lg border bg-background p-4 space-y-3">
                {step.details.map((detail, detailIndex) => (
                  <div key={detail.title} className="flex gap-3">
                    <div className="w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                      {detailIndex + 1}
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-foreground">{detail.title}</p>
                      {detail.value && (
                        <p className="font-mono text-xs bg-muted rounded px-2 py-0.5 inline-block mt-1">{detail.value}</p>
                      )}
                      <p className="text-muted-foreground mt-1">{detail.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {step.image && (
              <div className="relative">
                <img src={step.image} alt={step.alt ?? ''} className="w-full h-auto rounded-lg border shadow-sm bg-background" />
                {step.hotspots?.map((hotspot, hotspotIndex) => (
                  <div
                    key={`${hotspot.left}-${hotspot.top}-${hotspotIndex}`}
                    className="absolute rounded-md ring-2 ring-primary bg-primary/10 animate-pulse pointer-events-none"
                    style={{
                      left: `${hotspot.left}%`,
                      top: `${hotspot.top}%`,
                      width: `${hotspot.width}%`,
                      height: `${hotspot.height}%`,
                    }}
                  >
                    {hotspot.label && (
                      <span
                        className={cn(
                          'absolute -top-3 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow',
                          hotspot.left + hotspot.width > 90 ? 'right-1' : 'left-1',
                        )}
                      >
                        {hotspot.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mx-auto w-full max-w-6xl space-y-3">
              {step.success && (
                <div className="flex gap-2 rounded-lg border border-pupil-success/30 bg-pupil-success/5 p-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-pupil-success" />
                  <p className="text-muted-foreground">{step.success}</p>
                </div>
              )}
              {step.info && (
                <div className="flex gap-2 rounded-lg border bg-background p-3 text-sm">
                  <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                  <p className="text-muted-foreground">{step.info}</p>
                </div>
              )}
              {step.warning && (
                <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                  <p className="text-muted-foreground">{step.warning}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <p className="px-4 py-2 text-xs text-muted-foreground border-t">
          Nutzen Sie die Navigation unten, um Schritt für Schritt durch das Tutorial zu gehen.
        </p>
        <div className="flex items-center justify-between gap-4 border-t px-6 py-3">
          <Button variant="outline" onClick={() => setIndex((current) => Math.max(0, current - 1))} disabled={index === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>

          <div className="flex items-center gap-1.5">
            {steps.map((tutorialStep, stepIndex) => {
              const unavailable = stepIndex > 0 && !checklistDone;
              return (
                <Button
                  key={tutorialStep.title}
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Zu Schritt ${stepIndex + 1}`}
                  disabled={unavailable}
                  onClick={() => setIndex(stepIndex)}
                  className="h-6 w-7 p-0"
                >
                  <span
                    className={cn(
                      'block h-2.5 rounded-full transition-all',
                      stepIndex === index ? 'w-6 bg-primary' : 'w-2.5 bg-muted-foreground/30',
                    )}
                  />
                </Button>
              );
            })}
          </div>

          {isLast ? (
            <Button onClick={() => onOpenChange(false)}>
              <Check className="mr-2 h-4 w-4" />
              Fertig
            </Button>
          ) : (
            <Button
              onClick={() => setIndex((current) => Math.min(steps.length - 1, current + 1))}
              disabled={isChecklist && !checklistDone}
            >
              {isChecklist ? 'Checkliste bestätigen & starten' : 'Weiter'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>

      <AlertDialog open={warningOpen} onOpenChange={setWarningOpen}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              Wichtig – bitte beachten
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed text-foreground">
              {finalWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {docLink && (
            <div className="flex gap-3 rounded-md border border-primary/25 bg-primary/[0.04] p-3">
              <BookOpen className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
              <div className="space-y-2 text-sm">
                <p className="font-medium text-foreground">{docLink.title ?? 'Ausführliche Dokumentation'}</p>
                <p className="text-muted-foreground leading-relaxed">
                  {docLink.description ??
                    'Alle Details zum Import – inklusive Fehlerbehandlung und häufigen Fragen – findest du in der vollständigen Anleitung.'}
                </p>
                <Button asChild size="sm" className="w-full sm:w-auto">
                  <a href={docLink.url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Dokumentation öffnen
                  </a>
                </Button>
              </div>
            </div>
          )}
          <AlertDialogAction className="w-full">Verstanden</AlertDialogAction>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}