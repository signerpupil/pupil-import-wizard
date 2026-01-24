import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Cpu, Globe, CheckCircle2, Server, Lock, Code, Eye, Mail, Phone, CreditCard, MapPin, User, Calendar, FileText, Hash } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// Hardcoded pattern definitions for transparency
const LOCAL_PATTERNS = {
  swissFormats: [
    {
      name: 'AHV-Nummer',
      icon: Hash,
      pattern: '^756\\.\\d{4}\\.\\d{4}\\.\\d{2}$',
      description: 'Schweizer Sozialversicherungsnummer im Format 756.XXXX.XXXX.XX',
      example: '756.1234.5678.97',
      autoFix: 'Formatiert 13-stellige Nummern mit 756-Präfix automatisch',
    },
    {
      name: 'Telefon (Mobil)',
      icon: Phone,
      pattern: '^\\+41\\s?7[5-9]\\s?\\d{3}\\s?\\d{2}\\s?\\d{2}$',
      description: 'Schweizer Mobilnummern mit Landesvorwahl',
      example: '+41 79 123 45 67',
      autoFix: 'Konvertiert 07X, 0041, oder 41-Formate',
    },
    {
      name: 'Telefon (Festnetz)',
      icon: Phone,
      pattern: '^\\+41\\s?[1-6]\\d\\s?\\d{3}\\s?\\d{2}\\s?\\d{2}$',
      description: 'Schweizer Festnetznummern mit Landesvorwahl',
      example: '+41 44 123 45 67',
      autoFix: 'Konvertiert 0XX-Formate mit Vorwahl',
    },
    {
      name: 'Postleitzahl (PLZ)',
      icon: MapPin,
      pattern: '^\\d{4}$',
      description: 'Schweizer 4-stellige Postleitzahl',
      example: '8000',
      autoFix: 'Extrahiert 4-stellige PLZ aus Text',
    },
    {
      name: 'IBAN (Schweiz)',
      icon: CreditCard,
      pattern: '^CH\\d{2}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}\\s?\\d{4}\\s?\\d{1}$',
      description: 'Schweizer IBAN im Standardformat',
      example: 'CH93 0076 2011 6238 5295 7',
      autoFix: 'Formatiert 21-stellige CH-IBANs mit Leerzeichen',
    },
  ],
  dataCleanup: [
    {
      name: 'E-Mail-Bereinigung',
      icon: Mail,
      pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
      description: 'Validiert und bereinigt E-Mail-Adressen',
      example: 'name@example.ch',
      autoFix: 'Entfernt Leerzeichen, Umlaute, korrigiert Tippfehler (gmial→gmail, hotmal→hotmail)',
    },
    {
      name: 'Geschlecht',
      icon: User,
      pattern: '^[MWD]$',
      description: 'Normalisiert Geschlechtsangaben auf M/W/D',
      example: 'M / W / D',
      autoFix: 'Erkennt: männlich, male, Herr, weiblich, female, Frau, divers, etc.',
    },
    {
      name: 'Namen (Proper Case)',
      icon: User,
      pattern: 'Erste Buchstaben gross',
      description: 'Korrigiert Gross-/Kleinschreibung bei Namen',
      example: 'Hans-Peter Müller',
      autoFix: 'Konvertiert GROSSBUCHSTABEN oder kleinbuchstaben',
    },
    {
      name: 'Strassen (Proper Case)',
      icon: MapPin,
      pattern: 'Erste Buchstaben gross',
      description: 'Korrigiert Gross-/Kleinschreibung bei Adressen',
      example: 'Bahnhofstrasse 12',
      autoFix: 'Erweitert "Str." zu "Strasse", korrigiert Schreibung',
    },
    {
      name: 'Excel-Datum',
      icon: Calendar,
      pattern: 'Seriennummer → TT.MM.JJJJ',
      description: 'Konvertiert Excel-Seriennummern in lesbares Datum',
      example: '15.03.2024',
      autoFix: 'Erkennt Zahlen 1-100000 als potentielle Datumswerte',
    },
  ],
  consistencyChecks: [
    {
      name: 'Eltern-ID Konsistenz',
      icon: FileText,
      pattern: 'Gleiche Person → Gleiche ID',
      description: 'Prüft ob dieselbe Person verschiedene IDs hat',
      example: 'Erkennt via AHV oder Name+Adresse',
      autoFix: 'Konsolidiert auf häufigste ID pro Person',
    },
    {
      name: 'Duplikat-Erkennung',
      icon: FileText,
      pattern: 'Identische Werte in Unique-Spalten',
      description: 'Findet doppelte Einträge in ID-Spalten',
      example: 'Mehrere Zeilen mit gleicher ID',
      autoFix: 'Zeigt Duplikate zur manuellen Prüfung',
    },
  ],
};

export function AdminAISettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5" />
                Lokale Datenverarbeitung
              </CardTitle>
              <CardDescription>
                Alle Daten werden 100% lokal im Browser verarbeitet.
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              <Shield className="h-3 w-3 mr-1" />
              Datenschutzkonform
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Privacy Info */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lock className="h-5 w-5 text-green-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-green-800">Maximaler Datenschutz</h4>
                <p className="text-sm text-green-700 mt-1">
                  Die gesamte Datenvalidierung und -korrektur erfolgt lokal in Ihrem Browser. 
                  Keine Daten verlassen Ihr Gerät oder werden an externe Server übertragen.
                </p>
              </div>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid gap-4 md:grid-cols-2">
            <FeatureCard
              icon={<Cpu className="h-5 w-5 text-primary" />}
              title="Lokale Musteranalyse"
              description="Erkennt Formatierungsfehler, inkonsistente Daten und schlägt Korrekturen vor."
            />
            <FeatureCard
              icon={<Globe className="h-5 w-5 text-primary" />}
              title="Schweizer Formate"
              description="Automatische Erkennung und Korrektur von AHV, Telefon, PLZ und mehr."
            />
            <FeatureCard
              icon={<Server className="h-5 w-5 text-primary" />}
              title="Hohe Performance"
              description="Optimiert für große Datensätze mit 4000+ Zeilen ohne Verzögerung."
            />
            <FeatureCard
              icon={<Shield className="h-5 w-5 text-primary" />}
              title="DSG/GDPR-Konform"
              description="Erfüllt Schweizer Datenschutzgesetz und EU-DSGVO durch lokale Verarbeitung."
            />
          </div>

          {/* Technical Info */}
          <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-4">
            <h4 className="font-medium text-foreground mb-2">Technische Details</h4>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                Verarbeitung im Browser-RAM (kein Speichern auf Festplatte)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                Optimierte Algorithmen mit O(1) Lookup-Strukturen
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                Non-Blocking UI für große Dateien (Web Worker)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
                Keine externen API-Aufrufe für Datenanalyse
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Lokale Verarbeitungsregeln
              </CardTitle>
              <CardDescription>
                Übersicht aller im Code definierten Muster und Auto-Korrekturen (read-only)
              </CardDescription>
            </div>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              Nur Ansicht
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={['swiss', 'cleanup', 'consistency']} className="w-full">
            {/* Swiss Formats */}
            <AccordionItem value="swiss">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span>Schweizer Formate</span>
                  <Badge variant="outline" className="ml-2">{LOCAL_PATTERNS.swissFormats.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <PatternTable patterns={LOCAL_PATTERNS.swissFormats} />
              </AccordionContent>
            </AccordionItem>

            {/* Data Cleanup */}
            <AccordionItem value="cleanup">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-primary" />
                  <span>Datenbereinigung</span>
                  <Badge variant="outline" className="ml-2">{LOCAL_PATTERNS.dataCleanup.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <PatternTable patterns={LOCAL_PATTERNS.dataCleanup} />
              </AccordionContent>
            </AccordionItem>

            {/* Consistency Checks */}
            <AccordionItem value="consistency">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span>Konsistenzprüfungen</span>
                  <Badge variant="outline" className="ml-2">{LOCAL_PATTERNS.consistencyChecks.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <PatternTable patterns={LOCAL_PATTERNS.consistencyChecks} />
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Diese Regeln sind im Quellcode definiert und können nicht über die Oberfläche geändert werden.
              Sie werden automatisch bei der Datenvalidierung angewendet.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface PatternInfo {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  pattern: string;
  description: string;
  example: string;
  autoFix: string;
}

function PatternTable({ patterns }: { patterns: PatternInfo[] }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">Regel</TableHead>
            <TableHead className="w-[200px]">Muster / Format</TableHead>
            <TableHead>Auto-Korrektur</TableHead>
            <TableHead className="w-[150px]">Beispiel</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {patterns.map((p) => {
            const Icon = p.icon;
            return (
              <TableRow key={p.name}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.description}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-muted px-1.5 py-0.5 rounded break-all">
                    {p.pattern}
                  </code>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.autoFix}
                </TableCell>
                <TableCell>
                  <code className="text-xs bg-green-50 text-green-700 px-2 py-1 rounded">
                    {p.example}
                  </code>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="border rounded-lg p-4 bg-card">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className="font-medium">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
