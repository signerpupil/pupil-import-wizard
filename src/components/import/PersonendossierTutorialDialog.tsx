import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Check, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';
import img0 from '@/assets/dossier-tut-90.png.asset.json';
import img1 from '@/assets/dossier-tut-91.png.asset.json';
import img2 from '@/assets/dossier-tut-92.png.asset.json';
import img3 from '@/assets/dossier-tut-93.png.asset.json';
import img4 from '@/assets/dossier-tut-94.png.asset.json';
import img5 from '@/assets/dossier-tut-95.png.asset.json';
import img6 from '@/assets/dossier-tut-96.png.asset.json';

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
  image?: string;
  alt?: string;
  hotspots?: Hotspot[];
  success?: string;
  warning?: string;
  info?: string;
  body?: { heading: string; text: string }[];
}

const steps: TutorialStep[] = [
  {
    title: 'Überblick: Personen-Dossier importieren',
    description:
      'Damit laden Sie Dateien wie Arztbescheinigungen oder Zeugnisse für einzelne Schülerinnen und Schüler hoch.',
    image: img0.url,
    alt: 'Übersicht Datenimporte mit Bereich Personen-Dossier (Dateien)',
    hotspots: [
      { left: 1.9, top: 84.8, width: 9.5, height: 2.6, label: 'Datenimporte' },
      { left: 42.4, top: 27, width: 8.8, height: 3.4, label: 'Personen-Dossier (Dateien)' },
    ],
    info:
      'Das Vorgehen für den Personen-Dossier-Import und den Zeugnis-Import ist identisch. Der einzige Unterschied: Sie wählen je nach Dokumententyp einen anderen Zielordner.',
  },
  {
    title: 'Schritt 1–2: Ordnerstruktur einrichten',
    description:
      'Navigieren Sie im Menü zu «Schulverwaltung → Personendossier Einstellungen» und legen Sie dort eine Ordnerstruktur für Ihre Dokumente an (z. B. einen Ordner «Zeugnisse»).',
    image: img1.url,
    alt: 'Personendossier Einstellungen mit Ordnerstruktur und Button Neuer Hauptordner',
    hotspots: [
      { left: 1.5, top: 54.6, width: 11.5, height: 2.6, label: '1 Personendossier Einstellungen' },
      { left: 14.8, top: 18.7, width: 8.8, height: 3.2, label: '2 Neuer Hauptordner' },
    ],
  },
  {
    title: 'Schritt 3–5: Zielordner für den Dossier-Import festlegen',
    description:
      'Wechseln Sie auf den Reiter «Modul Ordner», suchen Sie in der Tabelle den Ordner, in den Ihre Dokumente importiert werden sollen (z. B. «Zeugnisse»), und wählen Sie in der Spalte «Standard für Module» im Dropdown den Eintrag «Dossier-Import».',
    image: img2.url,
    alt: 'Reiter Modul Ordner mit Dropdown Standard für Module und Eintrag Dossier-Import',
    hotspots: [
      { left: 20.6, top: 13.5, width: 6.2, height: 3.4, label: '3 Modul Ordner' },
      { left: 16.5, top: 28.4, width: 19.6, height: 3.4, label: '4 Zielordner' },
      { left: 36.6, top: 42.6, width: 17.6, height: 3.7, label: '5 Dossier-Import' },
    ],
    success:
      'Der Eintrag «Dossier-Import» erscheint jetzt in der Spalte neben Ihrem Zielordner. Dieser Ordner wird beim Import automatisch als Ziel verwendet.',
    warning:
      'Stolperfalle: Führen Sie diesen Schritt für jeden Dokumententyp erneut durch (z. B. erst Zeugnisse, dann Arztbescheinigungen). Pro Dokumententyp muss der Zielordner angepasst werden.',
  },
  {
    title: 'Schritt 6: Dateien korrekt benennen',
    description:
      'Bevor Sie Ihre Dokumente hochladen, müssen diese korrekt benannt sein – sonst kann das System sie nicht den richtigen Personen zuordnen. Der Dateiname muss dem Muster «Schlüssel_Titel.pdf» entsprechen.',
    body: [
      {
        heading: 'Schlüssel',
        text: 'Die persönliche ID der Person in PUPIL. Sie finden diese Nummer in der Personenliste unter «Master Data → Personen» in der Spalte «Schlüssel» (z. B. PUP17021992).',
      },
      { heading: 'Unterstrich', text: 'Pflicht als Trennzeichen zwischen Schlüssel und Titel.' },
      {
        heading: 'Titel',
        text: 'Eine frei wählbare Bezeichnung für das Dokument (z. B. Zeugnis). Dieser Teil wird vom System nicht ausgewertet, hilft Ihnen aber bei der eigenen Übersicht.',
      },
      { heading: 'Beispiel', text: 'PUP17021992_Zeugnis.pdf' },
    ],
    info: 'Tipp: Der Dateiname kann direkt in LehrerOffice definiert und beim Export entsprechend vergeben werden.',
    warning:
      'Häufiger Fehler: Wenn der Dateiname keinen gültigen Schlüssel enthält oder der Unterstrich fehlt, kann das Dokument nicht zugeordnet werden. Das System meldet in diesem Fall einen Fehler (siehe Schritt 11).',
  },
  {
    title: 'Schritt 7–9: Datenimport starten und Dateien auswählen',
    description:
      'Navigieren Sie zu «Master Data → Personen (SuS/GV/LP/SV/MA/SB) → Datenimporte» und klicken Sie bei «Personen-Dossier (Dateien)» auf «Starten». Klicken Sie danach auf «Auswählen…» oder ziehen Sie Ihre Dateien direkt in den gestrichelten Bereich «Dateien hierher ziehen…».',
    image: img3.url,
    alt: 'Persondossiers importieren – Import-Datei bereitstellen mit Button Auswählen',
    hotspots: [
      { left: 2.5, top: 68.5, width: 14.5, height: 3.2, label: '7 Personen → Datenimporte' },
      { left: 54.7, top: 69.8, width: 10, height: 4.4, label: '9 Auswählen…' },
    ],
    info:
      'Sie können pro Import maximal 500 Dokumente gleichzeitig hochladen, jede Datei darf höchstens 10 MB gross sein. Bei mehr Dateien führen Sie den Import in mehreren Durchgängen durch.',
  },
  {
    title: 'Schritt 10: Weiter zur Datenüberprüfung',
    description:
      'Die ausgewählten Dateien erscheinen mit ihrem Dateinamen in der Liste unterhalb des Upload-Bereichs. Klicken Sie anschliessend auf «Weiter zur Datenüberprüfung».',
    image: img4.url,
    alt: 'Hochgeladene Datei in der Liste und Button Weiter zur Datenüberprüfung',
    hotspots: [
      { left: 20.8, top: 36.8, width: 42.2, height: 7.2, label: '1 Datei geladen' },
      { left: 82.5, top: 79.8, width: 15.8, height: 4.6, label: '10 Weiter zur Datenüberprüfung' },
    ],
    success: 'Erfolgskontrolle: Die ausgewählten Dateien erscheinen mit ihrem Dateinamen in der Liste.',
  },
  {
    title: 'Schritt 11: Daten überprüfen und Fehler beheben',
    description:
      'PUPIL prüft automatisch, ob alle Dateien korrekt benannt sind und den richtigen Personen zugeordnet werden können. Kann eine Datei nicht verarbeitet werden, erscheint sie in einer Fehlertabelle mit Erklärung (z. B. «Dieser Schlüssel existiert nicht im PUPIL»).',
    image: img5.url,
    alt: 'Dateninhalte überprüfen mit Fehlermeldung und Button Fehlermeldungen exportieren',
    hotspots: [
      { left: 42.7, top: 41.6, width: 18.5, height: 3, label: '1 Fehlermeldung' },
      { left: 83.3, top: 28, width: 15, height: 4.2, label: '2 Fehlermeldungen exportieren' },
      { left: 84.4, top: 53.8, width: 6.8, height: 6.8, label: '3 Zurück' },
    ],
    warning:
      'Was tun bei Fehlern? Klicken Sie auf «Zurück», benennen Sie die betroffene Datei gemäss Fehlermeldung um (prüfen Sie insbesondere den Schlüssel) und laden Sie sie erneut hoch. Über «Fehlermeldungen exportieren» können Sie die Fehlerliste als Datei herunterladen.',
  },
  {
    title: 'Schritt 12: Import starten',
    description:
      'Wenn keine Fehler gefunden wurden, erscheint die Meldung «In den importierten Dateien wurden keine Fehler gefunden.». Klicken Sie nun auf «Import starten».',
    image: img6.url,
    alt: 'Meldung keine Fehler gefunden und Button Import starten',
    hotspots: [
      { left: 19.4, top: 40.9, width: 78.5, height: 4.2, label: '1 Keine Fehler' },
      { left: 90.6, top: 53.2, width: 8, height: 8, label: '12 Import starten' },
    ],
    success: 'Der Import wird ausgeführt und die Dokumente werden im festgelegten Zielordner abgelegt.',
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PersonendossierTutorialDialog({ open, onOpenChange }: Props) {
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
            <DialogTitle className="text-base">Klicktutorial – Personen-Dossier importieren</DialogTitle>
            <Badge variant="secondary" className="shrink-0 mr-8">
              Schritt {index + 1} / {steps.length}
            </Badge>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            <span className="font-medium text-foreground">{step.title}</span> – {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto bg-muted/40 p-4">
          <div className="mx-auto w-full max-w-6xl space-y-3">
            {step.image && (
              <div className="relative">
                <img
                  src={step.image}
                  alt={step.alt}
                  className="w-full h-auto rounded-lg border shadow-sm bg-background"
                />
                {step.hotspots?.map((h, i) => (
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
            )}

            {step.body && (
              <div className="rounded-lg border bg-background p-4 space-y-3">
                <p className="font-mono text-sm bg-muted rounded px-3 py-2 inline-block">Schlüssel_Titel.pdf</p>
                <dl className="space-y-2 text-sm">
                  {step.body.map(b => (
                    <div key={b.heading}>
                      <dt className="font-semibold text-foreground">{b.heading}</dt>
                      <dd className="text-muted-foreground">{b.text}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

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
