import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

const TUTORIAL_URL = 'https://tutorial-schulverwaltung.lovable.app';

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base">Interaktives Tutorial – Schulverwaltung</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            className="mr-8 gap-1 hidden"
            onClick={() => window.open(TUTORIAL_URL, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            In neuem Tab öffnen
          </Button>
        </DialogHeader>
        <iframe
          src={TUTORIAL_URL}
          title="Interaktives Tutorial Schulverwaltung"
          className="flex-1 w-full border-0 bg-background"
          allow="clipboard-write; fullscreen"
        />
        <p className="px-4 py-2 text-xs text-muted-foreground border-t">
          Wird das Tutorial nicht angezeigt?{' '}
          <a href={TUTORIAL_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            Direkt öffnen
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}
