import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, Info, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import img1 from '@/assets/mitarbeitende-export-01.png.asset.json';
import img2 from '@/assets/mitarbeitende-export-02.png.asset.json';
import img3 from '@/assets/mitarbeitende-export-03.png.asset.json';
import img4 from '@/assets/mitarbeitende-export-04.png.asset.json';
import img5 from '@/assets/mitarbeitende-export-05.png.asset.json';
import img6 from '@/assets/mitarbeitende-export-06.png.asset.json';

const STORAGE_KEY = 'mitarbeitende-export-guide-open';

const steps = [
  {
    title: 'Bereich «Adressen» öffnen',
    description:
      'Öffnen Sie in LehrerOffice links den Bereich «Adressen» und prüfen Sie, ob bei «Kategorie» die Lehrpersonen ausgewählt sind.',
    image: img1.url,
    alt: 'LehrerOffice mit geöffnetem Bereich Adressen und ausgewählter Kategorie Lehrpersonen',
  },
  {
    title: 'Export starten',
    description: 'Öffnen Sie oben das Menü «Adresse» und wählen Sie «Exportieren…».',
    image: img2.url,
    alt: 'LehrerOffice Menü Adresse mit dem Eintrag Exportieren',
  },
  {
    title: 'Exportformat auswählen',
    description:
      'Wählen Sie «Adressen der Lehrpersonen (als Excelliste)» und klicken Sie auf «Weiter».',
    image: img3.url,
    alt: 'Auswahl des Exportformats Adressen der Lehrpersonen als Excelliste',
  },
  {
    title: 'Lehrpersonen auswählen',
    description:
      'Markieren Sie alle Lehrpersonen, deren Stammdaten exportiert werden sollen, und klicken Sie auf «Weiter».',
    image: img4.url,
    alt: 'Auswahl der zu exportierenden Lehrpersonen',
  },
  {
    title: 'Dateiname und Speicherort festlegen',
    description:
      'Prüfen Sie den Dateinamen «LehrerOffice_Lehrpersonen.csv», wählen Sie den gewünschten Speicherort und klicken Sie auf «Weiter».',
    image: img5.url,
    alt: 'Eingabe von Dateiname und Speicherort für den LehrerOffice-Export',
  },
  {
    title: 'Export abschliessen',
    description:
      'Warten Sie auf die Meldung «Daten bereitgestellt» und klicken Sie auf «Schliessen». Laden Sie danach die erzeugte CSV-Datei hier hoch.',
    image: img6.url,
    alt: 'Erfolgreich abgeschlossener LehrerOffice-Export mit Meldung Daten bereitgestellt',
  },
];

export function MitarbeitendeExportInstructionGuide() {
  const [open, setOpen] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');
  const [selectedStep, setSelectedStep] = useState<(typeof steps)[number] | null>(null);

  const handleToggle = (value: boolean) => {
    setOpen(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  return (
    <>
      <Collapsible open={open} onOpenChange={handleToggle}>
        <CollapsibleTrigger asChild>
          <Button
            variant="outline"
            className="group h-auto w-full justify-start gap-3 rounded-lg border-primary/20 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/10"
          >
            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <BookOpen className="h-4 w-4" />
            </span>
            <span className="flex-1 text-left">
              Anleitung: Mitarbeitendendaten aus LehrerOffice exportieren
              <span className="mt-0.5 block text-xs font-normal text-primary/70">
                Klicken, um die Schritt-für-Schritt-Anleitung aufzuklappen
              </span>
            </span>
            {open ? (
              <ChevronDown className="ml-auto h-5 w-5 shrink-0 text-primary" />
            ) : (
              <ChevronRight className="ml-auto h-5 w-5 shrink-0 text-primary transition-transform group-hover:translate-x-0.5" />
            )}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent className="space-y-5 px-3 pb-4 pt-3">
          {steps.map((step, index) => (
            <section key={step.title} className="grid gap-3 border-b pb-5 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_280px]">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStep(step)}
                className="group relative overflow-hidden rounded-lg border bg-background text-left shadow-sm transition-shadow hover:shadow-md"
                aria-label={`${step.title} vergrössern`}
              >
                <img src={step.image} alt={step.alt} className="aspect-video w-full object-cover" />
                <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md border bg-background/90 px-2 py-1 text-xs text-foreground opacity-0 transition-opacity group-hover:opacity-100">
                  <ZoomIn className="h-3.5 w-3.5" />
                  Vergrössern
                </span>
              </button>
            </section>
          ))}

          <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>Die exportierte CSV-Datei kann anschliessend direkt im nächsten Bereich hochgeladen werden.</span>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <Dialog open={selectedStep !== null} onOpenChange={(dialogOpen) => !dialogOpen && setSelectedStep(null)}>
        <DialogContent className="flex max-h-[95vh] w-[95vw] max-w-[95vw] flex-col p-3 sm:p-5">
          {selectedStep && (
            <>
              <DialogHeader className="pr-8 text-left">
                <DialogTitle>{selectedStep.title}</DialogTitle>
                <DialogDescription>{selectedStep.description}</DialogDescription>
              </DialogHeader>
              <div className="min-h-0 flex-1 overflow-auto">
                <img src={selectedStep.image} alt={selectedStep.alt} className="h-auto w-full rounded-lg border" />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}