import { useState, useMemo, useCallback } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, UserCog, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import type { ValidationError, ParsedRow } from '@/types/importTypes';

export interface NameChangeEntry {
  error: ValidationError;
  changeType: string;
  fromName: string;
  fromRow: number;
  toName: string;
  studentName: string;
  fromStudentName: string;
  column: string;
}

interface NameChangeCardProps {
  entries: NameChangeEntry[];
  rows: ParsedRow[];
  onErrorCorrect: (rowIndex: number, column: string, value: string, correctionType?: 'manual' | 'bulk' | 'auto') => void;
  onBulkCorrect: (corrections: { row: number; column: string; value: string }[], correctionType?: 'bulk' | 'auto') => void;
}

const NAME_CHANGES_PER_PAGE = 5;

export function NameChangeCard({ entries, rows, onErrorCorrect, onBulkCorrect }: NameChangeCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [page, setPage] = useState(0);
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleEntryExpanded = (key: string) =>
    setExpandedEntries(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  const paginatedEntries = useMemo(() => {
    const start = page * NAME_CHANGES_PER_PAGE;
    return entries.slice(start, start + NAME_CHANGES_PER_PAGE);
  }, [entries, page]);

  const totalPages = Math.ceil(entries.length / NAME_CHANGES_PER_PAGE);

  const dismissEntry = useCallback((entry: NameChangeEntry) => {
    onErrorCorrect(entry.error.row, entry.error.column, entry.error.value, 'manual');
  }, [onErrorCorrect]);

  const dismissAll = useCallback(() => {
    const corrections = entries.map(e => ({
      row: e.error.row,
      column: e.error.column,
      value: e.error.value,
    }));
    onBulkCorrect(corrections, 'bulk');
    toast({
      title: 'Namenswechsel bestätigt',
      description: `${corrections.length} Fälle als geprüft markiert.`,
    });
  }, [entries, onBulkCorrect, toast]);

  if (entries.length === 0) return null;

  return (
    <Card className="border-pupil-warning/30 bg-pupil-warning/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <UserCog className="h-5 w-5 text-pupil-warning" />
            <CardTitle className="text-lg">Namenswechsel prüfen</CardTitle>
            <Badge variant="outline" className="text-pupil-warning border-pupil-warning/30">
              {entries.length} {entries.length === 1 ? 'Fall' : 'Fälle'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={dismissAll}
              className="gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              Alle als geprüft markieren
            </Button>
          </div>
        </div>
        <CardDescription>
          Eltern mit gleichem Vornamen, aber unterschiedlichem Nachnamen wurden gefunden. Bitte manuell prüfen – keine automatischen Korrekturen.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              {expanded ? (
                <><ChevronUp className="h-4 w-4" />Details ausblenden</>
              ) : (
                <><ChevronDown className="h-4 w-4" />Details anzeigen ({entries.length} Fälle)</>
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-3 space-y-2">
            {paginatedEntries.map((entry, idx) => {
              const entryKey = `${entry.error.row}:${entry.error.column}`;
              const isExpanded = expandedEntries.has(entryKey);
              const fromRow = rows[entry.fromRow - 2] ?? {};
              const toRow = rows[entry.error.row - 2] ?? {};
              const colPrefix = entry.column.replace(/Name$/, '');
              const vornameCol = `${colPrefix}Vorname`;
              const sharedVorname = fromRow[vornameCol] ?? toRow[vornameCol];
              const studentCols = ['S_ID', 'S_AHV', 'K_Name'];
              return (
                <div
                  key={`namechange-${entry.error.row}-${entry.error.column}-${idx}`}
                  className="bg-background rounded-lg border border-pupil-warning/20 overflow-hidden"
                >
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="font-mono text-xs shrink-0">{entry.column}</Badge>
                          <Badge variant="secondary" className="text-xs">{entry.changeType}</Badge>
                          {entry.fromStudentName && entry.fromStudentName !== entry.studentName ? (
                            <>
                              <span className="text-xs text-muted-foreground shrink-0">Zeile {entry.fromRow}:</span>
                              <span className="text-xs font-medium truncate">{entry.fromStudentName}</span>
                              <span className="text-xs text-muted-foreground">|</span>
                              <span className="text-xs text-muted-foreground shrink-0">Zeile {entry.error.row}:</span>
                              <span className="text-xs font-medium truncate">{entry.studentName}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-xs text-muted-foreground shrink-0">Schüler/in:</span>
                              <span className="text-xs font-medium truncate">{entry.studentName}</span>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm flex-wrap">
                          <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">{entry.fromName}</code>
                          <span className="text-muted-foreground">→</span>
                          <code className="px-1.5 py-0.5 bg-pupil-warning/10 rounded text-xs font-mono text-pupil-warning">{entry.toName}</code>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant={isExpanded ? 'default' : 'outline'}
                          onClick={(e) => { e.stopPropagation(); toggleEntryExpanded(entryKey); }}
                          className="gap-1.5"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          Details
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); dismissEntry(entry); }}
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                          title="Kein Namenswechsel – diesen Fall ignorieren und ausblenden"
                        >
                          <X className="h-3.5 w-3.5" />
                          Ignorieren
                        </Button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t bg-muted/20 p-3 space-y-3">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Einträge im Vergleich</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded-md border bg-muted/50 p-2.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">Bisheriger Eintrag</span>
                            <span className="text-muted-foreground text-[10px]">Zeile {entry.fromRow}</span>
                          </div>
                          <div className="space-y-1 border-t pt-1.5">
                            <div className="flex items-baseline gap-1">
                              <span className="text-muted-foreground w-14 shrink-0">Name:</span>
                              <span className="font-medium">{entry.fromName}</span>
                            </div>
                            {sharedVorname && (
                              <div className="flex items-baseline gap-1">
                                <span className="text-muted-foreground w-14 shrink-0">Vorname:</span>
                                <span className="font-medium">{String(sharedVorname)}</span>
                              </div>
                            )}
                            {studentCols.map(col => {
                              const val = fromRow[col];
                              if (!val) return null;
                              const label = col === 'S_ID' ? 'S_ID' : col === 'S_AHV' ? 'AHV' : col === 'K_Name' ? 'Klasse' : col;
                              return (
                                <div key={col} className="flex items-baseline gap-1">
                                  <span className="text-muted-foreground w-14 shrink-0">{label}:</span>
                                  <span className="font-medium">{String(val)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        <div className="rounded-md border border-pupil-warning/30 bg-pupil-warning/5 p-2.5 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-foreground">Neuer Eintrag</span>
                            <span className="text-muted-foreground text-[10px]">Zeile {entry.error.row}</span>
                          </div>
                          <div className="space-y-1 border-t pt-1.5">
                            <div className="flex items-baseline gap-1">
                              <span className="text-muted-foreground w-14 shrink-0">Name:</span>
                              <span className="font-bold text-pupil-warning">{entry.toName}</span>
                            </div>
                            {sharedVorname && (
                              <div className="flex items-baseline gap-1">
                                <span className="text-muted-foreground w-14 shrink-0">Vorname:</span>
                                <span className="font-medium">{String(sharedVorname)}</span>
                              </div>
                            )}
                            {studentCols.map(col => {
                              const val = toRow[col] ?? fromRow[col];
                              if (!val) return null;
                              const label = col === 'S_ID' ? 'S_ID' : col === 'S_AHV' ? 'AHV' : col === 'K_Name' ? 'Klasse' : col;
                              return (
                                <div key={col} className="flex items-baseline gap-1">
                                  <span className="text-muted-foreground w-14 shrink-0">{label}:</span>
                                  <span className="font-medium">{String(val)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onErrorCorrect(entry.error.row, entry.error.column, entry.fromName, 'manual');
                            toast({ title: 'Name übernommen', description: `«${entry.fromName}» wurde in Zeile ${entry.error.row} gesetzt.` });
                          }}
                          className="gap-1.5 text-xs"
                          title={`Den Namen aus Zeile ${entry.fromRow} in Zeile ${entry.error.row} übernehmen`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          «{entry.fromName}» übernehmen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); dismissEntry(entry); }}
                          className="gap-1.5 text-xs"
                          title={`Den Namen «${entry.toName}» in Zeile ${entry.error.row} beibehalten`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          «{entry.toName}» beibehalten
                        </Button>
                        <span className="text-xs text-muted-foreground ml-1">
                          ℹ Bei «Ignorieren» bleiben beide Zeilen unverändert im Export.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Zurück
                </Button>
                <span className="text-sm text-muted-foreground">
                  Seite {page + 1} von {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Weiter
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
