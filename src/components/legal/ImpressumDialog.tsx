import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';

interface ImpressumDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ImpressumDialog({ open, onOpenChange }: ImpressumDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Impressum</DialogTitle>
          <DialogDescription>
            Angaben gemäss Schweizer Recht
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-6 text-sm">
            <Alert className="border-amber-500/30 bg-amber-500/5">
              <Info className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-700 dark:text-amber-400">
                <strong>Hinweis:</strong> Die nachfolgenden Angaben sind Platzhalter und müssen 
                vom Betreiber mit den korrekten Unternehmensdaten ersetzt werden.
              </AlertDescription>
            </Alert>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Kontaktadresse</h3>
              <p className="text-muted-foreground">
                [Firmenname]<br />
                [Strasse und Hausnummer]<br />
                [PLZ Ort]<br />
                Schweiz
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Kontakt</h3>
              <p className="text-muted-foreground">
                E-Mail: [E-Mail-Adresse]<br />
                Telefon: [Telefonnummer]
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Vertretungsberechtigte Person(en)</h3>
              <p className="text-muted-foreground">
                [Name des/der Vertretungsberechtigten]
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Handelsregistereintrag</h3>
              <p className="text-muted-foreground">
                Eingetragener Firmenname: [Firmenname]<br />
                Handelsregister-Nr.: [CHE-XXX.XXX.XXX]<br />
                Handelsregisteramt: [Kanton]
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Mehrwertsteuernummer</h3>
              <p className="text-muted-foreground">
                CHE-[XXX.XXX.XXX] MWST
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Haftungsausschluss</h3>
              <p className="text-muted-foreground">
                Der Autor übernimmt keine Gewähr für die Richtigkeit, Genauigkeit, Aktualität, 
                Zuverlässigkeit und Vollständigkeit der Informationen.
              </p>
              <p className="text-muted-foreground mt-2">
                Haftungsansprüche gegen den Autor wegen Schäden materieller oder immaterieller Art, 
                die aus dem Zugriff oder der Nutzung bzw. Nichtnutzung der veröffentlichten 
                Informationen, durch Missbrauch der Verbindung oder durch technische Störungen 
                entstanden sind, werden ausgeschlossen.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Urheberrechte</h3>
              <p className="text-muted-foreground">
                Die Urheber- und alle anderen Rechte an Inhalten, Bildern, Fotos oder anderen 
                Dateien auf dieser Website gehören ausschliesslich dem Betreiber oder den 
                speziell genannten Rechteinhabern. Für die Reproduktion jeglicher Elemente ist 
                die schriftliche Zustimmung des Urheberrechtsträgers im Voraus einzuholen.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Hosting</h3>
              <p className="text-muted-foreground">
                Diese Anwendung wird auf GitHub Pages gehostet.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
