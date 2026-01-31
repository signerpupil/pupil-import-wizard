import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield } from 'lucide-react';

interface DatenschutzDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DatenschutzDialog({ open, onOpenChange }: DatenschutzDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-pupil-teal" />
            Datenschutzerklärung
          </DialogTitle>
          <DialogDescription>
            Informationen zur Verarbeitung Ihrer personenbezogenen Daten
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <section>
              <h3 className="font-semibold text-foreground mb-2">1. Verantwortliche Stelle</h3>
              <p className="text-muted-foreground">
                Pupil AG<br />
                Lerchenfeldstrasse 3<br />
                9014 St. Gallen<br />
                Schweiz<br /><br />
                Website: <a href="https://www.pupil.ch" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">www.pupil.ch</a><br />
                E-Mail: <a href="mailto:info@pupil.ch" className="underline hover:text-foreground">info@pupil.ch</a><br />
                Datenschutzanfragen: <a href="mailto:datenschutz@pupil.ch" className="underline hover:text-foreground">datenschutz@pupil.ch</a>
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">2. Unsere Grundsätze</h3>
              <p className="text-muted-foreground">
                Wir nehmen den Schutz persönlicher Daten sehr ernst. Folgende Grundsätze gelten:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li><strong>Server in der Schweiz:</strong> Daten werden in der Schweiz gespeichert und verarbeitet (DSGVO-konform)</li>
                <li><strong>Privacy by Design:</strong> Keine unnötigen Daten werden erhoben</li>
                <li><strong>Keine Datenweitergabe:</strong> Ihre Daten werden nicht an Dritte verkauft oder für Werbung verwendet</li>
                <li><strong>Kein Surfverhalten-Tracking:</strong> Wir zeichnen Ihr Surfverhalten nicht auf</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">3. Lokale Datenverarbeitung im Import Wizard</h3>
              <p className="text-muted-foreground">
                <strong>Ihre Dateiinhalte werden ausschliesslich lokal in Ihrem Browser verarbeitet.</strong> 
                Die von Ihnen hochgeladenen Dateien (z.B. Excel, CSV) werden nicht auf unsere Server 
                übertragen. Die gesamte Datenverarbeitung, einschliesslich der automatischen Musteranalyse 
                zur Erkennung von Formatierungsfehlern, erfolgt vollständig in Ihrem Browser.
              </p>
              <p className="text-muted-foreground mt-2">
                Nach dem Schliessen des Browsers oder Neuladen der Seite werden alle importierten 
                Daten automatisch und unwiderruflich aus dem Arbeitsspeicher gelöscht.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">4. Lokale Speicherung (localStorage)</h3>
              <p className="text-muted-foreground">
                Diese Anwendung verwendet <strong>keine Cookies</strong>. Lediglich der lokale 
                Speicher (localStorage) des Browsers wird für folgende Zwecke genutzt:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Speicherung des Korrektur-Gedächtnisses (gelernte Korrekturen)</li>
                <li>Speicherung Ihrer Einstellungen</li>
                <li>Authentifizierungs-Token für den Admin-Bereich (technisch notwendig)</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Diese Daten werden ausschliesslich lokal in Ihrem Browser gespeichert und 
                nicht an Server übertragen. Sie können diese Daten jederzeit über die 
                Browser-Einstellungen löschen.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">5. Bereitstellung der Anwendung</h3>
              <p className="text-muted-foreground">
                Bei jedem Aufruf der Anwendung können folgende technische Daten erfasst werden:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>IP-Adresse</li>
                <li>Zugriffszeitpunkt (Datum und Uhrzeit)</li>
                <li>Browser-Typ und Version</li>
                <li>Betriebssystem</li>
                <li>Informationen zum verwendeten Gerät</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Diese Daten sind technisch erforderlich, um die Anwendung bereitzustellen und 
                die Sicherheit der Systeme zu gewährleisten. Eine Speicherung dieser Daten 
                zusammen mit anderen personenbezogenen Daten findet nicht statt.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">6. Datensicherheit</h3>
              <p className="text-muted-foreground">
                Wir haben geeignete technische und organisatorische Sicherheitsmassnahmen getroffen, 
                um die bei uns gespeicherten Daten gegen unbeabsichtigte, rechtswidrige oder sonst 
                unberechtigte Zugriffe, Manipulation, Löschung, Veränderung, Weitergabe, Nutzung 
                oder Verlust zu schützen. Unsere Sicherheitsmassnahmen werden fortlaufend der 
                technologischen Entwicklung angepasst.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">7. Ihre Rechte</h3>
              <p className="text-muted-foreground">
                Sie haben das Recht auf:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Auskunft über Ihre gespeicherten Daten</li>
                <li>Berichtigung unrichtiger Daten</li>
                <li>Löschung Ihrer Daten</li>
                <li>Einschränkung der Verarbeitung</li>
                <li>Datenübertragbarkeit</li>
                <li>Widerspruch gegen die Verarbeitung</li>
                <li>Widerruf erteilter Einwilligungen</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Falls Sie zum Datenschutz Fragen haben, Auskünfte einholen oder eine Löschung 
                Ihrer Daten beantragen möchten, wenden Sie sich bitte an{' '}
                <a href="mailto:datenschutz@pupil.ch" className="underline hover:text-foreground">
                  datenschutz@pupil.ch
                </a>.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">8. Rechtsgrundlagen</h3>
              <p className="text-muted-foreground">
                Diese Datenschutzerklärung orientiert sich am schweizerischen Datenschutzgesetz (DSG) 
                sowie an der EU-Datenschutz-Grundverordnung (DSGVO). Die Verarbeitung personenbezogener 
                Daten erfolgt auf Grundlage von Art. 6 Abs. 1 DSGVO (Einwilligung, Vertragserfüllung, 
                rechtliche Verpflichtung oder berechtigtes Interesse).
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">9. Änderungen</h3>
              <p className="text-muted-foreground">
                Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen, um sie 
                an geänderte Rechtslagen oder bei Änderungen unserer Dienste anzupassen.
              </p>
            </section>

            <section className="text-xs text-muted-foreground/70 pt-4 border-t">
              <p>
                Stand: Januar 2026<br />
                Ausführliche Datenschutzerklärung:{' '}
                <a 
                  href="https://www.pupil.ch/datenschutz" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  www.pupil.ch/datenschutz
                </a>
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
