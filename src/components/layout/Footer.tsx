import { useEffect, useState } from 'react';
import { BookOpen, Send, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { getAnalyticsMode, setAnalyticsMode, type AnalyticsMode } from '@/lib/analytics';
import { pendingCount, subscribeToQueueChanges, flushPendingToSupabase } from '@/lib/pendingTelemetry';
import { PendingTelemetryDialog } from '@/components/analytics/PendingTelemetryDialog';
import { toast } from '@/hooks/use-toast';

export function Footer() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AnalyticsMode>('auto');
  const [count, setCount] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setMode(getAnalyticsMode());
    setCount(pendingCount());
    const unsubQueue = subscribeToQueueChanges(() => setCount(pendingCount()));
    const onModeChange = () => setMode(getAnalyticsMode());
    window.addEventListener('analytics-mode-changed', onModeChange);
    return () => {
      unsubQueue();
      window.removeEventListener('analytics-mode-changed', onModeChange);
    };
  }, []);

  const handleModeChange = (value: string) => {
    const next = value as AnalyticsMode;
    setAnalyticsMode(next);
    setMode(next);
    setCount(pendingCount());
  };

  const handleQuickSend = async () => {
    setSending(true);
    try {
      const sent = await flushPendingToSupabase();
      toast({
        title: 'Erfolgreich übermittelt',
        description: `${sent} anonyme Ereignisse gesendet. Vielen Dank!`,
      });
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

  return (
    <footer className="w-full border-t bg-muted/30 py-4 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-3 text-sm text-muted-foreground">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={() => navigate('/docs')}
                className="hover:text-foreground transition-colors underline-offset-4 hover:underline inline-flex items-center gap-1"
              >
                <BookOpen className="h-3 w-3" />
                Hilfe & FAQ
              </button>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="analytics-mode" className="text-xs whitespace-nowrap">
                Anonyme Nutzungsstatistik
              </Label>
              <Select value={mode} onValueChange={handleModeChange}>
                <SelectTrigger id="analytics-mode" className="h-8 w-[180px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto" className="text-xs">Automatisch senden</SelectItem>
                  <SelectItem value="manual" className="text-xs">Manuell senden</SelectItem>
                  <SelectItem value="off" className="text-xs">Deaktiviert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {mode === 'manual' && count > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 border-t pt-3">
              <Badge variant="secondary" className="text-xs">
                {count} anonyme Ereignisse bereit zum Senden
              </Badge>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                  className="h-7 gap-1 text-xs"
                >
                  <Eye className="h-3 w-3" />
                  Vorschau
                </Button>
                <Button
                  size="sm"
                  onClick={handleQuickSend}
                  disabled={sending}
                  className="h-7 gap-1 text-xs"
                >
                  <Send className="h-3 w-3" />
                  {sending ? 'Sende…' : 'Jetzt senden'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      <PendingTelemetryDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </footer>
  );
}
