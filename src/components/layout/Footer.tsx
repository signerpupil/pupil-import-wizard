import { useState } from 'react';
import { ImpressumDialog } from '@/components/legal/ImpressumDialog';
import { DatenschutzDialog } from '@/components/legal/DatenschutzDialog';
import { CookiePolicyDialog } from '@/components/legal/CookiePolicyDialog';

export function Footer() {
  const [impressumOpen, setImpressumOpen] = useState(false);
  const [datenschutzOpen, setDatenschutzOpen] = useState(false);
  const [cookiePolicyOpen, setCookiePolicyOpen] = useState(false);

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
                onClick={() => setCookiePolicyOpen(true)}
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Cookie-Policy
              </button>
            </div>
            <div className="text-xs text-muted-foreground/70 text-center sm:text-right">
              Gehostet auf{' '}
              <a
                href="https://lovable.dev"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline"
              >
                Lovable.dev
              </a>
            </div>
          </div>
        </div>
      </footer>

      <ImpressumDialog open={impressumOpen} onOpenChange={setImpressumOpen} />
      <DatenschutzDialog open={datenschutzOpen} onOpenChange={setDatenschutzOpen} />
      <CookiePolicyDialog open={cookiePolicyOpen} onOpenChange={setCookiePolicyOpen} />
    </>
  );
}
