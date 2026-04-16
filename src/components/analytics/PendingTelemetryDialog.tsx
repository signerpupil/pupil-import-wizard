import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Send, Trash2, X } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import {
  getPendingEvents,
  clearPendingEvents,
  removePendingEvent,
  flushPendingToSupabase,
  subscribeToQueueChanges,
  type PendingEvent,
} from '@/lib/pendingTelemetry';

interface PendingTelemetryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PendingTelemetryDialog({ open, onOpenChange }: PendingTelemetryDialogProps) {
  const [events, setEvents] = useState<PendingEvent[]>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEvents(getPendingEvents());
    return subscribeToQueueChanges(() => setEvents(getPendingEvents()));
  }, [open]);

  // Summary by event type
  const summary = events.reduce<Record<string, number>>((acc, e) => {
    acc[e.row.event_type] = (acc[e.row.event_type] ?? 0) + 1;
    return acc;
  }, {});

  const handleSend = async () => {
    setSending(true);
    try {
      const sent = await flushPendingToSupabase();
      toast({
        title: 'Erfolgreich übermittelt',
        description: `${sent} anonyme Ereignisse gesendet. Vielen Dank!`,
      });
      onOpenChange(false);
    } catch {
      toast({
        title: 'Übermittlung fehlgeschlagen',
        description: 'Bitte später erneut versuchen.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const handleDiscard = () => {
    clearPendingEvents();
    toast({ title: 'Alle gepufferten Ereignisse verworfen.' });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-pupil-teal" />
            Anonyme Nutzungsdaten – Vorschau
          </DialogTitle>
          <DialogDescription>
            Sie sehen hier exakt, was beim Senden an die Server übermittelt wird.
          </DialogDescription>
        </DialogHeader>

        <Alert>
          <AlertDescription className="text-xs">
            Diese Daten enthalten <strong>ausschliesslich anonymisierte Maskenzeichen</strong>{' '}
            (z.B. <code>AAA@AAA.AA</code>) und Häufigkeitszähler – <strong>keine Personendaten</strong>,
            keine Namen, keine AHV-Nummern, keine Dateinamen.
          </AlertDescription>
        </Alert>

        {events.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            Keine gepufferten Ereignisse.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2 py-2">
              <Badge variant="secondary">{events.length} Ereignisse total</Badge>
              {Object.entries(summary).map(([type, n]) => (
                <Badge key={type} variant="outline">
                  {type}: {n}
                </Badge>
              ))}
            </div>

            <ScrollArea className="flex-1 min-h-[200px] max-h-[45vh] border rounded-md">
              <div className="p-3 space-y-2">
                {events.map((e) => (
                  <div key={e.id} className="border rounded-md p-2 bg-muted/30 text-xs">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px]">{e.row.event_type}</Badge>
                        {e.row.import_type && (
                          <span className="text-muted-foreground">{e.row.import_type}</span>
                        )}
                        {e.row.step_number != null && (
                          <span className="text-muted-foreground">Schritt {e.row.step_number}</span>
                        )}
                        <span className="text-muted-foreground/70">
                          {new Date(e.queued_at).toLocaleString('de-CH')}
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => removePendingEvent(e.id)}
                        title="Diesen Eintrag entfernen"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap break-all font-mono text-[11px] text-muted-foreground">
                      {JSON.stringify(e.row.payload, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter className="gap-2 flex-col sm:flex-row">
          <Button
            variant="outline"
            onClick={handleDiscard}
            disabled={events.length === 0 || sending}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Alle verwerfen
          </Button>
          <Button
            onClick={handleSend}
            disabled={events.length === 0 || sending}
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            {sending ? 'Sende…' : `Alle senden (${events.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
