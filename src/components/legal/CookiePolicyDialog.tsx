import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cookie, Info } from 'lucide-react';

interface CookiePolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CookiePolicyDialog({ open, onOpenChange }: CookiePolicyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cookie className="h-5 w-5 text-pupil-teal" />
            Cookie-Policy
          </DialogTitle>
          <DialogDescription>
            Informationen über die Verwendung von Cookies
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <Info className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                <strong>Hinweis:</strong> Diese Cookie-Policy ist eine Vorlage und muss 
                vom Betreiber für den konkreten Anwendungsfall angepasst werden.
              </AlertDescription>
            </Alert>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Was sind Cookies?</h3>
              <p className="text-muted-foreground">
                Cookies sind kleine Textdateien, die von Websites auf Ihrem Gerät gespeichert 
                werden. Sie dienen dazu, die Website funktionsfähig zu machen, ihre Nutzung 
                zu analysieren und personalisierte Inhalte anzuzeigen.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Welche Cookies verwenden wir?</h3>
              
              <div className="mt-4 space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-foreground">Technisch notwendige Cookies</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    Diese Cookies sind für den Betrieb der Website erforderlich.
                  </p>
                  <table className="w-full mt-3 text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-medium">Name</th>
                        <th className="text-left py-2 font-medium">Zweck</th>
                        <th className="text-left py-2 font-medium">Dauer</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="py-2 text-muted-foreground">cookie-consent-status</td>
                        <td className="py-2 text-muted-foreground">Speichert Ihre Cookie-Einwilligung</td>
                        <td className="py-2 text-muted-foreground">Dauerhaft</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="border rounded-lg p-4">
                  <h4 className="font-medium text-foreground">Analytics-Cookies</h4>
                  <p className="text-muted-foreground text-xs mt-1">
                    Diese Cookies werden nur mit Ihrer Einwilligung gesetzt und dienen der 
                    Analyse der Website-Nutzung.
                  </p>
                  <p className="text-muted-foreground text-xs mt-2">
                    Die Hosting-Plattform Lovable.dev kann grundlegende Nutzungsstatistiken 
                    erfassen, um den Dienst zu verbessern.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Rechtsgrundlagen</h3>
              <p className="text-muted-foreground">
                <strong>Technisch notwendige Cookies:</strong> Die Verarbeitung erfolgt auf 
                Grundlage unseres berechtigten Interesses (Art. 6 Abs. 1 lit. f DSGVO) an 
                der Bereitstellung einer funktionsfähigen Website.
              </p>
              <p className="text-muted-foreground mt-2">
                <strong>Analytics-Cookies:</strong> Die Verarbeitung erfolgt nur mit Ihrer 
                ausdrücklichen Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Ihre Wahlmöglichkeiten</h3>
              <p className="text-muted-foreground">
                Bei Ihrem ersten Besuch werden Sie gefragt, ob Sie Analytics-Cookies zulassen 
                möchten. Sie können:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li><strong>Alle akzeptieren:</strong> Technisch notwendige und Analytics-Cookies werden gesetzt</li>
                <li><strong>Nur notwendige:</strong> Nur technisch erforderliche Cookies werden gesetzt</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Sie können Ihre Entscheidung jederzeit ändern, indem Sie die Cookies in Ihren 
                Browser-Einstellungen löschen. Beim nächsten Besuch werden Sie erneut gefragt.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Cookies in Ihrem Browser verwalten</h3>
              <p className="text-muted-foreground">
                Sie können Cookies auch über Ihre Browser-Einstellungen verwalten oder löschen. 
                Die Vorgehensweise unterscheidet sich je nach Browser:
              </p>
              <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                <li>Chrome: Einstellungen → Datenschutz und Sicherheit → Cookies</li>
                <li>Firefox: Einstellungen → Datenschutz & Sicherheit → Cookies</li>
                <li>Safari: Einstellungen → Datenschutz → Cookies</li>
                <li>Edge: Einstellungen → Datenschutz → Cookies</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Hinweis zur lokalen Datenverarbeitung</h3>
              <p className="text-muted-foreground">
                <strong>Wichtig:</strong> Die von Ihnen hochgeladenen Dateiinhalte werden 
                ausschliesslich lokal in Ihrem Browser verarbeitet und nicht in Cookies 
                gespeichert. Diese Daten werden niemals auf einen Server übertragen und 
                sind nach dem Schliessen des Browsers unwiderruflich gelöscht.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Kontakt</h3>
              <p className="text-muted-foreground">
                Bei Fragen zu dieser Cookie-Policy wenden Sie sich bitte an:<br />
                [E-Mail-Adresse des Betreibers]
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
