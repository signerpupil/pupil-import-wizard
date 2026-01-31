import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

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
            <section>
              <h3 className="font-semibold text-foreground mb-2">Kontaktadresse</h3>
              <p className="text-muted-foreground">
                Pupil AG<br />
                Lerchenfeldstrasse 3<br />
                9014 St. Gallen<br />
                Schweiz
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Kontakt</h3>
              <p className="text-muted-foreground">
                Telefon: 071 511 96 60<br />
                E-Mail: <a href="mailto:info@pupil.ch" className="underline hover:text-foreground">info@pupil.ch</a><br />
                Website: <a href="https://www.pupil.ch" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">www.pupil.ch</a>
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Vertretungsberechtigte Personen</h3>
              <p className="text-muted-foreground">
                Alexander Fust von Mosnang, in Wil SG, als VRP<br />
                Arber Wagner von Wil SG, in Zuzwil SG, als CEO
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Handelsregistereintrag</h3>
              <p className="text-muted-foreground">
                Rechtsform: Aktiengesellschaft (AG)<br />
                UID: CHE-333.777.723<br />
                CH-ID: CH-320-3085809-5<br />
                EHRA-ID: 1380319<br />
                <a 
                  href="https://sg.chregister.ch/cr-portal/auszug/auszug.xhtml?uid=CHE-333.777.723" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Link zum Handelsregister
                </a>
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Allgemeine Bedingungen</h3>
              <p className="text-muted-foreground">
                <a 
                  href="https://www.pupil.ch/_files/ugd/bb4bd2_94e1daa52703452687cdc37f6f4a038c.pdf" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Allgemeine Geschäftsbedingungen (PDF)
                </a><br />
                <a 
                  href="https://www.pupil.ch/_files/ugd/bb4bd2_806866bde41c48279801cf1dbd8a6a52.pdf" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="underline hover:text-foreground"
                >
                  Nutzungsbedingungen (PDF)
                </a>
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Haftungsausschluss</h3>
              <p className="text-muted-foreground">
                Die Pupil AG übernimmt keine Haftung bezüglich übermittelter Inhalte oder der 
                Einhaltung von Datenschutzbestimmungen durch die Nutzerinnen und Nutzer. 
                Ebenso ist die Haftung für den Verlust von Daten oder deren Kenntnisnahme 
                und Nutzung durch Dritte, soweit gesetzlich zulässig, ausgeschlossen.
              </p>
              <p className="text-muted-foreground mt-2">
                Haftungsansprüche wegen Schäden materieller oder immaterieller Art, 
                die aus dem Zugriff oder der Nutzung bzw. Nichtnutzung der veröffentlichten 
                Informationen, durch Missbrauch der Verbindung oder durch technische Störungen 
                entstanden sind, werden ausgeschlossen.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-foreground mb-2">Urheberrechte</h3>
              <p className="text-muted-foreground">
                Die Urheber- und alle anderen Rechte an Inhalten, Bildern, Fotos oder anderen 
                Dateien auf dieser Website gehören ausschliesslich der Pupil AG oder den 
                speziell genannten Rechteinhabern. Für die Reproduktion jeglicher Elemente ist 
                die schriftliche Zustimmung des Urheberrechtsträgers im Voraus einzuholen.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
