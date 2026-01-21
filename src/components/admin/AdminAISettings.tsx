import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Cpu, Globe, CheckCircle2, Server, Lock } from 'lucide-react';

export function AdminAISettings() {
  return (
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

        {/* Supported Formats */}
        <div className="border rounded-lg p-4">
          <h4 className="font-medium mb-3">Unterstützte Auto-Korrekturen</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            <FormatItem label="AHV-Nummer" example="756.1234.5678.97" />
            <FormatItem label="Telefon (Mobile)" example="+41 79 123 45 67" />
            <FormatItem label="Telefon (Festnetz)" example="+41 44 123 45 67" />
            <FormatItem label="PLZ" example="8000" />
            <FormatItem label="E-Mail" example="name@example.ch" />
            <FormatItem label="Geschlecht" example="M / W / D" />
          </div>
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
              Non-Blocking UI für große Dateien
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="h-3 w-3 text-green-600" />
              Keine externen API-Aufrufe für Datenanalyse
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
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

function FormatItem({ label, example }: { label: string; example: string }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <code className="bg-muted px-2 py-0.5 rounded text-xs">{example}</code>
    </div>
  );
}
