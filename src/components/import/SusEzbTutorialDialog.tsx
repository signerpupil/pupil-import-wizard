import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import img0 from '@/assets/sus-tut-80.png.asset.json';
import img1 from '@/assets/sus-tut-81.png.asset.json';
import img2 from '@/assets/sus-tut-82.png.asset.json';
import img3 from '@/assets/sus-tut-83.png.asset.json';
import img4 from '@/assets/sus-tut-84.png.asset.json';

interface Hotspot {
  /** Werte in Prozent des Bildes */
  left: number;
  top: number;
  width: number;
  height: number;
  label?: string;
}

interface TutorialStep {
  title: string;
  description: string;
  image: string;
  alt: string;
  hotspots: Hotspot[];
}

const steps: TutorialStep[] = [
  {
    title: 'Datenimporte öffnen und Import starten',
    description:
      'Nachdem Sie die Daten der Mitarbeitenden importiert und synchronisiert haben, fahren Sie mit den Stammdaten der SuS und EZB fort: Gehen Sie auf «Master Data → Personen → Datenimporte» und klicken Sie im Bereich «Personen» bei «Schüler:innen (LehrerOffice-Format)» auf «Starten».',
    image: img0.url,
    alt: 'Übersicht Datenimporte mit Bereich Personen und Button Starten',
    hotspots: [
      { left: 0.5, top: 85.5, width: 11, height: 3.2, label: '1 Datenimporte' },
      { left: 42.4, top: 19.6, width: 8.7, height: 3.4, label: '2 Starten' },
    ],
  },
  {
    title: 'Bereinigte Datei hochladen',
    description:
      'Klicken Sie auf «Auswählen…» und laden Sie die bereinigte Datei «Stammdaten SuS und EZB_<Datum>_bereinigt.xlsx» hoch. Klicken Sie anschliessend auf «Weiter zur Datenüberprüfung».',
    image: img1.url,
    alt: 'Import-Datei bereitstellen mit Auswählen-Button und Weiter zur Datenüberprüfung',
    hotspots: [
      { left: 41.7, top: 53.5, width: 6.2, height: 3.6, label: '1 Auswählen' },
      { left: 88.5, top: 73.5, width: 10.2, height: 3.6, label: '2 Weiter zur Datenüberprüfung' },
    ],
  },
  {
    title: 'Fehlermeldungen bereinigen',
    description:
      'Die Daten werden geprüft. Erscheint eine Liste mit Fehlern, öffnen Sie die Excel-Datei und beheben Sie die angezeigten Fehler manuell. Klicken Sie danach auf «Zurück» und laden Sie die korrigierte Excel-Datei erneut hoch.',
    image: img2.url,
    alt: 'Dateninhalte überprüfen mit Fehlermeldung und Button Zurück',
    hotspots: [
      { left: 12.4, top: 27.5, width: 74.8, height: 4, label: '1 Fehler beheben' },
      { left: 83.9, top: 37, width: 7.3, height: 3.6, label: '2 Zurück' },
    ],
  },
  {
    title: 'Fehlerfreie Datei importieren',
    description:
      'Erscheint die Meldung «Bei der importierten Datei wurden keine Fehler festgestellt.», klicken Sie auf «Import starten».',
    image: img3.url,
    alt: 'Meldung keine Fehler festgestellt mit Button Import starten',
    hotspots: [
      { left: 12.4, top: 27.9, width: 74.8, height: 3.6, label: '1 Keine Fehler' },
      { left: 91.4, top: 37, width: 7.5, height: 3.6, label: '2 Import starten' },
    ],
  },
  {
    title: 'Import erfolgreich abgeschlossen',
    description:
      'Sie erhalten die Meldung, dass der Import erfolgreich war. Die Personen können nun im Modul «Master Data» angezeigt werden.',
    image: img4.url,
    alt: 'Bestätigung Import war erfolgreich',
    hotspots: [{ left: 40, top: 39.5, width: 20, height: 5.5, label: 'Import war erfolgreich' }],
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SusEzbTutorialDialog({ open, onOpenChange }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b space-y-1 text-left">
          <div className="flex flex-row items-center justify-between">
            <DialogTitle className="text-base">Klicktutorial – Stammdaten SuS und EZB</DialogTitle>
            <Badge variant="secondary" className="shrink-0 mr-8">
              Schritt {index + 1} / {steps.length}
            </Badge>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            <span className="font-medium text-foreground">{step.title}</span> – {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto bg-muted/40 p-4">
          <div className="relative mx-auto w-full max-w-6xl">
            <img
              src={step.image}
              alt={step.alt}
              className="w-full h-auto rounded-lg border shadow-sm bg-background"
            />
            {step.hotspots.map((h, i) => (
              <div
                key={i}
                className="absolute rounded-md ring-2 ring-primary bg-primary/10 animate-pulse pointer-events-none"
                style={{
                  left: `${h.left}%`,
                  top: `${h.top}%`,
                  width: `${h.width}%`,
                  height: `${h.height}%`,
                }}
              >
                {h.label && (
                  <span className="absolute -top-3 left-1 whitespace-nowrap rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                    {h.label}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <p className="px-4 py-2 text-xs text-muted-foreground border-t">
          Nutzen Sie die Navigation unten, um Schritt für Schritt durch das Tutorial zu gehen.
        </p>
        <div className="flex items-center justify-between gap-4 border-t px-6 py-3">
          <Button variant="outline" onClick={() => setIndex(i => Math.max(0, i - 1))} disabled={index === 0}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>

          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                aria-label={`Zu Schritt ${i + 1}`}
                onClick={() => setIndex(i)}
                className={cn(
                  'h-2.5 rounded-full transition-all',
                  i === index ? 'w-6 bg-primary' : 'w-2.5 bg-muted-foreground/30 hover:bg-muted-foreground/60'
                )}
              />
            ))}
          </div>

          {isLast ? (
            <Button onClick={() => onOpenChange(false)}>
              <Check className="mr-2 h-4 w-4" />
              Fertig
            </Button>
          ) : (
            <Button onClick={() => setIndex(i => Math.min(steps.length - 1, i + 1))}>
              Weiter
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
