import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, Lightbulb, CheckCircle2, ImageIcon } from 'lucide-react';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Callout({
  tone,
  children,
}: {
  tone: 'warning' | 'info' | 'tip' | 'success';
  children: React.ReactNode;
}) {
  const config = {
    warning: { icon: AlertTriangle, cls: 'border-destructive/30 bg-destructive/5 text-foreground', iconCls: 'text-destructive' },
    info: { icon: Info, cls: 'border-primary/25 bg-primary/5 text-foreground', iconCls: 'text-primary' },
    tip: { icon: Lightbulb, cls: 'border-pupil-amber/30 bg-pupil-amber/5 text-foreground', iconCls: 'text-pupil-amber' },
    success: { icon: CheckCircle2, cls: 'border-pupil-success/30 bg-pupil-success/5 text-foreground', iconCls: 'text-pupil-success' },
  }[tone];
  const Icon = config.icon;
  return (
    <div className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm leading-relaxed ${config.cls}`}>
      <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.iconCls}`} />
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function ImagePlaceholder({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 px-4 py-8 text-center">
      <ImageIcon className="h-6 w-6 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">Screenshot folgt: {label}</p>
    </div>
  );
}

function StepCard({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="border-pupil-amber/25">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-pupil-amber/15 text-sm font-bold text-pupil-amber">
            {n}
          </span>
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</CardContent>
    </Card>
  );
}

const kategorien: [string, string][] = [
  ['Absenz', 'Krankheit / Unfall · Arzt / Zahnarzt · Berufsvorbereitung · Schnuppertage · Freie Halbtage / Jokertag · Urlaub · Dispensation · Andere'],
  ['Aufgabe', 'Erfüllt · Erteilt · Nicht erfüllt'],
  ['Beobachtung', 'Negative Beobachtung · Neutrale Beobachtung · Positive Beobachtung'],
  ['Berufswahl', 'Berufsberatung · Berufserkundung · Bewerbung · Schnupperlehre · Vorbereitung höhere Schule · Vorstellung Lehrbetrieb'],
  ['Gespräch', 'Beratungsgespräch · Coachinggespräch · Elterngespräch · Gespräch · Schulisches Standortgespräch (SSG) · Standortgespräch · Telefongespräch'],
  ['Korrespondenz', '–'],
  ['Material', '–'],
  ['Verstoss', '–'],
  ['Versäumnis', 'Hausaufgaben · Lektion · Material · Verspätung'],
];

const importiert = [
  'Kategorie (über Textabgleich)',
  'Unterkategorie (über Textabgleich)',
  'Fach (über Textabgleich)',
  'Datum des Eintrags',
  'Eintragstext / öffentliche Notiz',
  'Massnahme oder Entschuldigung / interne Notiz',
  'Eintrag von (Ersteller)',
  'Erledigt / Status',
];

const nichtImportiert = [
  'Einträge mit «Absenz» in der Spalte «Eintragstyp»',
  'Kategorien und Unterkategorien, die es in PUPIL nicht gibt',
  'Fächer, die es in PUPIL nicht gibt',
  'Ersteller-Name (die Verknüpfung läuft über den Schlüssel)',
];

const checkliste = [
  'Du bist mit der Rolle N&Z-Administration in PUPIL angemeldet',
  'Alle Schülerinnen und Schüler aus der Importdatei sind in PUPIL erfasst',
  'Alle Lehrpersonen, die als Ersteller vorkommen, sind in PUPIL erfasst',
  'Alle vorkommenden Kategorien und Unterkategorien sind in PUPIL angelegt',
  'Alle vorkommenden Fächer sind in PUPIL angelegt',
  'Das betreffende Schuljahr / Semester ist in PUPIL angelegt',
  'Die CSV-Datei ist aus LehrerOffice exportiert und lokal gespeichert',
];

const fehler: [string, string, string][] = [
  ['Schüler/in nicht gefunden', 'Der Benutzerschlüssel aus der CSV existiert in PUPIL nicht', 'Betreffende SuS in PUPIL erfassen, dann erneut importieren'],
  ['Ersteller nicht gefunden', 'Die erfassende Lehrperson fehlt in PUPIL', 'Lehrperson in PUPIL erfassen'],
  ['Kategorie nicht gefunden', 'Kategorie existiert nicht oder weicht in der Schreibweise ab', 'Kategorie in PUPIL anlegen oder Schreibweise in LehrerOffice korrigieren'],
  ['Unterkategorie nicht gefunden', 'Unterkategorie existiert nicht oder weicht ab', 'Unterkategorie in PUPIL anlegen oder Schreibweise korrigieren'],
  ['Fach nicht gefunden', 'Fach existiert nicht oder weicht in der Schreibweise ab', 'Fach in PUPIL anlegen oder Schreibweise in LehrerOffice korrigieren'],
  ['Ungültiges Datum', 'Datum fehlt oder entspricht nicht dem Format TT.MM.JJJJ', 'Quelldaten in LehrerOffice korrigieren und neu exportieren'],
];

const faqs: [string, string][] = [
  ['Kann ich einen Import rückgängig machen?', 'Nein. Einmal importierte Daten lassen sich nicht automatisch zurücknehmen. Prüfe die Datei deshalb gründlich in der Validierung.'],
  ['Was passiert, wenn ich den Import zweimal durchführe?', 'Die Einträge werden doppelt erfasst. Führe den Import nur einmal durch.'],
  ['Warum fehlen nach dem Import die Absenzen?', 'Das ist beabsichtigt. Journaleinträge vom Eintragstyp «Absenz» werden nicht über den Journal-Import übernommen, sondern über die Absenzverwaltung migriert.'],
  ['Eine Kategorie oder ein Fach wird als «nicht gefunden» angezeigt — warum?', 'PUPIL gleicht Kategorien, Unterkategorien und Fächer über den Text ab. Schon ein zusätzliches Leerzeichen oder ein anderer Begriff führt dazu, dass kein passender Eintrag gefunden wird. Lege den Wert in PUPIL an oder passe die Schreibweise in LehrerOffice an, damit beide exakt übereinstimmen.'],
  ['In der Fehlertabelle stehen Namen oder andere Werte bei den Schlüsseln — was ist passiert?', 'LehrerOffice hat viele Freitextfelder. Enthält ein solches Feld die Zeichenkombination " zusammen mit ;, kann die Zeile beim Import nicht mehr korrekt in Spalten aufgeteilt werden. Prüfe das betroffene Freitextfeld in LehrerOffice, entferne die problematischen Zeichen und exportiere neu.'],
  ['Umlaute werden falsch dargestellt — was ist passiert?', 'Die CSV-Datei wurde wahrscheinlich in Excel geöffnet und gespeichert, wodurch sich die Zeichencodierung geändert hat. Exportiere die Datei in LehrerOffice neu und lade sie hoch, ohne sie zwischendurch zu öffnen.'],
  ['Ich komme nicht weiter — an wen wende ich mich?', 'Bleibt ein Fehler nach mehreren Versuchen bestehen, wende dich an den PUPIL-Support. Halte die Exportdatei und die Fehlerliste bereit.'],
];

export function JournalImportGuideDialog({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-6 py-3 border-b space-y-1 text-left">
          <div className="flex flex-row items-center justify-between">
            <DialogTitle className="text-base">Import Journal (LehrerOffice Format)</DialogTitle>
            <Badge variant="secondary" className="shrink-0 mr-8">Anleitung</Badge>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            Bestehende Journaleinträge aus LehrerOffice nach PUPIL übertragen — für die N&amp;Z-Administration.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-auto px-6 py-5 space-y-6">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Mit diesem Import überträgst du bestehende Journaleinträge aus LehrerOffice nach PUPIL. Die Anleitung
            richtet sich an die <strong className="text-foreground">N&amp;Z-Administration</strong>; technische
            Vorkenntnisse brauchst du nicht.
          </p>

          <Callout tone="warning">
            <p>
              <strong>Vor dem Start lesen:</strong> Ein gestarteter Import lässt sich <strong>nicht automatisch
              rückgängig machen</strong>. Prüfe die Datei deshalb sorgfältig in der Validierung und führe den Import{' '}
              <strong>nur einmal</strong> durch — sonst entstehen doppelte Einträge.
            </p>
          </Callout>

          <Callout tone="info">
            <p>
              <strong>Warum heisst die Datei «Koneksa_…»?</strong> Koneksa ist der Projektname des Kantons Aargau für
              den Umstieg von LehrerOffice auf PUPIL. Die Exportdatei wurde im Rahmen des Projekts entsprechend
              benannt; die Daten selbst stammen aus LehrerOffice.
            </p>
          </Callout>

          {/* Was übertragen wird */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Was übertragen wird</h3>
            <p className="text-sm text-muted-foreground">
              Grundlage ist die Datei <code className="rounded bg-muted px-1">Koneksa_Journal.csv</code>. Jeder Eintrag
              wird über einen <strong className="text-foreground">Textabgleich</strong> der passenden Kategorie,
              Unterkategorie und dem passenden Fach zugeordnet.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-pupil-success/30 bg-pupil-success/5 p-4">
                <p className="mb-2 text-sm font-semibold text-foreground">Wird importiert</p>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                  {importiert.map(i => <li key={i}>{i}</li>)}
                </ul>
              </div>
              <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-4">
                <p className="mb-2 text-sm font-semibold text-foreground">Wird nicht importiert</p>
                <ul className="space-y-1 text-sm text-muted-foreground list-disc pl-5">
                  {nichtImportiert.map(i => <li key={i}>{i}</li>)}
                </ul>
              </div>
            </div>
          </section>

          <Callout tone="warning">
            <p>
              <strong>Absenzen laufen über einen eigenen Import.</strong> Journaleinträge vom Eintragstyp «Absenz»
              werden hier bewusst übersprungen — auch dann, wenn die Kategorie «Absenz» in PUPIL existiert. Diese Daten
              migrierst du über den Absenz-Import.
            </p>
          </Callout>

          {/* Kategorien */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Kategorien und Unterkategorien in PUPIL (Kanton AG)</h3>
            <p className="text-sm text-muted-foreground">
              Gleiche diese Liste vor dem Import mit deinen LehrerOffice-Kategorien ab. Alles, was hier nicht steht,
              musst du vorher in PUPIL anlegen oder in LehrerOffice umbenennen.
            </p>
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Kategorie</th>
                    <th className="px-3 py-2 text-left font-semibold">Unterkategorien</th>
                  </tr>
                </thead>
                <tbody>
                  {kategorien.map(([k, u]) => (
                    <tr key={k} className="border-t">
                      <td className="px-3 py-2 font-medium text-foreground align-top whitespace-nowrap">{k}</td>
                      <td className="px-3 py-2 text-muted-foreground">{u}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Checkliste */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-foreground">Bevor du startest – Checkliste</h3>
            <ul className="space-y-2">
              {checkliste.map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <span className="mt-0.5 inline-block h-4 w-4 shrink-0 rounded border border-muted-foreground/40" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          {/* Schritte */}
          <section className="space-y-4">
            <StepCard n={1} title="CSV-Datei aus LehrerOffice exportieren">
              <ol className="list-decimal space-y-1 pl-5">
                <li>Öffne <strong className="text-foreground">LehrerOffice Zusatz</strong> und wechsle in den Exportbereich.</li>
                <li>Wähle den Journal-Export: <strong className="text-foreground">Koneksa_Journal.csv</strong>.</li>
                <li>Lade die Datei herunter und speichere sie lokal — <strong className="text-foreground">ohne sie zu öffnen oder zu bearbeiten</strong>.</li>
              </ol>
              <ImagePlaceholder label="Exportbereich LehrerOffice Zusatz" />
              <Callout tone="tip">
                <p>
                  <strong>Datei nicht in Excel öffnen.</strong> So bleibt die Zeichencodierung erhalten und die Umlaute
                  stimmen. Musst du die Datei ausnahmsweise doch in Excel bearbeiten, achte beim Speichern auf Semikolon
                  als Trennzeichen und UTF-8 als Codierung. Treten danach plötzlich viele neue Fehler auf, wurde mit
                  falschen Einstellungen gespeichert.
                </p>
              </Callout>
            </StepCard>

            <StepCard n={2} title="Datei in PUPIL importieren">
              <p>Der Import läuft in drei Stufen:</p>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Stufe</th>
                      <th className="px-3 py-2 text-left font-semibold">Was passiert</th>
                      <th className="px-3 py-2 text-left font-semibold">Deine Aufgabe</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-3 py-2 font-medium text-foreground">1. Datei hochladen</td>
                      <td className="px-3 py-2">PUPIL nimmt die CSV-Datei entgegen</td>
                      <td className="px-3 py-2">Importtyp wählen, Datei auswählen, hochladen</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-3 py-2 font-medium text-foreground">2. Validierung</td>
                      <td className="px-3 py-2">PUPIL prüft alle Zeilen auf Fehler</td>
                      <td className="px-3 py-2">Fehlertabelle prüfen, Fehler korrigieren, neu exportieren</td>
                    </tr>
                    <tr className="border-t">
                      <td className="px-3 py-2 font-medium text-foreground">3. Import</td>
                      <td className="px-3 py-2">PUPIL überträgt die Daten im Hintergrund</td>
                      <td className="px-3 py-2">Warten, bis der Import fertig ist, Zusammenfassung prüfen</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <Callout tone="info">
                <p>
                  <strong>Die Validierung schreibt noch keine Daten.</strong> Du kannst sie gefahrlos so oft wiederholen,
                  bis die Datei fehlerfrei ist. Der Import selbst lässt sich erst starten, wenn keine Fehler mehr
                  vorliegen, und es kann immer nur ein Import gleichzeitig laufen.
                </p>
              </Callout>
              <p className="font-medium text-foreground">Vorgehen:</p>
              <ol className="list-decimal space-y-1 pl-5">
                <li>Navigiere zu <strong className="text-foreground">Master Data → Personen (SuS/GV/LP/SV/MA/SB) → Datenimporte</strong>.</li>
                <li>Wähle den Importtyp <strong className="text-foreground">«Journal»</strong>.</li>
                <li>Klicke auf <strong className="text-foreground">«Datei auswählen»</strong> und wähle <code className="rounded bg-muted px-1">Koneksa_Journal.csv</code>.</li>
                <li>Klicke auf <strong className="text-foreground">«Hochladen»</strong>.</li>
                <li>Prüfe das Validierungsergebnis und behebe allfällige Fehler.</li>
                <li>Klicke auf <strong className="text-foreground">«Import starten»</strong> und warte, bis der Import abgeschlossen ist.</li>
              </ol>
              <ImagePlaceholder label="Importübersicht mit Importtyp Journal" />
              <ImagePlaceholder label="Upload-Bereich mit ausgewählter Datei" />
              <ImagePlaceholder label="Validierung ohne Fehler mit Button «Import starten»" />
              <ImagePlaceholder label="Erfolgsmeldung nach dem Import" />
              <Callout tone="success">
                <p><strong>Erfolgskontrolle:</strong> Nach dem Import aller Datensätze erscheint eine Erfolgsmeldung.</p>
              </Callout>
              <Callout tone="info">
                <p>
                  <strong>Dauer:</strong> Abhängig von der Datenmenge. Bei grossen Schulen mit vielen Journaleinträgen
                  kann der Import einige Minuten dauern.
                </p>
              </Callout>
            </StepCard>

            <StepCard n={3} title="Fehler beheben">
              <p>
                Findet die Validierung Fehler, zeigt PUPIL eine detaillierte Fehlertabelle. Diese kannst du als
                Excel-Datei herunterladen.
              </p>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/60">
                    <tr>
                      <th className="px-3 py-2 text-left font-semibold">Fehlermeldung</th>
                      <th className="px-3 py-2 text-left font-semibold">Ursache</th>
                      <th className="px-3 py-2 text-left font-semibold">Lösung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fehler.map(([m, u, l]) => (
                      <tr key={m} className="border-t align-top">
                        <td className="px-3 py-2 font-medium text-foreground">{m}</td>
                        <td className="px-3 py-2">{u}</td>
                        <td className="px-3 py-2">{l}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ImagePlaceholder label="Fehlertabelle in der Validierung" />
              <Callout tone="tip">
                <p>
                  <strong>Grundregel:</strong> Inhaltliche Fehler korrigierst du in LehrerOffice und exportierst neu — so
                  bleibt LehrerOffice als Quelle konsistent und die Codierung der CSV erhalten. Fehlende Kategorien,
                  Unterkategorien und Fächer legst du dagegen direkt in PUPIL an.
                </p>
              </Callout>
              <Callout tone="tip">
                <p>
                  <strong>Bei langer Fehlerliste:</strong> Lade sie als Excel-Datei herunter, sortiere nach Fehlertyp und
                  arbeite sie gebündelt ab, statt dich durch die Tabellenseiten zu klicken.
                </p>
              </Callout>
            </StepCard>

            <StepCard n={4} title="Ergebnis prüfen">
              <ol className="list-decimal space-y-1 pl-5">
                <li>Navigiere zum <strong className="text-foreground">Journal</strong>.</li>
                <li>Die importierten Einträge erscheinen mit Datum, Kategorie, Unterkategorie, Fach und Inhalt.</li>
                <li>Prüfe stichprobenhaft einige Einträge auf Vollständigkeit.</li>
                <li>Vergleiche die <strong className="text-foreground">Anzahl importierter Einträge</strong> aus der Zusammenfassung mit LehrerOffice. Die Absenz-Einträge sind dabei ausgenommen.</li>
              </ol>
              <ImagePlaceholder label="Journal-Ansicht mit importierten Einträgen" />
            </StepCard>
          </section>

          {/* FAQ */}
          <section className="space-y-3 pb-4">
            <h3 className="text-lg font-semibold text-foreground">Häufige Fragen</h3>
            <Accordion type="single" collapsible className="rounded-lg border px-3">
              {faqs.map(([q, a], i) => (
                <AccordionItem key={q} value={`faq-${i}`}>
                  <AccordionTrigger className="text-left text-sm">{q}</AccordionTrigger>
                  <AccordionContent className="text-sm leading-relaxed text-muted-foreground">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
