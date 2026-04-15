import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, BookOpen, Info } from 'lucide-react';
import exportMenu from '@/assets/lo-stammdaten-export-menu.png';
import exportFormat from '@/assets/lo-stammdaten-export-format.png';
import exportSave from '@/assets/lo-stammdaten-export-save.png';

const STORAGE_KEY = 'stammdaten-guide-open';

function StepNumber({ n }: { n: number }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
      {n}
    </span>
  );
}

export function StammdatenInstructionGuide() {
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
            Anleitung: Daten aus LehrerOffice exportieren
            {open ? <ChevronDown className="h-4 w-4 ml-auto" /> : <ChevronRight className="h-4 w-4 ml-auto" />}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="px-3 pb-4 space-y-5 pt-2">
          {/* Phase A – Ansicht öffnen */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">A — Schülerdaten-Ansicht öffnen</p>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <StepNumber n={1} />
                <span>In LehrerOffice unter <strong className="text-foreground">Schüler/innen</strong> die Ansicht <strong className="text-foreground">Schülerdaten</strong> öffnen.</span>
              </div>
              <div className="flex items-start gap-2">
                <StepNumber n={2} />
                <span>In der Ansicht das korrekte <strong className="text-foreground">Semester</strong> wählen.</span>
              </div>
            </div>
          </div>

          {/* Phase B – Exportieren */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">B — Daten exportieren</p>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <StepNumber n={3} />
                <span>Im oberen Menü <strong className="text-foreground">Schüler → Exportieren…</strong> wählen.</span>
              </div>
            </div>
            <div className="relative group w-fit">
              <img
                src={exportMenu}
                alt="LehrerOffice: Schüler → Exportieren"
                className="max-h-[200px] object-contain cursor-pointer rounded-lg border hover:shadow-md transition-shadow"
                onClick={() => setLightboxSrc(exportMenu)}
              />
              <span className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                🔍 Klicken zum Vergrössern
              </span>
            </div>
          </div>

          {/* Phase C – Format wählen */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">C — Exportformat wählen</p>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <StepNumber n={4} />
                <span>Die Option <strong className="text-foreground">Schülerdaten (als Excelliste)</strong> wählen und den weiteren Hinweisen folgen.</span>
              </div>
            </div>
            <div className="relative group w-fit">
              <img
                src={exportFormat}
                alt="LehrerOffice: Schülerdaten als Excelliste wählen"
                className="max-h-[200px] object-contain cursor-pointer rounded-lg border hover:shadow-md transition-shadow"
                onClick={() => setLightboxSrc(exportFormat)}
              />
              <span className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                🔍 Klicken zum Vergrössern
              </span>
            </div>
          </div>

          {/* Phase D – Speichern */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">D — Datei speichern & hochladen</p>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-start gap-2">
                <StepNumber n={5} />
                <span>Die Datei lokal speichern — diese wird anschliessend hier hochgeladen.</span>
              </div>
            </div>
            <div className="relative group w-fit">
              <img
                src={exportSave}
                alt="LehrerOffice: Datei lokal speichern"
                className="max-h-[200px] object-contain cursor-pointer rounded-lg border hover:shadow-md transition-shadow"
                onClick={() => setLightboxSrc(exportSave)}
              />
              <span className="absolute bottom-2 right-2 bg-background/80 backdrop-blur-sm text-xs px-2 py-1 rounded border opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                🔍 Klicken zum Vergrössern
              </span>
            </div>
          </div>

          {/* Hinweis */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <Info className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>Der Export kann für beliebig viele Semester wiederholt werden.</span>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Lightbox */}
      <Dialog open={!!lightboxSrc} onOpenChange={() => setLightboxSrc(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-2">
          {lightboxSrc && (
            <img src={lightboxSrc} alt="LehrerOffice Anleitung" className="w-full h-auto rounded" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
