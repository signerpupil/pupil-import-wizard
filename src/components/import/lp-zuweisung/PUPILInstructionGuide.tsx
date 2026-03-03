import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, BookOpen } from 'lucide-react';
import pupilExport from '@/assets/pupil-anleitung-personen-export.png';

const STORAGE_KEY = 'pupil-guide-open';

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
      {n}
    </span>
  );
}

export function PUPILInstructionGuide() {
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
            Anleitung: Personen-Export aus PUPIL
            {open ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-4 space-y-5 pt-2">
          {/* Phase A */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">A — Navigieren</p>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <StepNumber n={1} />
                <span>Im linken Menü <strong className="text-foreground">Master Data</strong> öffnen</span>
              </div>
              <div className="flex items-start gap-2">
                <StepNumber n={2} />
                <span><strong className="text-foreground">Personen (SuS/GV/LP/SV/MA/SB)</strong> anklicken</span>
              </div>
              <div className="flex items-start gap-2">
                <StepNumber n={3} />
                <span><strong className="text-foreground">Personen</strong> auswählen</span>
              </div>
            </div>
          </div>

          {/* Phase B */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">B — Filtern und exportieren</p>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <StepNumber n={4} />
                <span>Alle LP-Rollen im Rollen-Filter wählen: <strong className="text-foreground">Gesamtschulleitung, Schulleitung, Lehrperson, Assistenzperson, Hausaufgabenhilfe, Heilpädagogisches Personal, Therapie</strong></span>
              </div>
              <div className="flex items-start gap-2">
                <StepNumber n={5} />
                <span>Prüfen ob die Spalten <strong className="text-foreground">Nachname</strong>, <strong className="text-foreground">Vorname</strong> und <strong className="text-foreground">Schlüssel</strong> eingeblendet sind — falls nicht, via <strong className="text-foreground">Spaltenkonfiguration</strong> einblenden</span>
              </div>
              <div className="flex items-start gap-2">
                <StepNumber n={6} />
                <span><strong className="text-foreground">Aktion für gefilterte Personen</strong> → <strong className="text-foreground">Export (aktuelle Spalten)</strong></span>
              </div>
            </div>
            <div className="relative group w-fit">
              <img
                src={pupilExport}
                alt="PUPIL: Personen-Export mit LP-Rollen"
                className="max-h-[200px] object-contain cursor-pointer rounded-lg border hover:shadow-md transition-shadow"
                onClick={() => setLightboxSrc(pupilExport)}
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
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
          {lightboxSrc && (
            <img src={lightboxSrc} alt="PUPIL Anleitung" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
