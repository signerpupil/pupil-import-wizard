import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import loAnsicht from '@/assets/lo-anleitung-ansicht.png';
import loKopieren from '@/assets/lo-anleitung-kopieren.png';

const STORAGE_KEY = 'lo-guide-open';

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
      {n}
    </span>
  );
}

export function LOInstructionGuide() {
  const [open, setOpen] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? false : stored === 'true';
  });
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const handleToggle = (value: boolean) => {
    setOpen(value);
    localStorage.setItem(STORAGE_KEY, String(value));
  };

  return (
    <>
      <Collapsible open={open} onOpenChange={handleToggle}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-start gap-2 text-sm font-medium text-primary hover:bg-primary/5 px-3 py-2 h-auto">
            <BookOpen className="h-4 w-4" />
            Anleitung: Daten aus LehrerOffice kopieren
            {open ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-4 space-y-5 pt-2">
          {/* Phase A */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">A — Alle Spalten einblenden</p>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <StepNumber n={1} />
                <span>Im linken Menü <strong className="text-foreground">Klassen</strong> anklicken</span>
              </div>
              <div className="flex items-start gap-2">
                <StepNumber n={2} />
                <span>Registerkarte <strong className="text-foreground">Ansicht</strong> wählen</span>
              </div>
              <div className="flex items-start gap-2">
                <StepNumber n={3} />
                <span><strong className="text-foreground">Alles</strong> auswählen (damit alle Spalten sichtbar sind)</span>
              </div>
            </div>
            <div className="relative group w-fit">
              <img
                src={loAnsicht}
                alt="LehrerOffice: Ansicht > Alles auswählen"
                className="max-h-[200px] object-contain cursor-pointer rounded-lg border hover:shadow-md transition-shadow"
                onClick={() => setLightboxSrc(loAnsicht)}
              />
              <span className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                🔍 Klicken zum Vergrössern
              </span>
            </div>
          </div>

          {/* Phase B */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">B — Tabelle kopieren</p>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <StepNumber n={1} />
                <span>Registerkarte <strong className="text-foreground">Bearbeiten</strong> wählen</span>
              </div>
              <div className="flex items-start gap-2">
                <StepNumber n={2} />
                <span><strong className="text-foreground">Tabelle kopieren</strong> auswählen</span>
              </div>
              <div className="flex items-start gap-2">
                <StepNumber n={3} />
                <span>Hier im Textfeld mit <kbd className="px-1.5 py-0.5 rounded bg-muted text-foreground text-xs font-mono">Ctrl+V</kbd> einfügen</span>
              </div>
            </div>
            <div className="relative group w-fit">
              <img
                src={loKopieren}
                alt="LehrerOffice: Bearbeiten > Tabelle kopieren"
                className="max-h-[200px] object-contain cursor-pointer rounded-lg border hover:shadow-md transition-shadow"
                onClick={() => setLightboxSrc(loKopieren)}
              />
              <span className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                🔍 Klicken zum Vergrössern
              </span>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Lightbox */}
      <Dialog open={!!lightboxSrc} onOpenChange={() => setLightboxSrc(null)}>
        <DialogContent className="max-w-4xl p-2">
          {lightboxSrc && (
            <img src={lightboxSrc} alt="LehrerOffice Anleitung" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
