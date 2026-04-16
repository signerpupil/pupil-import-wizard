import { useState } from 'react';
import { AlertCircle, AlertTriangle, Info, ChevronDown, ChevronUp, CheckCircle2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { PreflightFinding, PreflightResult } from '@/lib/preflightCheck';

interface PreflightCheckCardProps {
  result: PreflightResult;
}

const SEVERITY_CONFIG = {
  error: {
    Icon: AlertCircle,
    iconClass: 'text-destructive',
    badgeVariant: 'destructive' as const,
    borderClass: 'border-destructive/40',
    bgClass: 'bg-destructive/5',
    label: 'Blockierend',
  },
  warning: {
    Icon: AlertTriangle,
    iconClass: 'text-amber-600 dark:text-amber-500',
    badgeVariant: 'secondary' as const,
    borderClass: 'border-amber-400/40',
    bgClass: 'bg-amber-50/50 dark:bg-amber-950/20',
    label: 'Warnung',
  },
  info: {
    Icon: Info,
    iconClass: 'text-pupil-teal',
    badgeVariant: 'outline' as const,
    borderClass: 'border-pupil-teal/40',
    bgClass: 'bg-pupil-teal/5',
    label: 'Hinweis',
  },
};

function FindingItem({ finding }: { finding: PreflightFinding }) {
  const config = SEVERITY_CONFIG[finding.severity];
  const { Icon } = config;
  const [open, setOpen] = useState(finding.severity === 'error');
  const hasDetails = (finding.affected && finding.affected.length > 0) || finding.hint;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={`rounded-lg border ${config.borderClass} ${config.bgClass} overflow-hidden`}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-start gap-3 p-3 text-left hover:bg-muted/30 transition-colors"
          >
            <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${config.iconClass}`} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-foreground">{finding.title}</span>
                <Badge variant={config.badgeVariant} className="text-xs">
                  {config.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{finding.message}</p>
            </div>
            {hasDetails && (
              <span className="shrink-0 mt-0.5">
                {open ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </span>
            )}
          </button>
        </CollapsibleTrigger>
        {hasDetails && (
          <CollapsibleContent>
            <div className="px-3 pb-3 pl-11 space-y-2">
              {finding.affected && finding.affected.length > 0 && (
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
                    Betroffen
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {finding.affected.map((a) => (
                      <code
                        key={a}
                        className="text-xs px-2 py-0.5 rounded bg-background border border-border font-mono"
                      >
                        {a}
                      </code>
                    ))}
                  </div>
                </div>
              )}
              {finding.hint && (
                <div className="text-xs text-muted-foreground italic border-l-2 border-pupil-teal/40 pl-2">
                  💡 {finding.hint}
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}
      </div>
    </Collapsible>
  );
}

export function PreflightCheckCard({ result }: PreflightCheckCardProps) {
  const { findings, hasErrors, hasWarnings } = result;

  // "Alles ok"-State nur zeigen, wenn aktiv geprüft wurde (mind. 1 Spalte)
  if (findings.length === 0) {
    return (
      <Card className="border-pupil-success/30 bg-pupil-success/5">
        <CardContent className="py-3 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5 text-pupil-success shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Pre-Flight-Check bestanden</p>
            <p className="text-xs text-muted-foreground">
              Encoding, Trennzeichen und Pflichtspalten sehen gut aus.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const errorCount = findings.filter((f) => f.severity === 'error').length;
  const warningCount = findings.filter((f) => f.severity === 'warning').length;

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-sm">Pre-Flight-Check</h3>
          <div className="flex items-center gap-1.5">
            {errorCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {errorCount} blockierend
              </Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {warningCount} Warnung{warningCount > 1 ? 'en' : ''}
              </Badge>
            )}
          </div>
        </div>

        {hasErrors && (
          <p className="text-xs text-muted-foreground">
            Bitte zuerst die blockierenden Probleme beheben (z.B. Datei neu exportieren), bevor es weitergeht.
          </p>
        )}
        {!hasErrors && hasWarnings && (
          <p className="text-xs text-muted-foreground">
            Die Warnungen sind nicht blockierend, sollten aber vor dem Export geprüft werden.
          </p>
        )}

        <div className="space-y-2">
          {findings.map((f, idx) => (
            <FindingItem key={idx} finding={f} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
