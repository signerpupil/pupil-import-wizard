import { useState, useMemo, useCallback } from 'react';
import { AlertTriangle, CheckCircle, ChevronDown, ChevronUp, Search, X, Eraser, Users, Hash, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import type { ParsedRow, ValidationError } from '@/types/importTypes';
import { analyzeIdConflicts, getConflictSummary, type IdConflictGroup, type IdConflictPattern } from '@/lib/idConflictAnalysis';

interface IdConflictBatchCardProps {
  errors: ValidationError[];
  rows: ParsedRow[];
  onBulkCorrect: (corrections: { row: number; column: string; value: string }[], correctionType?: 'bulk' | 'auto') => void;
}

const ITEMS_PER_PAGE = 5;

const PATTERN_LABELS: Record<IdConflictPattern, string> = {
  placeholder: 'Platzhalter-ID',
  majority: 'Mehrheitsregel',
  auto_second: 'Automatische Zuweisung',
};

const PATTERN_COLORS: Record<IdConflictPattern, string> = {
  placeholder: 'bg-pupil-success/10 text-pupil-success border-pupil-success/30',
  majority: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  auto_second: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
};

export function IdConflictBatchCard({ errors, rows, onBulkCorrect }: IdConflictBatchCardProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [patternFilter, setPatternFilter] = useState<IdConflictPattern | 'all'>('all');

  const conflictGroups = useMemo(
    () => analyzeIdConflicts(errors, rows),
    [errors, rows]
  );

  const summary = useMemo(() => getConflictSummary(conflictGroups), [conflictGroups]);

  const filteredGroups = useMemo(() => {
    let groups = conflictGroups;
    if (patternFilter !== 'all') {
      groups = groups.filter(g => g.pattern === patternFilter);
    }
    if (search) {
      const q = search.toLowerCase();
      groups = groups.filter(g =>
        g.idValue.toLowerCase().includes(q) ||
        g.idField.toLowerCase().includes(q) ||
        g.persons.some(p =>
          p.name.toLowerCase().includes(q) ||
          p.vorname.toLowerCase().includes(q)
        )
      );
    }
    return groups;
  }, [conflictGroups, patternFilter, search]);

  const totalPages = Math.ceil(filteredGroups.length / ITEMS_PER_PAGE);
  const paginatedGroups = filteredGroups.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  // Reset page when filters change
  useMemo(() => setPage(0), [patternFilter, search]);

  const resolveGroup = useCallback((group: IdConflictGroup) => {
    if (group.resolvableRows.length === 0) return;

    const corrections = group.resolvableRows.map(rowNum => ({
      row: rowNum,
      column: group.idField,
      value: group.suggestedReplacements.get(rowNum) ?? '',
    }));

    onBulkCorrect(corrections, 'bulk');

    toast({
      title: 'ID-Konflikte aufgelöst',
      description: `${corrections.length} IDs in "${group.idField}" ersetzt (Wert "${group.idValue}").`,
    });
  }, [onBulkCorrect, toast]);

  const resolveAllResolvable = useCallback(() => {
    const resolvableGroups = conflictGroups.filter(g => g.resolvableRows.length > 0);
    const allCorrections: { row: number; column: string; value: string }[] = [];

    for (const group of resolvableGroups) {
      for (const rowNum of group.resolvableRows) {
        allCorrections.push({
          row: rowNum,
          column: group.idField,
          value: group.suggestedReplacements.get(rowNum) ?? '',
        });
      }
    }

    if (allCorrections.length === 0) return;

    onBulkCorrect(allCorrections, 'bulk');

    toast({
      title: 'Alle auflösbaren ID-Konflikte behoben',
      description: `${allCorrections.length} IDs in ${resolvableGroups.length} Gruppen ersetzt.`,
    });
  }, [conflictGroups, onBulkCorrect, toast]);

  if (conflictGroups.length === 0) return null;

  const resolvableCount = conflictGroups.filter(g => g.resolvableRows.length > 0).length;

  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            <CardTitle className="text-lg">ID-Konflikte auflösen</CardTitle>
            <Badge variant="outline" className="text-destructive border-destructive/30">
              {summary.totalGroups} Konflikte
            </Badge>
            {summary.totalResolvable > 0 && (
              <Badge variant="outline" className="text-pupil-success border-pupil-success/30">
                {summary.totalResolvable} automatisch lösbar
              </Badge>
            )}
          </div>
          {resolvableCount > 0 && (
            <Button
              onClick={resolveAllResolvable}
              className="gap-2 bg-destructive hover:bg-destructive/90"
              size="lg"
            >
              <Hash className="h-4 w-4" />
              Alle {resolvableCount} auflösen
            </Button>
          )}
        </div>
        <CardDescription>
          Verschiedene Personen verwenden dieselbe ID. Neue IDs im Format <code className="text-xs font-mono bg-muted px-1 rounded">{'{ID}_D01'}</code> werden generiert.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBox value={summary.totalGroups} label="ID-Konflikte" color="text-destructive" />
          <StatBox value={summary.totalResolvable} label="Auto-lösbar" color="text-pupil-success" />
          <StatBox value={summary.byPattern.placeholder.length} label="Platzhalter" color="text-pupil-success" />
          <StatBox value={summary.totalManual} label="Manuell" color="text-pupil-warning" />
        </div>

        {/* Pattern explanation */}
        <div className="text-xs text-muted-foreground bg-background rounded-lg border p-3 space-y-1.5">
          <p className="font-medium text-foreground text-sm">Erkannte Muster:</p>
          <p><span className="font-medium text-pupil-success">Platzhalter-ID:</span> Werte wie "0", "999", "-1" → Jede Person erhält eine neue eindeutige ID</p>
          <p><span className="font-medium text-blue-600">Mehrheitsregel:</span> Eine Person nutzt die ID in vielen Zeilen, eine andere nur in wenigen → Minderheit erhält neue ID</p>
          <p><span className="font-medium text-pupil-warning">Manuelle Prüfung:</span> Kein klares Muster → muss manuell entschieden werden</p>
        </div>

        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              {expanded ? (
                <><ChevronUp className="h-4 w-4" /> Details ausblenden</>
              ) : (
                <><ChevronDown className="h-4 w-4" /> Details anzeigen ({conflictGroups.length} Konflikte)</>
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-3">
            {/* Pattern filter buttons */}
            <div className="flex flex-wrap gap-2">
              <FilterButton
                active={patternFilter === 'all'}
                onClick={() => setPatternFilter('all')}
                label={`Alle (${conflictGroups.length})`}
              />
              {summary.byPattern.placeholder.length > 0 && (
                <FilterButton
                  active={patternFilter === 'placeholder'}
                  onClick={() => setPatternFilter('placeholder')}
                  label={`Platzhalter (${summary.byPattern.placeholder.length})`}
                  colorClass="border-pupil-success/50 text-pupil-success hover:bg-pupil-success/5"
                  activeClass="bg-pupil-success hover:bg-pupil-success/90 text-white"
                />
              )}
              {summary.byPattern.majority.length > 0 && (
                <FilterButton
                  active={patternFilter === 'majority'}
                  onClick={() => setPatternFilter('majority')}
                  label={`Mehrheit (${summary.byPattern.majority.length})`}
                  colorClass="border-blue-500/50 text-blue-600 hover:bg-blue-50"
                  activeClass="bg-blue-600 hover:bg-blue-700 text-white"
                />
              )}
              {summary.byPattern.auto_second.length > 0 && (
                <FilterButton
                  active={patternFilter === 'auto_second'}
                  onClick={() => setPatternFilter('auto_second')}
                  label={`Automatisch (${summary.byPattern.auto_second.length})`}
                  colorClass="border-blue-500/50 text-blue-600 hover:bg-blue-50"
                  activeClass="bg-blue-600 hover:bg-blue-700 text-white"
                />
              )}
            </div>

            {/* Search */}
            {conflictGroups.length > 5 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Suchen nach Name, ID, Spalte..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
                {search && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
                    onClick={() => setSearch('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}

            {/* Results count */}
            {(search || patternFilter !== 'all') && (
              <p className="text-sm text-muted-foreground">
                {filteredGroups.length} von {conflictGroups.length} Ergebnissen
              </p>
            )}

            {/* Conflict groups */}
            <div className="space-y-2">
              {paginatedGroups.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Keine Ergebnisse{search ? ` für "${search}"` : ''}
                </p>
              ) : (
                paginatedGroups.map((group, idx) => (
                  <ConflictGroupCard
                    key={`${group.idField}-${group.idValue}-${idx}`}
                    group={group}
                    rows={rows}
                    onResolve={() => resolveGroup(group)}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
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

function ConflictGroupCard({
  group,
  rows,
  onResolve,
}: {
  group: IdConflictGroup;
  rows: ParsedRow[];
  onResolve: () => void;
}) {
  const canResolve = group.resolvableRows.length > 0;

  return (
    <div className="bg-background rounded-lg border overflow-hidden">
      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">{group.idField}</Badge>
            <code className="text-sm font-mono bg-destructive/10 text-destructive px-2 py-0.5 rounded">
              {group.idValue}
            </code>
            <Badge className={PATTERN_COLORS[group.pattern]}>
              {PATTERN_LABELS[group.pattern]}
            </Badge>
          </div>
          {canResolve && (
            <Button size="sm" variant="outline" onClick={onResolve} className="gap-1.5 shrink-0">
              <Hash className="h-3.5 w-3.5" />
              {group.resolvableRows.length} neue IDs vergeben
            </Button>
          )}
        </div>

        {/* Persons list */}
        <div className="space-y-1.5">
          {group.persons.map((person, pIdx) => {
            const isOwner = group.ownerPerson === person;
            const willReplace = !isOwner && canResolve;
            // Get the replacement ID for the first row of this person
            const replacementId = willReplace
              ? group.suggestedReplacements.get(person.rowNumbers[0])
              : undefined;

            return (
              <div
                key={pIdx}
                className={`flex items-center justify-between gap-3 text-sm rounded-md px-2.5 py-1.5 ${
                  isOwner
                    ? 'bg-pupil-success/10 border border-pupil-success/20'
                    : willReplace
                      ? 'bg-blue-50 border border-blue-200 dark:bg-blue-950/30 dark:border-blue-800'
                      : 'bg-muted/50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="font-medium truncate">
                    {person.vorname} {person.name}
                  </span>
                  {person.ahv && (
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      {person.ahv}
                    </span>
                  )}
                  {person.geburtsdatum && (
                    <span className="text-xs text-muted-foreground">
                      *{person.geburtsdatum}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="text-xs">
                    {person.rowNumbers.length} {person.rowNumbers.length === 1 ? 'Zeile' : 'Zeilen'}
                  </Badge>
                  {isOwner && (
                    <Badge className="bg-pupil-success/20 text-pupil-success border-pupil-success/30 text-xs">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Behält ID
                    </Badge>
                  )}
                  {willReplace && replacementId && (
                    <Badge variant="outline" className="text-blue-600 border-blue-400/50 text-xs font-mono">
                      <Hash className="h-3 w-3 mr-1" />
                      → {replacementId}
                    </Badge>
                  )}
                  {group.pattern === 'manual' && (
                    <Badge variant="outline" className="text-pupil-warning border-pupil-warning/30 text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Manuell
                    </Badge>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Row numbers hint */}
        <p className="text-xs text-muted-foreground">
          Zeilen: {group.persons.flatMap(p => p.rowNumbers).sort((a, b) => a - b).slice(0, 10).join(', ')}
          {group.persons.flatMap(p => p.rowNumbers).length > 10 && '…'}
        </p>
      </div>
    </div>
  );
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="p-3 bg-background rounded-lg border text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function FilterButton({
  active,
  onClick,
  label,
  colorClass = '',
  activeClass = '',
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  colorClass?: string;
  activeClass?: string;
}) {
  return (
    <Button
      size="sm"
      variant={active ? 'default' : 'outline'}
      onClick={onClick}
      className={active ? activeClass : colorClass}
    >
      {label}
    </Button>
  );
}
