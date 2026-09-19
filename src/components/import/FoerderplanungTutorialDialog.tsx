import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Check, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

const imgBase = `${import.meta.env.BASE_URL}tutorials/foerderplanung/`;

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
  checklist?: boolean;
  imports?: { name: string; file: string; content: string }[];
}

const checklistItems = [
  'Du bist in PUPIL mit der Rolle «N&Z-Administration» angemeldet',
  'Alle Schülerinnen und Schüler (SuS) aus den Importdateien sind bereits in PUPIL erfasst',
  'Alle Lehrpersonen, die als Ersteller oder Verantwortliche vorkommen, sind in PUPIL erfasst',
  'Das betreffende Schuljahr / Semester ist in PUPIL angelegt',
  'Du hast die benötigten CSV-Dateien aus LehrerOffice exportiert und gespeichert (Koneksa_2_Diagnostik.csv, Koneksa_3_Foerderplanung.csv, Koneksa_4_Lernberichte.csv)',
];

const importTypes = [
  {
    name: 'Import 1: Diagnostik',
    file: 'Koneksa_2_Diagnostik.csv',
    content: 'Diagnostik-Einträge (Ausgangslage, Beschreibung, Erklärungsansätze) nach Diagnostik-Bereich.',
  },
  {
    name: 'Import 2: Förderplanung',
    file: 'Koneksa_3_Foerderplanung.csv',
    content: 'Förderziele inkl. Massnahmen (bis zu 4 pro Ziel) und Förderverlauf. Förderziele erhalten den Typ «Förderplan».',
  },
  {
    name: 'Import 3: Lernberichte',
    file: 'Koneksa_4_Lernberichte.csv',
    content: 'Lernberichte mit Gesprächsdatum, Semester, Zeugnisrelevanz und Förderzielbeurteilungen.',
  },
];

const steps: TutorialStep[] = [
  {
    title: 'Checkliste – bevor du startest',
    description:
      'Hake alle Punkte ab, bevor du mit dem ersten Import beginnst. Ein gestarteter Import kann nicht automatisch rückgängig gemacht werden.',
    checklist: true,
    warning:
      'Bitte zuerst lesen: Ein gestarteter Import kann nicht rückgängig gemacht werden. Führe jeden Import nur einmal durch, sonst werden Daten doppelt erfasst.',
    info:
      'Korrekturen nimmst du am besten direkt in LehrerOffice vor und exportierst danach neu. Falls du die CSV ausnahmsweise in Excel bearbeitest: Trennzeichen Semikolon, Zeichencodierung UTF-8.',
  },
  {
    title: 'Übersicht: Die drei Förderplaner-Importe',
    description:
      'Es gibt drei verschiedene Importtypen. Sie sind unabhängig voneinander und können in beliebiger Reihenfolge durchgeführt werden – du musst nicht alle machen.',
    imports: importTypes,
    info:
      'Wichtig: Die Startmaske sieht bei allen drei Importen gleich aus – der Ablauf (Datei auswählen, hochladen, prüfen, importieren) ist identisch. Einzig der gewählte Importtyp und die Datei unterscheiden sich.',
  },
  {
    title: 'Schritt 1: Importtyp wählen und starten',
    description:
      'Navigiere in PUPIL zu «Master Data → Personen (SuS/GV/LP/SV/MA/SB) → Datenimporte». Klicke im Bereich «Förderplanung» beim gewünschten Import auf «Starten».',
    image: `${imgBase}uebersicht.jpg`,
    alt: 'Datenimporte-Übersicht mit den drei Förderplaner-Importen',
    hotspots: [
      { left: 0.5, top: 69.2, width: 11.3, height: 2.5, label: 'Datenimporte' },
      { left: 43.5, top: 42.8, width: 5.6, height: 2.7, label: 'Förderplanung' },
      { left: 43.5, top: 47.1, width: 5.6, height: 2.8, label: 'Diagnostik' },
      { left: 43.5, top: 54.7, width: 5.6, height: 2.9, label: 'Lernberichte' },
    ],
    info:
      'Diese Startmaske ist bei allen drei Importtypen identisch. Wähle je nach Datei: «Diagnostik» (Koneksa_2), «Förderplanung» (Koneksa_3) oder «Lernberichte» (Koneksa_4).',
  },
  {
    title: 'Schritt 2: Datei auswählen und hochladen',
    description:
      'Klicke auf «Auswählen…» und wähle die passende CSV-Datei aus LehrerOffice. Die geladene Datei erscheint anschliessend in der Liste. Klicke dann auf «Weiter zur Datenüberprüfung».',
    image: `${imgBase}datei-auswaehlen.jpg`,
    alt: 'Import-Datei bereitstellen mit geladener Datei und Button Auswählen',
    hotspots: [
      { left: 41.6, top: 59.5, width: 7, height: 4, label: '1 Auswählen…' },
      { left: 87.5, top: 68.3, width: 11.1, height: 2.8, label: '2 Weiter zur Datenüberprüfung' },
    ],
    success: 'Erfolgskontrolle: Die Datei erscheint mit Dateinamen und grünem Häkchen im Upload-Bereich.',
  },
  {
    title: 'Schritt 3: Validierung – Fehler beheben',
    description:
      'PUPIL prüft die Datei automatisch, bevor Daten geschrieben werden. Findet die Prüfung Fehler, erscheint eine Fehlertabelle mit Zeilennummer, Spalte, Wert und Erklärung.',
    image: `${imgBase}validierung-fehler.jpg`,
    alt: 'Datenüberprüfung mit Fehlertabelle und Button Fehler exportieren',
    hotspots: [
      { left: 14.1, top: 27.6, width: 84.5, height: 13.4, label: 'Fehlertabelle' },
      { left: 91.4, top: 22.5, width: 7, height: 2.8, label: 'Fehler exportieren' },
      { left: 83.9, top: 48.5, width: 5.6, height: 2.8, label: 'Zurück' },
    ],
    warning:
      'Typische Fehler: «Schüler/in nicht gefunden» (SuS zuerst in PUPIL erfassen), «Lehrperson nicht gefunden», «Ungültiges Datum» (Format TT.MM.JJJJ), «Bereich nicht erkannt» (Titel in LehrerOffice korrigieren). Korrigiere die Daten in LehrerOffice, exportiere neu und lade die Datei erneut hoch. Die Fehlerliste kannst du als Excel-Datei herunterladen.',
    info:
      'Die Validierung schreibt noch keine Daten – du kannst sie gefahrlos so oft wiederholen, bis die Datei fehlerfrei ist.',
  },
  {
    title: 'Schritt 4: Import starten',
    description:
      'Sobald keine Fehler mehr gefunden werden, erscheint die Meldung «Keine Fehler gefunden. Der Import kann gestartet werden.». Klicke nun auf «Import starten».',
    image: `${imgBase}validierung-ok.jpg`,
    alt: 'Datenüberprüfung ohne Fehler mit aktivem Button Import starten',
    hotspots: [
      { left: 91.5, top: 41.4, width: 6.9, height: 2.8, label: 'Import starten' },
    ],
    info: 'Der Import lässt sich erst starten, wenn die Datei keine Fehler mehr enthält. Es kann immer nur ein Import gleichzeitig laufen.',
  },
  {
    title: 'Schritt 5: Erfolg prüfen',
    description:
      'Nach Abschluss erscheint die Erfolgsmeldung «Import erfolgreich abgeschlossen» mit einer Zusammenfassung der importierten Datensätze.',
    image: `${imgBase}erfolg.jpg`,
    alt: 'Erfolgsmeldung Import erfolgreich abgeschlossen',
    success:
      'Die Daten wurden importiert und den entsprechenden Schülerinnen und Schülern zugeordnet. Fehlende Schülerdossiers wurden automatisch angelegt.',
    info:
      'Kontrolle: Öffne ein Schülerdossier unter «Schulalltag / LPs → Förderplaner» und prüfe stichprobenhaft die Einträge (Diagnostik-Tab, Förderziele mit Typ «Förderplan» bzw. Berichte). Vergleiche die Anzahl mit LehrerOffice.',
    warning:
      'Denk daran: Führe jeden Import nur einmal durch – bei einer Wiederholung werden Daten doppelt erfasst.',
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function FoerderplanungTutorialDialog({ open, onOpenChange }: Props) {
  const [index, setIndex] = useState(0);
  const [checked, setChecked] = useState<boolean[]>(checklistItems.map(() => false));

  useEffect(() => {
    if (open) {
      setIndex(0);
      setChecked(checklistItems.map(() => false));
    }
  }, [open]);

  const step = steps[index];
  const isLast = index === steps.length - 1;
  const isChecklist = !!step.checklist;
  const checkedCount = checked.filter(Boolean).length;
  const checklistDone = checkedCount === checklistItems.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b space-y-1 text-left">
          <div className="flex flex-row items-center justify-between">
            <DialogTitle className="text-base">Klicktutorial – Förderplaner importieren (Diagnostik, Förderplanung, Lernberichte)</DialogTitle>
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
                  {checklistItems.map((item, i) => (
                    <li key={i}>
                      <label
                        className={cn(
                          'flex items-start gap-3 rounded-md border p-3 cursor-pointer transition-colors',
                          checked[i] ? 'border-pupil-success/40 bg-pupil-success/5' : 'hover:bg-muted/50'
                        )}
                      >
                        <Checkbox
                          checked={checked[i]}
                          onCheckedChange={(v) =>
                            setChecked((prev) => prev.map((c, j) => (j === i ? v === true : c)))
                          }
                          className="mt-0.5"
                        />
                        <span className={cn('text-sm leading-relaxed', checked[i] && 'text-muted-foreground line-through')}>
                          {item}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                {!checklistDone && (
                  <p className="text-xs text-muted-foreground">
                    Hake alle Punkte ab, um mit dem Tutorial zu starten.
                  </p>
                )}
              </div>
            )}

            {step.imports && (
              <div className="mx-auto w-full max-w-3xl rounded-lg border bg-background p-4 space-y-3">
                {step.imports.map((imp, i) => (
                  <div key={imp.name} className="flex gap-3">
                    <div className="w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold">
                      {i + 1}
                    </div>
                    <div className="text-sm">
                      <p className="font-semibold text-foreground">{imp.name}</p>
                      <p className="font-mono text-xs bg-muted rounded px-2 py-0.5 inline-block mt-1">{imp.file}</p>
                      <p className="text-muted-foreground mt-1">{imp.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

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
          <Button variant="outline" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0}>
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
            <Button
              onClick={() => setIndex((i) => Math.min(steps.length - 1, i + 1))}
              disabled={isChecklist && !checklistDone}
            >
              {isChecklist ? 'Checkliste bestätigen & starten' : 'Weiter'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
