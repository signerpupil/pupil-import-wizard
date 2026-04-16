import { History, X, RotateCcw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SessionMeta } from '@/lib/sessionStore';

interface ResumeSessionBannerProps {
  meta: SessionMeta;
  onResume: () => void;
  onDismiss: () => void;
}

const IMPORT_TYPE_LABELS: Record<string, string> = {
  schueler: 'Stammdaten',
  journal: 'Journal',
  foerderplaner: 'Förderplaner',
};

const STEP_LABELS = [
  'Import-Typ',
  'Datei-Upload',
  'Spalten-Check',
  'Validierung',
  'Export',
];

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'gerade eben';
  if (diffMin < 60) return `vor ${diffMin} Minute${diffMin === 1 ? '' : 'n'}`;
  const diffHours = Math.round(diffMin / 60);
  if (diffHours < 24) return `vor ${diffHours} Stunde${diffHours === 1 ? '' : 'n'}`;
  const diffDays = Math.round(diffHours / 24);
  return `vor ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`;
}

export function ResumeSessionBanner({ meta, onResume, onDismiss }: ResumeSessionBannerProps) {
  const importLabel = meta.importType ? IMPORT_TYPE_LABELS[meta.importType] ?? meta.importType : 'Import';
  const stepLabel = STEP_LABELS[meta.currentStep] ?? `Schritt ${meta.currentStep}`;

  return (
    <Card className="border-pupil-teal/40 bg-pupil-teal/5">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-pupil-teal/15 flex items-center justify-center shrink-0">
            <History className="h-5 w-5 text-pupil-teal" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm text-foreground">
                Letzte Sitzung wiederherstellen?
              </h3>
              <Badge variant="outline" className="text-xs">
                {formatRelativeTime(meta.savedAt)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {importLabel}-Import in <span className="font-medium text-foreground">{stepLabel}</span>
              {meta.fileName && (
                <>
                  {' · '}
                  <span className="font-mono text-xs">{meta.fileName}</span>
                  {meta.rowCount > 0 && (
                    <span className="text-xs"> ({meta.rowCount.toLocaleString('de-CH')} Zeilen)</span>
                  )}
                </>
              )}
              {meta.changeLogCount > 0 && (
                <>
                  {' · '}
                  <span>{meta.changeLogCount} Korrektur{meta.changeLogCount === 1 ? '' : 'en'}</span>
                </>
              )}
            </p>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Button size="sm" onClick={onResume} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Wiederherstellen
              </Button>
              <Button size="sm" variant="ghost" onClick={onDismiss} className="gap-1.5 text-muted-foreground">
                <X className="h-3.5 w-3.5" />
                Verwerfen und neu starten
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
