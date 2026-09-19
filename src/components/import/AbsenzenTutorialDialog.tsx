import { GuidedImportTutorialDialog, type GuidedTutorialStep } from './GuidedImportTutorialDialog';

const imgBase = `${import.meta.env.BASE_URL}tutorials/foerderplanung/`;

const checklistItems = [
  'Du bist in PUPIL mit der Rolle «N&Z-Administration» angemeldet',
  'Alle Schülerinnen und Schüler aus der Importdatei sind bereits in PUPIL erfasst',
  'Alle Lehrpersonen, die als Ersteller vorkommen, sind in PUPIL erfasst',
  'Alle vorkommenden Absenzgründe sind in PUPIL angelegt',
  'Das betreffende Schuljahr / Semester ist in PUPIL angelegt',
  'Du hast Koneksa_Journal.csv aus LehrerOffice exportiert und lokal gespeichert',
];

const finalWarning =
  'Denk daran: Führe den Absenz-Import nur einmal durch – bei einer Wiederholung werden Absenzen doppelt erfasst.';

const steps: GuidedTutorialStep[] = [
  {
    title: 'Checkliste – bevor du startest',
    description:
      'Hake alle Punkte ab, bevor du mit dem Absenz-Import beginnst. Ein gestarteter Import kann nicht automatisch rückgängig gemacht werden.',
    checklist: true,
    warning: finalWarning,
    info:
      'Korrekturen nimmst du am besten direkt in LehrerOffice vor und exportierst danach neu. Falls du die CSV ausnahmsweise in Excel bearbeitest: Trennzeichen Semikolon, Zeichencodierung UTF-8.',
  },
  {
    title: 'Übersicht: Der Absenz-Import',
    description:
      'Mit diesem Import überträgst du ausschliesslich Einträge vom Typ «Absenz» aus LehrerOffice nach PUPIL.',
    details: [
      {
        title: 'Dieselbe Exportdatei',
        value: 'Koneksa_Journal.csv',
        description: 'PUPIL filtert beim Absenz-Import automatisch nur die Zeilen mit dem Eintragstyp «Absenz».',
      },
      {
        title: 'Status und Kommentar',
        description: 'Entschuldigt oder unentschuldigt wird aus «Erledigt» und «EntschuldigtDatum» bestimmt. Der Kommentar wird aus zwei Textfeldern zusammengesetzt.',
      },
      {
        title: 'Lektionen',
        description: 'Die Anzahl Lektionen wird aus den Halbtagen berechnet und mit «Lektionen pro Halbtag» multipliziert.',
      },
    ],
    info:
      'Alle übrigen Journaleinträge werden über den separaten Journal-Import übernommen. Bestätigte Absenzen erscheinen zusätzlich im Journal.',
  },
  {
    title: 'Schritt 1: Importtyp Absenzen wählen',
    description:
      'Navigiere in PUPIL zu «Master Data → Personen (SuS/GV/LP/SV/MA/SB) → Datenimporte». Klicke im Bereich «Absenzen» auf «Starten».',
    image: `${imgBase}uebersicht.jpg`,
    alt: 'Datenimporte-Übersicht mit dem Absenz-Import',
    hotspots: [
      { left: 0.5, top: 69.2, width: 11.3, height: 2.5, label: 'Datenimporte' },
      { left: 43.5, top: 70.2, width: 5.6, height: 3, label: 'Absenzen starten' },
    ],
    info:
      'Wenn du Koneksa_Journal.csv bereits für den Journal-Import exportiert hast, kannst du genau dieselbe Datei verwenden.',
  },
  {
    title: 'Schritt 2: Datei auswählen und prüfen',
    description:
      'Klicke auf «Auswählen…», wähle Koneksa_Journal.csv und gehe danach mit «Weiter zur Datenüberprüfung» zur Validierung.',
    image: `${imgBase}datei-auswaehlen.jpg`,
    alt: 'Import-Datei bereitstellen mit ausgewählter CSV-Datei',
    hotspots: [
      { left: 41.6, top: 59.5, width: 7, height: 4, label: '1 Auswählen…' },
      { left: 87.5, top: 68.3, width: 11.1, height: 2.8, label: '2 Weiter zur Datenüberprüfung' },
    ],
    success: 'Erfolgskontrolle: Die Datei erscheint mit Dateinamen und grünem Häkchen im Upload-Bereich.',
  },
  {
    title: 'Schritt 3: Validierung – Fehler beheben',
    description:
      'PUPIL prüft die Datei zuerst vollständig. Behebe angezeigte Fehler und lade die korrigierte Datei erneut hoch. Ohne Fehler kannst du den Import starten.',
    image: `${imgBase}validierung-fehler.jpg`,
    alt: 'Datenüberprüfung mit Fehlertabelle',
    hotspots: [
      { left: 14.1, top: 27.6, width: 84.5, height: 13.4, label: 'Fehlertabelle prüfen' },
      { left: 91.4, top: 22.5, width: 7, height: 2.8, label: 'Fehler exportieren' },
    ],
    warning:
      'Typische Fehler sind fehlende SuS oder Ersteller, nicht gefundene Absenzgründe und ungültige Datumswerte. Gleiche die Schreibweise der Absenzgründe exakt ab.',
    info:
      'Die Validierung schreibt noch keine Daten. Wiederhole sie so oft wie nötig, bis die Datei fehlerfrei ist.',
  },
  {
    title: 'Schritt 4: Import starten',
    description:
      'Sobald keine Fehler mehr gefunden werden, erscheint die Meldung «Keine Fehler gefunden. Der Import kann gestartet werden.». Klicke auf «Import starten».',
    image: `${imgBase}validierung-ok.jpg`,
    alt: 'Datenüberprüfung ohne Fehler mit aktivem Button Import starten',
    hotspots: [{ left: 91.5, top: 41.4, width: 6.9, height: 2.8, label: 'Import starten' }],
    info: 'Es kann immer nur ein Import gleichzeitig laufen. Warte, bis der Vorgang vollständig abgeschlossen ist.',
  },
  {
    title: 'Schritt 5: Erfolg prüfen',
    description:
      'Nach Abschluss erscheint die Erfolgsmeldung mit einer Zusammenfassung der importierten Absenzen.',
    image: `${imgBase}erfolg.jpg`,
    alt: 'Erfolgsmeldung nach abgeschlossenem Import',
    success:
      'Öffne die Absenzverwaltung und prüfe stichprobenhaft Datum, Absenzgrund, Lektionen, Status und Kommentar. Vergleiche die Anzahl mit LehrerOffice.',
    warning: finalWarning,
  },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AbsenzenTutorialDialog({ open, onOpenChange }: Props) {
  return (
    <GuidedImportTutorialDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Klicktutorial – Absenzen importieren"
      steps={steps}
      checklistItems={checklistItems}
      finalWarning={finalWarning}
    />
  );
}