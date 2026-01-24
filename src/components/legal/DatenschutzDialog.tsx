import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Shield } from 'lucide-react';

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
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <Info className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                <strong>Hinweis:</strong> Diese Datenschutzerklärung ist eine Vorlage und muss 
                vom Betreiber für den konkreten Anwendungsfall angepasst werden.
              </AlertDescription>
            </Alert>

            <section>
              <h3 className="font-semibold text-foreground mb-2">1. Verantwortliche Stelle</h3>
              <p className="text-muted-foreground">
                [Firmenname]<br />
                [Adresse]<br />
                E-Mail: [E-Mail-Adresse]
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">2. Lokale Datenverarbeitung</h3>
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
              <h3 className="font-semibold text-foreground mb-2">3. Hosting und technische Infrastruktur</h3>
              <p className="text-muted-foreground">
                Diese Anwendung wird auf <strong>GitHub Pages</strong> gehostet – einem statischen 
                Hosting-Dienst von GitHub. GitHub kann grundlegende Nutzungsdaten zur Sicherstellung 
                des technischen Betriebs erfassen:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>IP-Adresse</li>
                <li>Zugriffszeitpunkt</li>
                <li>Browser-Typ und Version</li>
                <li>Betriebssystem</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Diese Daten sind technisch erforderlich, um die Anwendung bereitzustellen. 
                Weitere Informationen finden Sie in der{' '}
                <a 
                  href="https://docs.github.com/de/pages/getting-started-with-github-pages/about-github-pages#data-collection" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  GitHub Pages Dokumentation
                </a>.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">4. Lokale Speicherung</h3>
              <p className="text-muted-foreground">
                Diese Anwendung verwendet <strong>keine Cookies</strong>. Lediglich der lokale 
                Speicher (localStorage) des Browsers wird für folgende Zwecke genutzt:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Speicherung Ihrer Einstellungen (z.B. gewählte Sprache, Theme)</li>
                <li>Authentifizierungs-Token für den Admin-Bereich (technisch notwendig)</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Diese Daten werden ausschliesslich lokal in Ihrem Browser gespeichert und 
                nicht an Server übertragen. Sie können diese Daten jederzeit über die 
                Browser-Einstellungen löschen.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">5. Keine Weitergabe an Dritte</h3>
              <p className="text-muted-foreground">
                Die von Ihnen hochgeladenen Dateiinhalte werden zu keinem Zeitpunkt an Dritte 
                weitergegeben, da sie ausschliesslich lokal verarbeitet werden. Es erfolgt 
                keine Übermittlung an externe Dienste oder Server.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">6. Ihre Rechte</h3>
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
                Zur Ausübung Ihrer Rechte wenden Sie sich bitte an die oben genannte 
                verantwortliche Stelle.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">7. Beschwerderecht</h3>
              <p className="text-muted-foreground">
                Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde zu beschweren, 
                wenn Sie der Ansicht sind, dass die Verarbeitung Ihrer personenbezogenen Daten 
                gegen die DSGVO verstösst.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">8. Änderungen dieser Datenschutzerklärung</h3>
              <p className="text-muted-foreground">
                Wir behalten uns vor, diese Datenschutzerklärung bei Bedarf anzupassen, um sie 
                an geänderte Rechtslagen oder bei Änderungen unserer Dienste anzupassen.
              </p>
            </section>

            <section className="text-xs text-muted-foreground/70 pt-4 border-t">
              <p>Stand: Januar 2026</p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
