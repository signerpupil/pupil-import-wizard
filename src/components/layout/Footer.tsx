import { useState } from 'react';
import { Download, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImpressumDialog } from '@/components/legal/ImpressumDialog';
import { DatenschutzDialog } from '@/components/legal/DatenschutzDialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function Footer() {
  const [impressumOpen, setImpressumOpen] = useState(false);
  const [datenschutzOpen, setDatenschutzOpen] = useState(false);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const navigate = useNavigate();

  // Dynamic URL for standalone HTML file (works on Lovable, GitHub Pages, and localhost)
  const getStandaloneDownloadUrl = () => {
    const host = window.location.hostname;
    
    // GitHub Pages (with subdirectory)
    if (host.includes('github.io')) {
      return `${window.location.origin}/pupil-import-wizard/pupil-import-wizard-offline.html`;
    }
    
    // Lovable Publishing or local development
    return `${window.location.origin}/pupil-import-wizard-offline.html`;
  };

  const standaloneDownloadUrl = getStandaloneDownloadUrl();

  return (
    <>
      <footer className="w-full border-t bg-muted/30 py-4 mt-auto">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => setImpressumOpen(true)}
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Impressum
              </button>
              <span className="hidden sm:inline text-muted-foreground/50">|</span>
              <button
                onClick={() => setDatenschutzOpen(true)}
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Datenschutzerklärung
              </button>
              <span className="hidden sm:inline text-muted-foreground/50">|</span>
              <button
                onClick={() => navigate('/docs')}
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline inline-flex items-center gap-1"
              >
                <BookOpen className="h-3 w-3" />
                Hilfe & FAQ
              </button>
              {/* Download temporarily disabled
              <span className="hidden sm:inline text-muted-foreground/50">|</span>
              <button
                onClick={() => setDownloadDialogOpen(true)}
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline inline-flex items-center gap-1"
              >
                <Download className="h-3 w-3" />
                Offline-Version
              </button>
              */}
            </div>
            <div className="text-xs text-muted-foreground/70 text-center sm:text-right">
              © {new Date().getFullYear()} PUPIL
            </div>
          </div>
        </div>
      </footer>

      <ImpressumDialog open={impressumOpen} onOpenChange={setImpressumOpen} />
      <DatenschutzDialog open={datenschutzOpen} onOpenChange={setDatenschutzOpen} />
      
      {/* Offline Download Dialog */}
      <Dialog open={downloadDialogOpen} onOpenChange={setDownloadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5 text-primary" />
              Offline-Version herunterladen
            </DialogTitle>
            <DialogDescription>
              Laden Sie die Standalone-Version herunter, um den Import Wizard offline zu nutzen.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <h4 className="font-medium text-sm">Was ist enthalten?</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Datei-Upload (CSV & Excel)</li>
                <li>✓ Spalten-Prüfung</li>
                <li>✓ Datenvalidierung & Korrektur</li>
                <li>✓ Export als korrigierte Datei</li>
                <li>✓ Korrektur-Gedächtnis (lokal)</li>
              </ul>
            </div>
            
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-2">
              <h4 className="font-medium text-sm text-amber-900">Hinweis</h4>
              <p className="text-sm text-amber-800">
                Die Offline-Version funktioniert ohne Internetverbindung.
              </p>
            </div>
            
            <Button asChild className="w-full">
              <a 
                href={standaloneDownloadUrl} 
                download="pupil-import-wizard.html"
                onClick={() => setDownloadDialogOpen(false)}
              >
                <Download className="h-4 w-4 mr-2" />
                HTML-Datei herunterladen
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
