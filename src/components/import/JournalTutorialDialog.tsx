import { GuidedImportTutorialDialog, type GuidedTutorialStep } from './GuidedImportTutorialDialog';

const imgBase = `${import.meta.env.BASE_URL}tutorials/journal/`;
const sharedImgBase = `${import.meta.env.BASE_URL}tutorials/foerderplanung/`;

const checklistItems = [
  'Du bist in PUPIL mit der Rolle «N&Z-Administration» angemeldet',
  'Alle Schülerinnen und Schüler aus der Importdatei sind bereits in PUPIL erfasst',
  'Alle Lehrpersonen, die als Ersteller vorkommen, sind in PUPIL erfasst',
  'Alle vorkommenden Kategorien und Unterkategorien sind in PUPIL angelegt',
  'Alle vorkommenden Fächer sind in PUPIL angelegt',
  'Das betreffende Schuljahr / Semester ist in PUPIL angelegt',
  'Du hast Koneksa_Journal.csv aus LehrerOffice exportiert und lokal gespeichert',
];

const finalWarning =
  'Denk daran: Führe den Journal-Import nur einmal durch – bei einer Wiederholung werden Journaleinträge doppelt erfasst.';

const steps: GuidedTutorialStep[] = [
  {
    title: 'Checkliste – bevor du startest',
    description:
      'Hake alle Punkte ab, bevor du mit dem Journal-Import beginnst. Ein gestarteter Import kann nicht automatisch rückgängig gemacht werden.',
    checklist: true,
    warning: finalWarning,
    info:
      'Korrekturen nimmst du am besten direkt in LehrerOffice vor und exportierst danach neu. Falls du die CSV ausnahmsweise in Excel bearbeitest: Trennzeichen Semikolon, Zeichencodierung UTF-8.',
  },
  {
    title: 'Übersicht: Der Journal-Import',
    description:
      'Mit diesem Import überträgst du bestehende Journaleinträge aus LehrerOffice nach PUPIL.',
    details: [
      {
        title: 'Exportdatei',
        value: 'Koneksa_Journal.csv',
        description: 'Enthält Kategorie, Unterkategorie, Fach, Datum, Eintragstext, interne Notiz, Ersteller und Status.',
      },
      {
        title: 'Zuordnung in PUPIL',
        description: 'Kategorien, Unterkategorien und Fächer werden über einen exakten Textabgleich zugeordnet.',
      },
      {
        title: 'Absenzen separat importieren',
        description: 'Zeilen mit «Absenz» als Eintragstyp werden hier übersprungen und über den eigenen Absenz-Import übernommen.',
      },
    ],
    info:
      'Exportiere Koneksa_Journal.csv in LehrerOffice Zusatz und speichere die Datei, ohne sie vorher in Excel zu öffnen. So bleiben Umlaute und Zeichencodierung erhalten.',
  },
  {
    title: 'Schritt 1: Importtyp Journal wählen',
    description:
      'Navigiere in PUPIL zu «Master Data → Personen (SuS/GV/LP/SV/MA/SB) → Datenimporte». Klicke im Bereich «Journal» auf «Starten».',
    image: `${imgBase}datenimporte.jpg`,
    alt: 'Datenimporte-Übersicht mit dem Journal-Import',
    hotspots: [
      { left: 0.3, top: 57.5, width: 12.5, height: 2.3, label: 'Master Data → Personen' },
      { left: 43.4, top: 59.2, width: 8.5, height: 3.9, label: 'Journal starten' },
    ],
    info:
      'Journal und Absenzen verwenden dieselbe Datei. Wähle hier «Journal», damit nur die übrigen Journaleinträge übernommen werden.',
  },
  {
    title: 'Schritt 2: Datei auswählen und prüfen',
    description:
      'Klicke auf «Auswählen…», wähle Koneksa_Journal.csv und gehe danach mit «Weiter zur Datenüberprüfung» zur Validierung.',
    image: `${imgBase}datei-auswaehlen.jpg`,
    alt: 'Import-Datei bereitstellen mit ausgewählter CSV-Datei',
    hotspots: [
      { left: 41.7, top: 57.8, width: 7, height: 3.9, label: '1 Auswählen…' },
      { left: 87.6, top: 66.6, width: 11.2, height: 3.7, label: '2 Weiter zur Datenüberprüfung' },
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
      'Typische Fehler sind fehlende SuS oder Ersteller sowie nicht gefundene Kategorien, Unterkategorien und Fächer. Schon abweichende Schreibweisen oder zusätzliche Leerzeichen verhindern den Textabgleich.',
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
      'Nach Abschluss erscheint die Erfolgsmeldung mit einer Zusammenfassung der importierten Datensätze.',
    image: `${imgBase}erfolg.jpg`,
    alt: 'Erfolgsmeldung nach abgeschlossenem Import',
    success:
      'Öffne das Journal und prüfe stichprobenhaft Datum, Kategorie, Unterkategorie, Fach und Inhalt. Vergleiche die Anzahl mit LehrerOffice – Absenz-Einträge sind ausgenommen.',
    warning: finalWarning,
  },
];

const docLink = {
  url: 'https://dokumentation.pupil.ch/article/l6eg967z4n-datenimporte-journal-koneksa-ag',
  title: 'Ausführliche Dokumentation',
  description:
    'Alle Details zum Journal-Import – Voraussetzungen, Fehlerbehandlung und häufige Fragen – findest du in der vollständigen Anleitung auf dokumentation.pupil.ch.',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JournalTutorialDialog({ open, onOpenChange }: Props) {
  return (
    <GuidedImportTutorialDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Klicktutorial – Journal importieren"
      steps={steps}
      checklistItems={checklistItems}
      finalWarning={finalWarning}
      docLink={docLink}
    />
  );
}