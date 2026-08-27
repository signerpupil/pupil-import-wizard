import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import img0 from '@/assets/mitarbeitende-tut-70.png.asset.json';
import img1 from '@/assets/mitarbeitende-tut-71.png.asset.json';
import img2 from '@/assets/mitarbeitende-tut-72.png.asset.json';
import img3 from '@/assets/mitarbeitende-tut-73.png.asset.json';
import img4 from '@/assets/mitarbeitende-tut-74.png.asset.json';
import img5 from '@/assets/mitarbeitende-tut-75.png.asset.json';
import img6 from '@/assets/mitarbeitende-tut-76.png.asset.json';
import img7 from '@/assets/mitarbeitende-tut-77.png.asset.json';
import img8 from '@/assets/mitarbeitende-tut-78.png.asset.json';

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
    title: 'Ausgangslage: Startseite «Home»',
    description:
      'Nach dem Login in PUPIL landen Sie auf der Startseite «Home». Von hier aus starten Sie den Import der Mitarbeitenden über die linke Navigation.',
    image: img0.url,
    alt: 'PUPIL Startseite Home nach dem Login',
    hotspots: [{ left: 0.5, top: 55.5, width: 16, height: 5, label: 'Master Data' }],
  },
  {
    title: 'Master Data → Personen → Personen öffnen',
    description:
      'Klicken Sie in der linken Navigation auf «Master Data», danach auf «Personen (SuS/GV/LP/SV/MA/SB)» und schliesslich auf den Eintrag «Personen».',
    image: img1.url,
    alt: 'Navigation Master Data, Personen-Bereich geöffnet',
    hotspots: [
      { left: 0.5, top: 55.5, width: 16, height: 5, label: '1' },
      { left: 0.5, top: 62.8, width: 16, height: 4.8, label: '2' },
      { left: 0.5, top: 79.4, width: 16, height: 4.6, label: '3' },
    ],
  },
  {
    title: 'Import starten mit «+ Importieren»',
    description:
      'In der Personenliste klicken Sie oben auf den Button «+ Importieren», um den Import-Dialog zu öffnen.',
    image: img2.url,
    alt: 'Personenliste mit Button Importieren',
    hotspots: [{ left: 38.5, top: 13.3, width: 8.5, height: 4.2, label: '+ Importieren' }],
  },
  {
    title: 'Importart «Mitarbeitende importieren» wählen',
    description:
      'Öffnen Sie die Auswahl «Bitte wählen Sie eine Importart» und wählen Sie «Mitarbeitende importieren (LehrerOffice Lehrpersonen)».',
    image: img3.url,
    alt: 'Auswahl der Importart im Dialog Personen importieren',
    hotspots: [{ left: 39, top: 30.5, width: 39.5, height: 4, label: 'LehrerOffice Lehrpersonen' }],
  },
  {
    title: 'Bereinigte Datei hochladen und importieren',
    description:
      'Laden Sie über «Auswählen…» die aufbereitete Datei «LehrerOffice_Lehrpersonen <Datum>_Bereinigt.xlsx» hoch und bestätigen Sie anschliessend mit «Importieren».',
    image: img4.url,
    alt: 'Dateiupload der bereinigten Mitarbeiterdatei',
    hotspots: [
      { left: 38.8, top: 18.8, width: 40, height: 4.2, label: '1 Datei' },
      { left: 77.5, top: 37, width: 7.5, height: 4.3, label: '2 Importieren' },
    ],
  },
  {
    title: 'Synchronisation nach PUPIL auslösen',
    description:
      'Nach dem erfolgreichen Import öffnen Sie «Master Data → Schulen/Klassen/Gruppen → Synchronisation (Neu)» und starten die Übernahme mit dem blauen Button «Sync MD zu PUPIL».',
    image: img5.url,
    alt: 'Synchronisation Neu mit Button Sync MD zu PUPIL',
    hotspots: [
      { left: 0.5, top: 63.8, width: 16, height: 4.6, label: '1' },
      { left: 79, top: 26.4, width: 18.8, height: 4.5, label: '2 Sync MD zu PUPIL' },
    ],
  {
    title: 'Schulverwaltung in der Personenübersicht suchen',
    description:
      'Gehen Sie zurück zur Personenübersicht und geben Sie im Suchfeld den Namen der Schulverwaltung ein. Klicken Sie danach beim gefundenen Eintrag auf das Bearbeiten-Symbol (Stift).',
    image: img6.url,
    alt: 'Personenübersicht mit Suchfeld und Bearbeiten-Symbol',
    hotspots: [
      { left: 79.5, top: 21, width: 17.5, height: 3.6, label: '1 Suche' },
      { left: 90.2, top: 40.2, width: 2.2, height: 3.8, label: '2 Bearbeiten' },
    ],
  },
  {
    title: 'Rollen «Schulverwaltung» und «Admin Schulverwaltung» vergeben',
    description:
      'Wechseln Sie im Bearbeitungsfenster in die Registerkarte «Rollen». Aktivieren Sie zusätzlich die Rollen «Schulverwaltung» und «Admin Schulverwaltung». Die bestehende Rolle «MA» bleibt aktiviert.',
    image: img7.url,
    alt: 'Registerkarte Rollen mit aktivierten Rollen MA, Schulverwaltung und Admin Schulverwaltung',
    hotspots: [
      { left: 73.2, top: 11.6, width: 4.6, height: 3.2, label: '1 Rollen' },
      { left: 17, top: 48.4, width: 2.6, height: 2.8, label: '2 Schulverwaltung' },
      { left: 17, top: 81.2, width: 2.6, height: 2.8, label: '3 Admin Schulverwaltung' },
    ],
  },
  {
    title: 'Änderungen speichern',
    description: 'Klicken Sie abschliessend auf «Speichern und schliessen», um die Rollenzuweisung zu übernehmen.',
    image: img8.url,
    alt: 'Button Speichern und schliessen im Rollen-Dialog',
    hotspots: [{ left: 72, top: 91.5, width: 11.5, height: 3.8, label: 'Speichern und schliessen' }],
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MitarbeitendeTutorialDialog({ open, onOpenChange }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[92vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b space-y-1 text-left">
          <DialogTitle className="text-base flex items-center gap-3 pr-8">
            <Badge variant="secondary" className="shrink-0">
              Schritt {index + 1} / {steps.length}
            </Badge>
            <span>{step.title}</span>
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">{step.description}</DialogDescription>
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
