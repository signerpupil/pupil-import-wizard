import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';

interface IframeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
}

export function IframeDialog({ open, onOpenChange, title, url }: IframeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 flex flex-col">
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base">{title}</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            className="mr-8 gap-1 hidden"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            In neuem Tab öffnen
          </Button>
        </DialogHeader>
        <iframe
          src={url}
          title={title}
          className="flex-1 w-full border-0 bg-background"
          allow="clipboard-write; fullscreen"
        />
        <p className="px-4 py-2 text-xs text-muted-foreground border-t">
          Wird die Seite nicht angezeigt?{' '}
          <a href={url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
            Direkt öffnen
          </a>
        </p>
      </DialogContent>
    </Dialog>
  );
}
