import { useState } from 'react';
import { WizardHeader } from '@/components/import/WizardHeader';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import {
  Users, FolderOpen, ClipboardList, BookOpen, Search, ArrowLeft,
  FileSpreadsheet, Upload, CheckCircle2, Download, ShieldCheck,
  Sparkles, HelpCircle, Info, AlertTriangle, Clipboard, RefreshCw,
  FileUp, Database, FileJson, Lightbulb, ArrowRight, School
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Documentation() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('overview');

  const sections = [
    { id: 'overview', label: 'Übersicht', icon: BookOpen },
    { id: 'schueler', label: 'Stammdaten', icon: Users },
    { id: 'gruppen', label: 'Gruppenzuweisungen', icon: FolderOpen },
    { id: 'lp', label: 'LP-Zuweisungen', icon: ClipboardList },
    { id: 'korrektur', label: 'Korrektur-Gedächtnis', icon: RefreshCw },
    { id: 'faq', label: 'FAQ', icon: HelpCircle },
  ];

  const faqItems = [
    {
      q: 'Welche Dateiformate werden unterstützt?',
      a: 'Für den Stammdaten-Import werden CSV- und Excel-Dateien (.xlsx, .xls) unterstützt. Für den Gruppen- und LP-Import werden die Daten per Copy-Paste aus LehrerOffice eingefügt.',
    },
    {
      q: 'Werden meine Daten auf einem Server gespeichert?',
      a: 'Nein. Alle Daten werden ausschliesslich lokal in Ihrem Browser verarbeitet. Es werden keine Daten an einen externen Server gesendet. Auch das Korrektur-Gedächtnis wird im localStorage Ihres Browsers gespeichert.',
    },
    {
      q: 'Was passiert, wenn Pflichtfelder in meiner Datei fehlen?',
      a: 'Der Wizard erkennt fehlende Pflichtfelder in Schritt 2 (Spaltenprüfung) und zeigt diese rot markiert an. Der Import kann dennoch fortgesetzt werden, aber PUPIL wird die fehlenden Daten beim Import möglicherweise nicht akzeptieren.',
    },
    {
      q: 'Kann ich Korrekturen für zukünftige Importe speichern?',
      a: 'Ja – aber nur beim Stammdaten-Import! Im Schritt 4 (Export) können Sie Ihre Korrekturen als "Korrektur-Gedächtnis" speichern – entweder lokal im Browser oder als JSON-Datei zum Teilen mit Kolleg:innen. Beim nächsten Stammdaten-Import wählen Sie "Weitere Datenaufbereitung" und die bekannten Fehler werden automatisch korrigiert. Für Gruppenzuweisungen und LP-Zuweisungen steht das Korrektur-Gedächtnis nicht zur Verfügung.',
    },
    {
      q: 'Was ist der Unterschied zwischen "Erste" und "Weitere Datenaufbereitung"?',
      a: '"Erste Datenaufbereitung" ist für den erstmaligen Stammdaten-Import ohne vorherige Korrekturen. "Weitere Datenaufbereitung" nutzt gespeicherte Korrekturregeln, um bekannte Fehler automatisch zu beheben – ideal für wiederkehrende Semester-Importe. Diese Auswahl gibt es nur beim Stammdaten-Import.',
    },
    {
      q: 'Wie funktioniert der Fächer-Abgleich bei Gruppen?',
      a: 'Im Gruppen-Wizard können Sie PUPIL-Fächer einfügen. Der Wizard prüft dann automatisch, ob alle in den Gruppen verwendeten Fächer auch in PUPIL vorhanden sind. Falls nicht, können Sie ein alternatives PUPIL-Fach zuweisen oder das Fach zuerst in PUPIL erfassen.',
    },
    {
      q: 'Was bedeuten die verschiedenen Farben in der Validierung?',
      a: 'Rot markiert Pflichtfehler (z.B. ungültiges Datumsformat, fehlende AHV-Nummer). Orange markiert Warnungen (z.B. mögliche Duplikate). Grün zeigt korrigierte Werte an. In der Spaltenprüfung zeigt Grün vorhandene, Rot fehlende und Blau zusätzliche Spalten.',
    },
    {
      q: 'Wie exportiere ich die korrigierten Daten?',
      a: 'In Schritt 4 (Export/Vorschau) klicken Sie auf "Herunterladen". Die Datei wird als Excel (.xlsx) exportiert und enthält alle korrigierten Werte. Die Originaldatei bleibt unverändert.',
    },
    {
      q: 'Kann ich Gruppen manuell hinzufügen oder bearbeiten?',
      a: 'Ja. Im Gruppen-Wizard können Sie nach dem Einfügen der LehrerOffice-Daten einzelne Gruppen manuell hinzufügen, bearbeiten oder löschen. Alle Felder (Name, Schlüssel, Schulfach, Lehrpersonen) sind editierbar.',
    },
    {
      q: 'Was ist der PUPIL-Schlüsselabgleich bei LP-Zuweisungen?',
      a: 'Der LP-Wizard gleicht die Lehrpersonennamen aus LehrerOffice automatisch mit den PUPIL-Personendaten ab. Dafür laden Sie eine Personen-Export-Datei aus PUPIL hoch (mit Nachname, Vorname, Schlüssel). Nicht automatisch zugeordnete LPs können manuell zugewiesen werden.',
    },
    {
      q: 'Funktioniert der Wizard auch offline?',
      a: 'Der Wizard verarbeitet alle Daten lokal im Browser. Für die Grundfunktionen (Datei-Upload, Validierung, Export) ist nach dem Laden der Seite keine Internetverbindung mehr nötig.',
    },
    {
      q: 'Welche Browser werden unterstützt?',
      a: 'Der Wizard funktioniert in allen modernen Browsern: Chrome, Firefox, Edge und Safari. Für die beste Erfahrung empfehlen wir Chrome oder Firefox in der aktuellen Version.',
    },
  ];

  const filteredFaq = faqItems.filter(
    item =>
      !searchQuery ||
      item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <WizardHeader title="Dokumentation" />

      <main className="container mx-auto px-4 py-8 max-w-5xl flex-1">
        {/* Back to Wizard */}
        <Button variant="ghost" onClick={() => navigate('/')} className="mb-6 -ml-2">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück zum Import Wizard
        </Button>

        {/* Hero */}
        <div className="text-center space-y-3 mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
            <BookOpen className="h-3.5 w-3.5" />
            Hilfe & Dokumentation
          </div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">
            Alles was Sie wissen müssen
          </h2>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Schritt-für-Schritt Anleitungen, Tipps und häufig gestellte Fragen zum PUPIL Import Wizard.
          </p>
        </div>

        {/* Section Navigation */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {sections.map(s => {
            const Icon = s.icon;
            return (
              <Button
                key={s.id}
                variant={activeSection === s.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveSection(s.id)}
                className="shadow-sm"
              >
                <Icon className="h-4 w-4 mr-1.5" />
                {s.label}
              </Button>
            );
          })}
        </div>

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Was ist der Import Wizard?</CardTitle>
                    <CardDescription>Überblick über die Funktionalitäten</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Der PUPIL Import Wizard hilft Ihnen, Daten aus <strong>LehrerOffice</strong> für den Import nach <strong>PUPIL</strong> aufzubereiten.
                  Der gesamte Prozess läuft lokal in Ihrem Browser ab – Ihre Daten verlassen niemals Ihren Computer.
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Der Wizard bietet <strong>drei verschiedene Import-Typen</strong>, die jeweils einen eigenständigen Ablauf haben:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="bg-muted/30 border-0">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold text-sm">Stammdaten</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">Schüler, Klassen, Lehrpersonen und Erziehungsberechtigte validieren und exportieren.</p>
                      <Badge variant="outline" className="mt-2 text-xs text-primary border-primary/30">Korrektur-Gedächtnis verfügbar</Badge>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30 border-0">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3 mb-2">
                        <FolderOpen className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold text-sm">Gruppenzuweisungen</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">Manuelle Gruppen aus LehrerOffice erfassen und Schülern zuweisen.</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30 border-0">
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-3 mb-2">
                        <ClipboardList className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold text-sm">LP-Zuweisungen</h4>
                      </div>
                      <p className="text-xs text-muted-foreground">Lehrpersonen automatisch Klassen und Fächern der Stundentafel zuweisen.</p>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">So funktioniert der Wizard</CardTitle>
                    <CardDescription>Der allgemeine Ablauf in 5 Schritten</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { step: '0', title: 'Import-Typ wählen', desc: 'Wählen Sie den passenden Import-Typ und den Aufbereitungsmodus.', icon: Sparkles },
                    { step: '1', title: 'Datei hochladen', desc: 'CSV- oder Excel-Datei aus LehrerOffice hochladen.', icon: Upload },
                    { step: '2', title: 'Spalten prüfen', desc: 'Automatische Prüfung ob alle benötigten Spalten vorhanden sind.', icon: CheckCircle2 },
                    { step: '3', title: 'Daten validieren', desc: 'Fehler erkennen, korrigieren und automatische Korrekturen anwenden.', icon: AlertTriangle },
                    { step: '4', title: 'Export', desc: 'Korrigierte Datei herunterladen und Korrekturen speichern.', icon: Download },
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-4 p-4 rounded-xl border bg-background hover:bg-muted/20 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 text-sm font-bold shadow-sm">
                        {s.step}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-sm">{s.title}</h4>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.desc}</p>
                      </div>
                      <s.icon className="h-5 w-5 text-muted-foreground shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/*
         * ============================================================
         * ⚠️  WICHTIG: VALIDIERUNGSREGELN SYNCHRON HALTEN!
         * ============================================================
         * Die unten aufgeführten Regeln müssen manuell aktualisiert
         * werden, wenn sich die Validierungslogik ändert.
         *
         * Relevante Quell-Dateien:
         *   - src/lib/fileParser.ts
         *       → Feldformat-Validierungen (validateFieldType)
         *       → Duplikat-Erkennung (DUPLICATE_CHECK_FIELDS)
         *       → Eltern-ID Konsolidierung (checkParentIdConsistency)
         *       → Diakritische Namenskorrektur (checkDiacriticNameInconsistencies)
         *       → Pflichtfeld-Prüfung (validateData)
         *   - src/workers/validationWorker.ts
         *       → Automatische Sammelkorrekturen (analyzeErrors, applyCorrection)
         *       → Format-Funktionen (formatAHV, formatPhone, formatEmail, etc.)
         *
         * Bei jeder Änderung an diesen Dateien bitte prüfen, ob die
         * Dokumentation unten noch korrekt ist!
         * ============================================================
         */}
        {/* Stammdaten Section */}
        {activeSection === 'schueler' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Stammdaten importieren</CardTitle>
                    <CardDescription>Kompletter Leitfaden für den SuS-Import (CSV/Excel)</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    Vorbereitung in LehrerOffice
                  </h4>
                  <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                    <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                      <li>Öffnen Sie LehrerOffice und wählen Sie <strong>Daten exportieren</strong></li>
                      <li>Wählen Sie das gewünschte Format: <strong>CSV</strong> oder <strong>Excel (.xlsx)</strong></li>
                      <li>Stellen Sie sicher, dass die Pflichtfelder enthalten sind (S_AHV, S_ID, S_Name, S_Vorname, etc.)</li>
                      <li>Exportieren Sie die Datei auf Ihrem Computer</li>
                    </ol>
                  </div>

                  <h4 className="font-semibold flex items-center gap-2 pt-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    Pflichtfelder
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {['S_AHV', 'S_ID', 'S_Name', 'S_Vorname', 'S_Geschlecht', 'S_Geburtsdatum', 'K_Name'].map(f => (
                      <Badge key={f} variant="outline" className="font-mono text-xs">{f}</Badge>
                    ))}
                  </div>

                  <h4 className="font-semibold flex items-center gap-2 pt-2">
                    <AlertTriangle className="h-4 w-4 text-primary" />
                    Alle Validierungsregeln
                  </h4>

                  {/* 1. Feldformat-Validierungen */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                    <h5 className="font-semibold text-sm">1. Feldformat-Validierungen</h5>
                    <p className="text-xs text-muted-foreground">Jedes Feld wird anhand seines Datentyps geprüft. Ungültige Werte werden als Fehler markiert.</p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li><strong>AHV-Nummer:</strong> Muss dem Format <code className="bg-muted px-1 rounded text-xs">756.XXXX.XXXX.XX</code> entsprechen (13 Ziffern, beginnend mit 756).</li>
                      <li><strong>Datum:</strong> Akzeptiert <code className="bg-muted px-1 rounded text-xs">DD.MM.YYYY</code>, <code className="bg-muted px-1 rounded text-xs">YYYY-MM-DD</code>, <code className="bg-muted px-1 rounded text-xs">DD/MM/YYYY</code> sowie Excel-Seriennummern.</li>
                      <li><strong>Geschlecht:</strong> Gültige Werte: M, W, D (sowie Varianten wie männlich, weiblich, divers, male, female).</li>
                      <li><strong>PLZ:</strong> 4–5 Ziffern (CH: 4, DE/AT: 5).</li>
                      <li><strong>E-Mail:</strong> Standard-E-Mail-Format (mindestens <code className="bg-muted px-1 rounded text-xs">x@x.x</code>).</li>
                      <li><strong>Telefon:</strong> Internationale und nationale Formate: <code className="bg-muted px-1 rounded text-xs">+41...</code>, <code className="bg-muted px-1 rounded text-xs">0041...</code>, <code className="bg-muted px-1 rounded text-xs">07X...</code> (7–15 Ziffern).</li>
                      <li><strong>Zahl:</strong> Muss ein gültiger numerischer Wert sein.</li>
                    </ul>
                  </div>

                  {/* 2. Pflichtfeld-Prüfung */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                    <h5 className="font-semibold text-sm">2. Pflichtfeld-Prüfung</h5>
                    <p className="text-xs text-muted-foreground">Felder, die als Pflichtfeld definiert sind, dürfen nicht leer sein. Leere Pflichtfelder werden als Fehler gemeldet.</p>
                  </div>

                  {/* 3. Duplikat-Prüfung */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                    <h5 className="font-semibold text-sm">3. Duplikat-Erkennung</h5>
                    <p className="text-xs text-muted-foreground">Folgende Felder werden auf doppelte Werte geprüft:</p>
                    <div className="flex flex-wrap gap-2">
                      {['S_AHV', 'S_ID', 'L_KL1_AHV'].map(f => (
                        <Badge key={f} variant="outline" className="font-mono text-xs">{f}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Duplikate werden als Fehler markiert und zeigen die erste Zeile an, in der der Wert vorkommt.</p>
                  </div>

                  {/* 4. Eltern-ID Konsistenz */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                    <h5 className="font-semibold text-sm">4. Eltern-ID Konsolidierung</h5>
                    <p className="text-xs text-muted-foreground">
                      Prüft, ob dasselbe Elternteil in verschiedenen Zeilen (ERZ1/ERZ2) dieselbe ID hat. Verwendet drei Erkennungsstrategien mit abnehmender Zuverlässigkeit:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>
                        <strong>AHV-Nummer</strong> <Badge variant="default" className="ml-1 text-[10px] py-0">Hohe Zuverlässigkeit</Badge>
                        <br /><span className="text-xs">Gleiche AHV-Nummer → gleiche Person. Fehler, wenn IDs abweichen.</span>
                      </li>
                      <li>
                        <strong>Name + Vorname + Strasse</strong> <Badge variant="secondary" className="ml-1 text-[10px] py-0">Mittlere Zuverlässigkeit</Badge>
                        <br /><span className="text-xs">Gleicher Name an gleicher Adresse. ⚠ Vater und Sohn mit gleichem Namen möglich.</span>
                      </li>
                      <li>
                        <strong>Name + Vorname (Elternpaar)</strong> <Badge variant="outline" className="ml-1 text-[10px] py-0">Tiefe Zuverlässigkeit</Badge>
                        <br /><span className="text-xs">Wird nur ausgelöst, wenn <em>beide</em> Elternteile (ERZ1 + ERZ2) namentlich übereinstimmen. Wird als Warnung (nicht Fehler) angezeigt.</span>
                        <br /><span className="text-xs">Bei <strong>unterschiedlicher Adresse</strong> wird zusätzlich disambiguiert: Gleiche Telefonnummer (Privat/Geschäft/Mobil) → dieselbe Person. Falls keine Telefon-Übereinstimmung: Gleicher anderer Elternteil → dieselbe Person (umgezogen). Ansonsten → verschiedene Personen, keine Warnung.</span>
                      </li>
                    </ul>
                    <p className="text-xs text-muted-foreground">Bereits durch eine zuverlässigere Strategie erkannte Konflikte werden nicht doppelt gemeldet. Diakritische Unterschiede (z.B. ü vs. ue) werden normalisiert.</p>
                  </div>

                  {/* 5. Diakritische Korrektur */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                    <h5 className="font-semibold text-sm">5. Diakritische Namenskorrektur</h5>
                    <p className="text-xs text-muted-foreground">
                      Wenn derselbe Name in verschiedenen Schreibweisen vorkommt (z.B. «Müller» vs. «Muller»), wird automatisch die Version mit mehr diakritischen Zeichen gewählt.
                    </p>
                    <p className="text-xs text-muted-foreground">Betrifft die Felder:</p>
                    <div className="flex flex-wrap gap-2">
                      {['S_Name', 'S_Vorname', 'P_ERZ1_Name', 'P_ERZ1_Vorname', 'P_ERZ2_Name', 'P_ERZ2_Vorname', 'L_KL1_Name', 'L_KL1_Vorname'].map(f => (
                        <Badge key={f} variant="outline" className="font-mono text-xs">{f}</Badge>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Korrekturvorschläge werden als Warnung angezeigt und automatisch angewendet.</p>
                  </div>

                  {/* 6. Automatische Korrekturen */}
                  <div className="bg-muted/30 rounded-xl p-4 space-y-3">
                    <h5 className="font-semibold text-sm">6. Automatische Sammelkorrekturen</h5>
                    <p className="text-xs text-muted-foreground">
                      Der Wizard erkennt Fehlermuster und bietet Sammelkorrekturen an. Folgende Korrekturen sind verfügbar:
                    </p>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li><strong>AHV-Format:</strong> Rohe Ziffernfolgen (756...) werden zu <code className="bg-muted px-1 rounded text-xs">756.XXXX.XXXX.XX</code> formatiert.</li>
                      <li><strong>Telefon-Format:</strong> Verschiedene Eingabeformate werden zu <code className="bg-muted px-1 rounded text-xs">+41 XX XXX XX XX</code> normalisiert.</li>
                      <li><strong>E-Mail-Bereinigung:</strong> Leerzeichen, Tippfehler (gmial→gmail), doppelte Punkte und Umlaute werden korrigiert.</li>
                      <li><strong>PLZ-Format:</strong> Nicht-numerische Zeichen werden entfernt.</li>
                      <li><strong>Geschlecht-Normalisierung:</strong> Varianten wie «männlich», «male», «Herr» werden zu M/W/D vereinheitlicht.</li>
                      <li><strong>Namen-Kapitalisierung:</strong> GROSSBUCHSTABEN oder kleinbuchstaben werden korrekt kapitalisiert (inkl. Bindestriche).</li>
                      <li><strong>Strassen-Format:</strong> Grossschreibung korrigiert, Abkürzungen wie «Str.» aufgelöst.</li>
                      <li><strong>IBAN-Format:</strong> Wird zu <code className="bg-muted px-1 rounded text-xs">CHXX XXXX XXXX XXXX XXXX X</code> formatiert.</li>
                      <li><strong>Excel-Datum:</strong> Excel-Seriennummern werden zu <code className="bg-muted px-1 rounded text-xs">DD.MM.YYYY</code> konvertiert.</li>
                    </ul>
                  </div>

                  <h4 className="font-semibold flex items-center gap-2 pt-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Tipps
                  </h4>
                  <div className="bg-primary/[0.03] rounded-xl p-4 border border-primary/10">
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li>• Verwenden Sie das <strong>Korrektur-Gedächtnis</strong> für wiederkehrende Importe</li>
                      <li>• Prüfen Sie die <strong>Spaltenübersicht</strong> in Schritt 2 sorgfältig</li>
                      <li>• Nutzen Sie die <strong>Sammelkorrektur</strong> für gleichartige Fehler</li>
                      <li>• Exportieren Sie Korrekturregeln als <strong>JSON</strong> zum Teilen mit Kolleg:innen</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Gruppen Section */}
        {activeSection === 'gruppen' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Gruppenzuweisungen</CardTitle>
                    <CardDescription>Manuelle Gruppen und SuS-Zuweisungen erstellen</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clipboard className="h-4 w-4 text-primary" />
                  Ablauf in 3 Schritten
                </h4>

                <div className="space-y-4">
                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground">Schritt 1</Badge>
                      <h5 className="font-semibold text-sm">Gruppen erfassen</h5>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>In diesem Schritt fügen Sie drei Datenquellen per Copy-Paste ein:</p>
                      <ol className="list-decimal list-inside space-y-1.5 pl-2">
                        <li><strong>Fächerübersicht aus LehrerOffice:</strong> Kopieren Sie die Fächertabelle. Kürzel werden automatisch durch Fachnamen ersetzt.</li>
                        <li><strong>Fächer aus PUPIL:</strong> Kopieren Sie die PUPIL-Fächerliste. Fehlende Fächer werden automatisch erkannt.</li>
                        <li><strong>Gruppenübersicht aus LehrerOffice:</strong> Kopieren Sie die Gruppenübersicht. Automatische und inaktive Gruppen werden gefiltert.</li>
                      </ol>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground">Schritt 2</Badge>
                      <h5 className="font-semibold text-sm">Schüler zuweisen</h5>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Laden Sie eine CSV- oder Excel-Datei mit Schülerdaten hoch. Benötigte Spalten:</p>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">S_ID</Badge>
                        <Badge variant="outline" className="font-mono text-xs">S_Name</Badge>
                        <Badge variant="outline" className="font-mono text-xs">S_Vorname</Badge>
                        <Badge variant="outline" className="font-mono text-xs">S_Gruppen</Badge>
                      </div>
                      <p>Optional: PUPIL-Schlüsselabgleich-Datei für die Zuordnung von LO-IDs zu PUPIL-IDs.</p>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground">Schritt 3</Badge>
                      <h5 className="font-semibold text-sm">Export</h5>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Zwei Excel-Dateien werden erstellt:</p>
                      <ul className="space-y-1">
                        <li>• <strong>Gruppen-Importieren.xlsx</strong> – Erstellt die Gruppen in PUPIL</li>
                        <li>• <strong>SuS_Gruppen_Import.xlsx</strong> – Weist die Schüler den Gruppen zu</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/[0.03] rounded-xl p-4 border border-primary/10">
                  <h5 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <School className="h-4 w-4 text-primary" />
                    Fächer-Abgleich
                  </h5>
                  <p className="text-sm text-muted-foreground">
                    Wenn Sie PUPIL-Fächer eingefügt haben, prüft der Wizard automatisch, ob alle in den Gruppen
                    verwendeten Fächer auch in PUPIL vorhanden sind. Fehlende Fächer können einem bestehenden
                    PUPIL-Fach zugewiesen werden oder müssen zuerst in PUPIL erfasst werden.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* LP-Zuweisungen Section */}
        {activeSection === 'lp' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">LP-Klassenzuweisungen</CardTitle>
                    <CardDescription>Lehrpersonen Klassen und Fächern zuweisen</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <h4 className="font-semibold flex items-center gap-2">
                  <Clipboard className="h-4 w-4 text-primary" />
                  Ablauf in 3 Schritten
                </h4>

                <div className="space-y-4">
                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground">Schritt 1</Badge>
                      <h5 className="font-semibold text-sm">Klassen erfassen</h5>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Kopieren Sie die Zuweisungstabelle aus LehrerOffice (Tab-getrennt). Das erwartete Format:</p>
                      <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs overflow-x-auto">
                        Klasse | [Status] | KLP 1 | KLP 2 | KLP 3 | WLP 1-3 | HP 1-3 | WFL 1-3 | Vikariat
                      </div>
                      <p>Inaktive Klassen werden automatisch übersprungen.</p>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground">Schritt 2</Badge>
                      <h5 className="font-semibold text-sm">LP zuordnen</h5>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Laden Sie den <strong>Personen-Export aus PUPIL</strong> hoch (Excel/CSV). Benötigte Spalten:</p>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">Nachname</Badge>
                        <Badge variant="outline" className="font-mono text-xs">Vorname</Badge>
                        <Badge variant="outline" className="font-mono text-xs">Schlüssel</Badge>
                      </div>
                      <p>Die LP-Namen werden automatisch mit den PUPIL-Schlüsseln abgeglichen. Nicht zugeordnete LPs können manuell zugewiesen werden.</p>
                    </div>
                  </div>

                  <div className="rounded-xl border p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground">Schritt 3</Badge>
                      <h5 className="font-semibold text-sm">Export</h5>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>Die <strong>LP-Zuteilung.xlsx</strong> wird erstellt mit den Spalten:</p>
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">LP Name</Badge>
                        <Badge variant="outline" className="font-mono text-xs">LP Schlüssel</Badge>
                        <Badge variant="outline" className="font-mono text-xs">Rolle</Badge>
                        <Badge variant="outline" className="font-mono text-xs">Klasse</Badge>
                        <Badge variant="outline" className="font-mono text-xs">Fach</Badge>
                      </div>
                      <p>Zuweisungen ohne PUPIL-Schlüssel werden gelb markiert.</p>
                    </div>
                  </div>
                </div>

                <div className="bg-primary/[0.03] rounded-xl p-4 border border-primary/10">
                  <h5 className="font-semibold text-sm flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-primary" />
                    Rollen-Zuordnung
                  </h5>
                  <p className="text-sm text-muted-foreground mb-2">
                    Die Spalten in LehrerOffice werden automatisch folgenden Rollen zugeordnet:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="text-xs">Klassenlehrperson (Spalte 1-3)</Badge>
                    <Badge variant="secondary" className="text-xs">Weitere Lehrperson (Spalte 4-6)</Badge>
                    <Badge variant="secondary" className="text-xs">Heilpädagoge/in (Spalte 7-9)</Badge>
                    <Badge variant="secondary" className="text-xs">Weitere Förderlehrperson (Spalte 10-12)</Badge>
                    <Badge variant="secondary" className="text-xs">Vikariat (Spalte 13-14)</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Korrektur-Gedächtnis Section */}
        {activeSection === 'korrektur' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Korrektur-Gedächtnis</CardTitle>
                    <CardDescription>Korrekturen speichern und wiederverwenden</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Das Korrektur-Gedächtnis ermöglicht es Ihnen, einmalig durchgeführte Korrekturen zu speichern
                  und bei zukünftigen Importen automatisch anzuwenden. Das ist besonders nützlich bei wiederkehrenden
                  Semester-Importen, bei denen dieselben Fehler auftreten.
                </p>

                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-semibold text-sm text-destructive">Nur für Stammdaten verfügbar</h5>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Das Korrektur-Gedächtnis ist ausschliesslich beim <strong>Stammdaten-Import</strong> verfügbar.
                      Für Gruppenzuweisungen und LP-Klassenzuweisungen wird kein Korrektur-Gedächtnis benötigt,
                      da diese per Copy-Paste erfasst werden und keine Validierungsschleife durchlaufen.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-muted/30 border-0">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <FileUp className="h-5 w-5 text-primary" />
                        <h5 className="font-semibold text-sm">Erste Datenaufbereitung</h5>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Neue Datei ohne vorherige Korrekturen</li>
                        <li>• Korrekturen manuell durchführen</li>
                        <li>• Im Exportschritt speichern für nächstes Mal</li>
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/30 border-0">
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5 text-primary" />
                        <h5 className="font-semibold text-sm">Weitere Datenaufbereitung</h5>
                      </div>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Gespeicherte Korrekturen laden</li>
                        <li>• Bekannte Fehler automatisch korrigieren</li>
                        <li>• Nur neue Fehler manuell bearbeiten</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" />
                  Speichermöglichkeiten
                </h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-4 rounded-xl border bg-background">
                    <Database className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-sm">Lokaler Browser-Speicher</h5>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Korrekturen werden im localStorage Ihres Browsers gespeichert. Verfügbar nur auf diesem Gerät und in diesem Browser.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-4 rounded-xl border bg-background">
                    <FileJson className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-semibold text-sm">JSON-Datei exportieren</h5>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Korrekturregeln als JSON-Datei exportieren. Ideal zum Teilen mit Kolleg:innen oder zur Sicherung auf einem anderen Gerät.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FAQ Section */}
        {activeSection === 'faq' && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <HelpCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Häufig gestellte Fragen</CardTitle>
                    <CardDescription>{filteredFaq.length} Fragen & Antworten</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Fragen durchsuchen..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {filteredFaq.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Keine Fragen gefunden für "{searchQuery}"</p>
                  </div>
                ) : (
                  <Accordion type="multiple" className="space-y-2">
                    {filteredFaq.map((item, i) => (
                      <AccordionItem key={i} value={`faq-${i}`} className="border rounded-xl px-4 data-[state=open]:bg-muted/20">
                        <AccordionTrigger className="text-sm font-medium text-left hover:no-underline py-4">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </CardContent>
            </Card>

            {/* Privacy Card */}
            <Card className="border-primary/20 bg-primary/[0.02]">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Datenschutz & Sicherheit</h4>
                    <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                      Der PUPIL Import Wizard verarbeitet alle Daten <strong>ausschliesslich lokal in Ihrem Browser</strong>.
                      Es werden keine Daten auf externen Servern gespeichert oder an Dritte übermittelt.
                      Auch das Korrektur-Gedächtnis wird im localStorage Ihres Browsers gespeichert und verlässt niemals Ihren Computer.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
