import { useState, useMemo, useCallback } from 'react';
import { CheckCircle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, UserCog, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import type { ValidationError, ParsedRow } from '@/types/importTypes';
import { normalizeName } from '@/lib/nameUtils';

export interface NameChangeEntry {
  error: ValidationError;
  changeType: string;
  fromName: string;
  fromRow: number;
  toName: string;
  vorname: string;
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

  const PARENT_SLOTS = [
    { nameCol: 'P_ERZ1_Name', vornameCol: 'P_ERZ1_Vorname', idCol: 'P_ERZ1_ID' },
    { nameCol: 'P_ERZ2_Name', vornameCol: 'P_ERZ2_Vorname', idCol: 'P_ERZ2_ID' },
  ];

  const applyChoice = useCallback((entry: NameChangeEntry, choice: 'from' | 'to') => {
    const chosen = choice === 'from' ? entry.fromName : entry.toName;
    const other = choice === 'from' ? entry.toName : entry.fromName;
    const vornameNorm = normalizeName(entry.vorname);
    const chosenNorm = normalizeName(chosen);
    const otherNorm = normalizeName(other);

    type Match = { rowIdx: number; nameCol: string; idCol: string; curName: string; curId: string };
    const matched: Match[] = [];
    rows.forEach((r, idx) => {
      for (const s of PARENT_SLOTS) {
        const v = normalizeName(String(r[s.vornameCol] ?? ''));
        const n = normalizeName(String(r[s.nameCol] ?? ''));
        if (!v || !n || !vornameNorm) continue;
        if (v !== vornameNorm) continue;
        if (n !== chosenNorm && n !== otherNorm) continue;
        matched.push({
          rowIdx: idx,
          nameCol: s.nameCol,
          idCol: s.idCol,
          curName: String(r[s.nameCol] ?? ''),
          curId: String(r[s.idCol] ?? ''),
        });
      }
    });

    // Determine consolidation ID: prefer an ID already sitting on a "chosen name" row.
    let targetId = '';
    for (const m of matched) {
      if (normalizeName(m.curName) === chosenNorm && m.curId) { targetId = m.curId; break; }
    }
    if (!targetId) {
      for (const m of matched) if (m.curId) { targetId = m.curId; break; }
    }

    const corrections: { row: number; column: string; value: string }[] = [];
    let nameChanges = 0;
    let idChanges = 0;
    for (const m of matched) {
      if (m.curName !== chosen) {
        corrections.push({ row: m.rowIdx + 2, column: m.nameCol, value: chosen });
        nameChanges++;
      }
      if (targetId && m.curId !== targetId) {
        corrections.push({ row: m.rowIdx + 2, column: m.idCol, value: targetId });
        idChanges++;
      }
    }

    // Ensure the triggering error itself is marked resolved even if the row already matches.
    if (!corrections.some(c => c.row === entry.error.row && c.column === entry.error.column)) {
      corrections.push({ row: entry.error.row, column: entry.error.column, value: chosen });
    }

    onBulkCorrect(corrections, 'bulk');
    toast({
      title: 'Namenswechsel angewendet',
      description: `«${chosen}» in ${matched.length} Elternzeile${matched.length === 1 ? '' : 'n'} übernommen${idChanges > 0 ? `, Eltern-ID auf ${matched.length - (matched.length - idChanges)} Zeilen vereinheitlicht` : ''}.`,
    });
  }, [rows, onBulkCorrect, toast]);

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
              const sharedVorname = entry.vorname || fromRow[vornameCol] || toRow[vornameCol];
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
                            <span className="font-semibold text-foreground">Eintrag auf Zeile {entry.fromRow}</span>
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
                            <span className="font-semibold text-foreground">Eintrag auf Zeile {entry.error.row}</span>
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
                            applyChoice(entry, 'from');
                          }}
                          className="gap-1.5 text-xs"
                          title={`«${entry.fromName}» als Nachname für alle Zeilen dieser Elternperson übernehmen und Eltern-ID vereinheitlichen`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          «{entry.fromName}» übernehmen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => { e.stopPropagation(); applyChoice(entry, 'to'); }}
                          className="gap-1.5 text-xs"
                          title={`«${entry.toName}» als Nachname für alle Zeilen dieser Elternperson übernehmen und Eltern-ID vereinheitlichen`}
                        >
                          <Check className="h-3.5 w-3.5" />
                          «{entry.toName}» übernehmen
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
