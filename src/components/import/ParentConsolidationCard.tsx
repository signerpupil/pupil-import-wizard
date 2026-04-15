import { useState, useMemo, useEffect, useCallback } from 'react';
import { AlertCircle, CheckCircle, Edit2, Save, ChevronLeft, ChevronRight, X, AlertTriangle, Users, Search, ChevronDown, ChevronUp, Info, Languages, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import type { ParsedRow } from '@/types/importTypes';

export interface ParentIdInconsistencyGroup {
  identifier: string;
  column: string;
  correctId: string;
  matchReason: string;
  severity?: 'error' | 'warning';
  parentName?: string;
  parentAddress?: string;
  referenceRow?: number;
  referencePrefix?: string;
  referenceStudentName?: string;
  affectedRows: {
    row: number;
    currentId: string;
    studentName: string | null;
    column: string;
  }[];
  hasNameMismatch?: boolean;
  hasDiacriticNameDiff?: boolean;
  diacriticNameVariants?: { prefix: string; row: number; name: string; vorname: string }[];
}

interface ParentConsolidationCardProps {
  parentIdInconsistencyGroups: ParentIdInconsistencyGroup[];
  rows: ParsedRow[];
  onErrorCorrect: (rowIndex: number, column: string, value: string, correctionType?: 'manual' | 'bulk' | 'auto') => void;
  onBulkCorrect: (corrections: { row: number; column: string; value: string }[], correctionType?: 'bulk' | 'auto') => void;
  getStudentNameForRow: (rowNumber: number) => string | null;
}

const PARENTS_PER_PAGE = 4;

function getParentFieldComparison(
  affectedRows: { row: number; currentId: string; studentName: string | null; column: string }[],
  column: string,
  allRows: ParsedRow[],
  getStudentNameForRow: (rowNumber: number) => string | null,
  referenceRow?: number,
  correctId?: string,
  referencePrefix?: string
) {
  const prefix = column.replace(/_ID$/, '_');
  const refPfx = referencePrefix || prefix;
  const FIELDS_TO_COMPARE = [
    { key: 'Name', label: 'Name' },
    { key: 'Vorname', label: 'Vorname' },
    { key: 'AHV', label: 'AHV' },
    { key: 'Strasse', label: 'Strasse' },
    { key: 'PLZ', label: 'PLZ' },
    { key: 'Ort', label: 'Ort' },
    { key: 'EMail', label: 'E-Mail' },
    { key: 'TelefonPrivat', label: 'Tel. Privat' },
    { key: 'TelefonGeschaeft', label: 'Tel. Geschäft' },
    { key: 'Mobil', label: 'Mobil' },
    { key: 'Rolle', label: 'Rolle' },
    { key: 'Beruf', label: 'Beruf' },
  ];

  const rowEntries: { row: number; label: string; isReference: boolean; prefix: string }[] = [];

  let effectiveRefRow = referenceRow;
  if (effectiveRefRow == null && correctId) {
    const affectedRowSet = new Set(affectedRows.map(r => r.row));
    for (let i = 0; i < allRows.length; i++) {
      const rowNum = i + 1;
      if (affectedRowSet.has(rowNum)) continue;
      const val = String(allRows[i]?.[column] ?? '').trim();
      if (val === correctId) {
        effectiveRefRow = rowNum;
        break;
      }
    }
  }

  if (effectiveRefRow != null) {
    const refStudentName = getStudentNameForRow(effectiveRefRow);
    rowEntries.push({ row: effectiveRefRow, label: `Referenz (Zeile ${effectiveRefRow})${refStudentName ? ` – ${refStudentName}` : ''}`, isReference: true, prefix: refPfx });
  }

  const nameCount = new Map<string, number>();
  affectedRows.forEach(r => { const n = r.studentName || ''; nameCount.set(n, (nameCount.get(n) || 0) + 1); });

  for (const r of affectedRows) {
    const name = r.studentName || `Zeile ${r.row}`;
    const needsDisambig = r.studentName && (nameCount.get(r.studentName) || 0) > 1;
    const arPrefix = r.column.replace(/_ID$/, '_');
    rowEntries.push({ row: r.row, label: needsDisambig ? `${name} (Z. ${r.row})` : name, isReference: false, prefix: arPrefix });
  }

  return FIELDS_TO_COMPARE.map(field => {
    const values = rowEntries.map(r => {
      const row = allRows[r.row - 2];
      return String(row?.[`${r.prefix}${field.key}`] ?? '').trim();
    });
    const uniqueNonEmpty = [...new Set(values.filter(v => v !== ''))];
    const allEmpty = values.every(v => v === '');
    const allSame = uniqueNonEmpty.length <= 1;
    return {
      fieldKey: field.key,
      label: field.label,
      values,
      rowLabels: rowEntries.map(r => r.label),
      allSame,
      allEmpty,
      uniqueValues: uniqueNonEmpty,
      singleValue: allSame ? (uniqueNonEmpty[0] ?? '') : null,
    };
  }).filter(f => !f.allEmpty);
}

export function ParentConsolidationCard({
  parentIdInconsistencyGroups,
  rows,
  onErrorCorrect,
  onBulkCorrect,
  getStudentNameForRow,
}: ParentConsolidationCardProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [reliabilityFilter, setReliabilityFilter] = useState<'all' | 'medium_high' | 'high' | 'medium' | 'low'>('medium_high');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [editingAhv, setEditingAhv] = useState<Map<string, string>>(new Map());
  const { toast } = useToast();

  const toggleGroupExpanded = (key: string) =>
    setExpandedGroups(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });

  const totalInconsistencies = useMemo(() =>
    parentIdInconsistencyGroups.reduce((sum, g) => sum + g.affectedRows.length, 0),
    [parentIdInconsistencyGroups]
  );

  const filteredGroups = useMemo(() => {
    let result = parentIdInconsistencyGroups;
    if (reliabilityFilter !== 'all') {
      result = result.filter(group => {
        const r = group.matchReason.toLowerCase();
        if (reliabilityFilter === 'medium_high') return r.includes('hohe') || r.includes('mittlere');
        if (reliabilityFilter === 'high') return r.includes('hohe');
        if (reliabilityFilter === 'medium') return r.includes('mittlere');
        if (reliabilityFilter === 'low') return r.includes('tiefe');
        return true;
      });
    }
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      result = result.filter(group =>
        group.identifier.toLowerCase().includes(searchLower) ||
        group.correctId.toLowerCase().includes(searchLower) ||
        group.column.toLowerCase().includes(searchLower) ||
        (group.parentName?.toLowerCase().includes(searchLower) ?? false) ||
        group.affectedRows.some(r => r.studentName?.toLowerCase().includes(searchLower))
      );
    }
    return result;
  }, [parentIdInconsistencyGroups, search, reliabilityFilter]);

  const paginatedGroups = useMemo(() => {
    const start = page * PARENTS_PER_PAGE;
    return filteredGroups.slice(start, start + PARENTS_PER_PAGE);
  }, [filteredGroups, page]);

  const totalPages = Math.ceil(filteredGroups.length / PARENTS_PER_PAGE);

  const nameMismatchCount = useMemo(() =>
    parentIdInconsistencyGroups.filter(g => g.hasNameMismatch).length,
    [parentIdInconsistencyGroups]
  );

  const filteredChildren = useMemo(() =>
    filteredGroups.reduce((sum, g) => sum + g.affectedRows.length, 0),
    [filteredGroups]
  );

  const isFiltered = reliabilityFilter !== 'all' || search.trim() !== '';

  useEffect(() => { setPage(0); }, [search, reliabilityFilter]);

  const applyBulkCorrection = useCallback(() => {
    const targetGroups = filteredGroups.length > 0 ? filteredGroups : parentIdInconsistencyGroups;
    const safeGroups = targetGroups.filter(g => !g.hasNameMismatch);
    if (safeGroups.length === 0) return;
    const corrections: { row: number; column: string; value: string }[] = [];
    let totalAffectedChildren = 0;
    for (const group of safeGroups) {
      for (const affectedRow of group.affectedRows) {
        corrections.push({ row: affectedRow.row, column: affectedRow.column, value: group.correctId });
        totalAffectedChildren++;
      }
    }
    const skipped = targetGroups.length - safeGroups.length;
    if (corrections.length > 0) {
      onBulkCorrect(corrections, 'bulk');
      toast({
        title: 'Eltern-IDs konsolidiert',
        description: `${safeGroups.length} Eltern mit insgesamt ${totalAffectedChildren} Kindern korrigiert.${skipped > 0 ? ` ${skipped} Gruppen übersprungen (Namensunterschied).` : ''}`,
      });
    }
  }, [filteredGroups, parentIdInconsistencyGroups, onBulkCorrect, toast]);

  const dismissGroup = useCallback((group: ParentIdInconsistencyGroup) => {
    const corrections = group.affectedRows.map(r => ({
      row: r.row,
      column: r.column,
      value: r.currentId,
    }));
    onBulkCorrect(corrections, 'bulk');
    toast({
      title: 'Inkonsistenz ignoriert',
      description: `ID-Konflikt für "${group.identifier}" wurde als geprüft markiert.`,
    });
  }, [onBulkCorrect, toast]);

  if (parentIdInconsistencyGroups.length === 0) return null;

  return (
    <Card className="border-blue-500/30 bg-blue-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Eltern-ID Konsolidierung</CardTitle>
            <Badge variant="outline" className="text-blue-500 border-blue-500/30">
              {isFiltered ? `${filteredGroups.length} / ${parentIdInconsistencyGroups.length}` : parentIdInconsistencyGroups.length} Eltern
            </Badge>
            <Badge variant="outline" className="text-blue-500 border-blue-500/30">
              {isFiltered ? filteredChildren : totalInconsistencies} Kinder
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {nameMismatchCount > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-500/30 bg-amber-500/10">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {nameMismatchCount} übersprungen (Namensunterschied)
              </Badge>
            )}
            <Button
              onClick={applyBulkCorrection}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              <CheckCircle className="h-4 w-4" />
              Alle {(() => {
                const total = isFiltered ? filteredGroups.length : parentIdInconsistencyGroups.length;
                const safe = total - (isFiltered ? filteredGroups.filter(g => g.hasNameMismatch).length : nameMismatchCount);
                return safe;
              })()} konsolidieren
            </Button>
          </div>
        </div>
        <CardDescription>
          Gleiche Eltern wurden mit unterschiedlichen IDs erfasst. Mit einem Klick alle auf die korrekte ID vereinheitlichen.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {parentIdInconsistencyGroups.length > 10 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-blue-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{isFiltered ? filteredGroups.length : parentIdInconsistencyGroups.length}</p>
              <p className="text-xs text-muted-foreground">Eltern zu konsolidieren</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{isFiltered ? filteredChildren : totalInconsistencies}</p>
              <p className="text-xs text-muted-foreground">Betroffene Kinder</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">
                {new Set((isFiltered ? filteredGroups : parentIdInconsistencyGroups).map(g => g.column)).size}
              </p>
              <p className="text-xs text-muted-foreground">Spalten betroffen</p>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">
                {Math.round(((isFiltered ? filteredGroups.length : parentIdInconsistencyGroups.length) / rows.length) * 100)}%
              </p>
              <p className="text-xs text-muted-foreground">Betroffene Zeilen</p>
            </div>
          </div>
        )}

        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              {expanded ? (
                <><ChevronUp className="h-4 w-4" />Details ausblenden</>
              ) : (
                <><ChevronDown className="h-4 w-4" />Details anzeigen ({parentIdInconsistencyGroups.length} Eltern)</>
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-3">
            {/* Reliability filter buttons */}
            {(() => {
              const countHigh = parentIdInconsistencyGroups.filter(g => g.matchReason.toLowerCase().includes('hohe')).length;
              const countMedium = parentIdInconsistencyGroups.filter(g => g.matchReason.toLowerCase().includes('mittlere')).length;
              const countLow = parentIdInconsistencyGroups.filter(g => g.matchReason.toLowerCase().includes('tiefe')).length;
              return (
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant={reliabilityFilter === 'all' ? 'default' : 'outline'} onClick={() => setReliabilityFilter('all')} className="gap-1.5">
                    Alle ({parentIdInconsistencyGroups.length})
                  </Button>
                  {(countHigh + countMedium) > 0 && (
                    <Button size="sm" variant={reliabilityFilter === 'medium_high' ? 'default' : 'outline'} onClick={() => setReliabilityFilter('medium_high')}
                      className={`gap-1.5 ${reliabilityFilter !== 'medium_high' ? 'border-primary/50 text-primary hover:bg-primary/5' : ''}`}>
                      Mittel + Hoch ({countHigh + countMedium})
                    </Button>
                  )}
                  {countHigh > 0 && (
                    <Button size="sm" variant={reliabilityFilter === 'high' ? 'default' : 'outline'} onClick={() => setReliabilityFilter('high')}
                      className={`gap-1.5 ${reliabilityFilter !== 'high' ? 'border-green-500/50 text-green-700 hover:bg-green-50' : 'bg-green-600 hover:bg-green-700'}`}>
                      <span className="inline-block w-2 h-2 rounded-full bg-green-500 shrink-0" />
                      Hohe Zuverlässigkeit ({countHigh})
                    </Button>
                  )}
                  {countMedium > 0 && (
                    <Button size="sm" variant={reliabilityFilter === 'medium' ? 'default' : 'outline'} onClick={() => setReliabilityFilter('medium')}
                      className={`gap-1.5 ${reliabilityFilter !== 'medium' ? 'border-pupil-warning/50 text-pupil-warning hover:bg-pupil-warning/5' : 'bg-pupil-warning hover:bg-pupil-warning/90 text-white'}`}>
                      <span className="inline-block w-2 h-2 rounded-full bg-pupil-warning shrink-0" />
                      Mittlere Zuverlässigkeit ({countMedium})
                    </Button>
                  )}
                  {countLow > 0 && (
                    <Button size="sm" variant={reliabilityFilter === 'low' ? 'default' : 'outline'} onClick={() => setReliabilityFilter('low')}
                      className={`gap-1.5 ${reliabilityFilter !== 'low' ? 'border-destructive/50 text-destructive hover:bg-destructive/5' : 'bg-destructive hover:bg-destructive/90 text-destructive-foreground'}`}>
                      <span className="inline-block w-2 h-2 rounded-full bg-destructive shrink-0" />
                      Tiefe Zuverlässigkeit ({countLow})
                    </Button>
                  )}
                </div>
              );
            })()}

            {/* Search */}
            {parentIdInconsistencyGroups.length > 10 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Suchen nach Name, ID, Spalte..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
                {search && (
                  <Button variant="ghost" size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0" onClick={() => setSearch('')}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}

            {/* Results info */}
            {(search || reliabilityFilter !== 'all') && (
              <p className="text-sm text-muted-foreground">
                {filteredGroups.length} von {parentIdInconsistencyGroups.length} Ergebnissen
              </p>
            )}

            {/* Paginated list */}
            <div>
              <div className="space-y-2">
                {paginatedGroups.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    Keine Ergebnisse{search ? ` für "${search}"` : ''}{reliabilityFilter !== 'all' ? ' in dieser Kategorie' : ''}
                  </p>
                ) : (
                  paginatedGroups.map((group, idx) => {
                    const groupKey = `${group.identifier}`;
                    const isGroupExpanded = expandedGroups.has(groupKey);
                    const uniqueColumns = [...new Set(group.affectedRows.map(r => r.column))];
                    if (!uniqueColumns.includes(group.column)) uniqueColumns.unshift(group.column);

                    return (
                      <div key={`${group.identifier}-${idx}`} className="bg-background rounded-lg border overflow-hidden">
                        {/* Card header */}
                        <div className="p-3 space-y-2">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                {uniqueColumns.map(col => (
                                  <Badge key={col} variant="outline" className="shrink-0">{col}</Badge>
                                ))}
                                {group.matchReason && (
                                  <Badge variant="secondary" className={`text-xs shrink-0 ${group.severity === 'warning' ? 'border border-pupil-warning/40 text-pupil-warning bg-pupil-warning/10' : ''}`}>
                                    {group.matchReason}
                                  </Badge>
                                )}
                              </div>

                              {(group.parentName || group.parentAddress) && (
                                <div className="mb-2 space-y-0.5">
                                  {group.parentName && <p className="text-sm font-semibold">{group.parentName}</p>}
                                  {group.parentAddress && <p className="text-xs text-muted-foreground">{group.parentAddress}</p>}
                                </div>
                              )}

                              <div className="flex items-center gap-2 text-sm flex-wrap">
                                <span className="text-muted-foreground shrink-0">Korrekte ID:</span>
                                <code className="px-1.5 py-0.5 bg-blue-500/10 rounded text-blue-600 font-mono text-xs truncate">{group.correctId}</code>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                                        <Info className="h-3 w-3" />
                                        Aus Zeile {group.referenceRow ?? group.affectedRows[0]?.row} (Referenz)
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs text-xs">
                                      Die «korrekte ID» ist der Wert aus dem <strong>ersten Auftreten</strong> dieses Elternteils in der Datei (Zeile {group.referenceRow ?? group.affectedRows[0]?.row}).<br />
                                      Erkannt via: {group.matchReason}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>

                              <div className="mt-1.5 text-xs text-muted-foreground">
                                {(() => {
                                  const totalChildren = group.affectedRows.length + (group.referenceStudentName ? 1 : 0);
                                  return <span className="font-medium">{totalChildren} {totalChildren === 1 ? 'Kind' : 'Kinder'} in Familie:</span>;
                                })()}
                                <span className="ml-1">
                                  {group.referenceStudentName && (
                                    <span>
                                      {group.referenceStudentName}
                                      <span className="text-green-600 dark:text-green-400"> ✓</span>
                                      <span className="text-muted-foreground/70"> (Referenz)</span>
                                      {group.affectedRows.length > 0 && ', '}
                                    </span>
                                  )}
                                  {(() => {
                                    const shown = group.affectedRows.slice(0, 3);
                                    const nc = new Map<string, number>();
                                    const allNames = [...(group.referenceStudentName ? [group.referenceStudentName] : []), ...shown.map(r => r.studentName || '')];
                                    allNames.forEach(n => nc.set(n, (nc.get(n) || 0) + 1));
                                    return shown.map((r, i) => {
                                      const name = r.studentName || `Zeile ${r.row}`;
                                      const needsDisambig = r.studentName && (nc.get(r.studentName) || 0) > 1;
                                      return (
                                        <span key={r.row}>
                                          {i > 0 && ', '}
                                          {needsDisambig ? `${name} (Z. ${r.row})` : name}
                                          {r.currentId !== group.correctId && <span className="text-destructive"> ✕</span>}
                                        </span>
                                      );
                                    });
                                  })()}
                                  {group.affectedRows.length > 3 && ` +${group.affectedRows.length - 3} weitere`}
                                </span>
                              </div>

                              {/* Name mismatch warning + inline AHV edit */}
                              {group.hasNameMismatch && (() => {
                                const refPrefix = group.referencePrefix ? group.referencePrefix.replace(/_$/, '') : group.column.replace(/_ID$/, '');
                                const refAhvColumn = `${refPrefix}_AHV`;
                                const allEditRows = [
                                  ...(group.referenceRow ? [{ row: group.referenceRow, label: `Referenz (Z. ${group.referenceRow})`, ahvCol: refAhvColumn }] : []),
                                  ...group.affectedRows.map(ar => {
                                    const arPrefix = ar.column.replace(/_ID$/, '');
                                    return { row: ar.row, label: `${ar.studentName || 'Zeile'} (Z. ${ar.row})`, ahvCol: `${arPrefix}_AHV` };
                                  }),
                                ];
                                return (
                                  <>
                                    <div className="mt-1.5 flex items-center gap-1.5 text-xs text-destructive bg-destructive/10 rounded px-2 py-1">
                                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                      <span className="font-medium">Unterschiedliche Namen erkannt — keine automatische Konsolidierung möglich</span>
                                    </div>
                                    <div className="mt-1.5 bg-muted/40 rounded border p-2 space-y-1.5">
                                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                                        <Edit2 className="h-3 w-3" /> AHV-Nummer korrigieren
                                      </p>
                                      {allEditRows.map(({ row: editRow, label, ahvCol }) => {
                                        const ahvKey = `${editRow}:${ahvCol}`;
                                        const currentAhv = String(rows[editRow - 2]?.[ahvCol] ?? '');
                                        const isEditing = editingAhv.has(ahvKey);
                                        const editVal = editingAhv.get(ahvKey) ?? '';
                                        const ahvValid = /^756\.\d{4}\.\d{4}\.\d{2}$/.test(editVal);
                                        return (
                                          <div key={ahvKey} className="flex items-center gap-2 text-xs">
                                            <span className="text-muted-foreground truncate min-w-[120px]">{label}</span>
                                            {!isEditing ? (
                                              <>
                                                <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-background border">{currentAhv || '–'}</code>
                                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                                                  onClick={(e) => { e.stopPropagation(); setEditingAhv(prev => new Map(prev).set(ahvKey, currentAhv)); }}>
                                                  <Edit2 className="h-3 w-3" />
                                                </Button>
                                              </>
                                            ) : (
                                              <>
                                                <Input value={editVal}
                                                  onChange={(e) => setEditingAhv(prev => new Map(prev).set(ahvKey, e.target.value))}
                                                  onClick={(e) => e.stopPropagation()}
                                                  className={`h-7 w-48 font-mono text-xs ${editVal && !ahvValid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                                                  placeholder="756.XXXX.XXXX.XX"
                                                />
                                                <Button size="sm" variant="default" className="h-7 gap-1 px-2" disabled={!ahvValid}
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onErrorCorrect(editRow, ahvCol, editVal, 'manual');
                                                    setEditingAhv(prev => { const m = new Map(prev); m.delete(ahvKey); return m; });
                                                    toast({ title: 'AHV korrigiert', description: `Zeile ${editRow}: ${ahvCol} → ${editVal}` });
                                                  }}>
                                                  <Save className="h-3 w-3" /> OK
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                                                  onClick={(e) => { e.stopPropagation(); setEditingAhv(prev => { const m = new Map(prev); m.delete(ahvKey); return m; }); }}>
                                                  <X className="h-3 w-3" />
                                                </Button>
                                              </>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </>
                                );
                              })()}

                              {/* Diacritic name difference */}
                              {!group.hasNameMismatch && group.hasDiacriticNameDiff && group.diacriticNameVariants && group.diacriticNameVariants.length > 1 && (() => {
                                const uniqueVariants = new Map<string, typeof group.diacriticNameVariants[0]>();
                                for (const v of group.diacriticNameVariants!) {
                                  const key = `${v.name}|${v.vorname}`;
                                  if (!uniqueVariants.has(key)) uniqueVariants.set(key, v);
                                }
                                const variants = Array.from(uniqueVariants.values());
                                if (variants.length < 2) return null;
                                const allVariantRows = group.diacriticNameVariants!;
                                return (
                                  <div className="mt-1.5 bg-amber-50 dark:bg-amber-950/20 rounded border border-amber-200 dark:border-amber-800 p-2 space-y-1.5">
                                    <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wide flex items-center gap-1">
                                      <Languages className="h-3 w-3" /> Namensschreibweise vereinheitlichen
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Unterschiedliche Schreibweisen (Akzente/Diakritika) erkannt. Wählen Sie die korrekte Schreibweise:
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 mt-1">
                                      {variants.map((v) => {
                                        const displayName = `${v.vorname} ${v.name}`;
                                        return (
                                          <Button key={`${v.name}|${v.vorname}`} size="sm" variant="outline"
                                            className="h-7 gap-1.5 text-xs border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/30"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const corrections: { row: number; column: string; value: string }[] = [];
                                              for (const target of allVariantRows) {
                                                if (target.name !== v.name) corrections.push({ row: target.row, column: `${target.prefix}Name`, value: v.name });
                                                if (target.vorname !== v.vorname) corrections.push({ row: target.row, column: `${target.prefix}Vorname`, value: v.vorname });
                                              }
                                              if (corrections.length > 0) {
                                                for (const c of corrections) onErrorCorrect(c.row, c.column, c.value, 'manual');
                                                toast({ title: 'Name vereinheitlicht', description: `${corrections.length} Felder auf "${displayName}" gesetzt.` });
                                              }
                                            }}>
                                            <Check className="h-3 w-3" />
                                            {displayName}
                                            <span className="text-muted-foreground">(Z. {v.row})</span>
                                          </Button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Field differences warning */}
                              {!group.hasNameMismatch && (() => {
                                const fc = getParentFieldComparison(group.affectedRows, group.column, rows, getStudentNameForRow, group.referenceRow, group.correctId, group.referencePrefix);
                                const diffCount = fc.filter(f => !f.allSame).length;
                                return diffCount > 0 ? (
                                  <div className="mt-1 flex items-center gap-1 text-xs text-amber-700">
                                    <AlertTriangle className="h-3 w-3 shrink-0" />
                                    <span>{diffCount} {diffCount === 1 ? 'Feld' : 'Felder'} mit Unterschieden – Details prüfen</span>
                                  </div>
                                ) : null;
                              })()}
                            </div>

                            <div className="flex gap-2 shrink-0">
                              <Button size="sm" variant={isGroupExpanded ? 'default' : 'outline'}
                                onClick={(e) => { e.stopPropagation(); toggleGroupExpanded(groupKey); }} className="gap-1">
                                {isGroupExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                Details
                              </Button>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button size="sm" variant="outline"
                                      onClick={(e) => { e.stopPropagation(); dismissGroup(group); }}
                                      className="gap-1.5 text-muted-foreground hover:text-foreground">
                                      <X className="h-3.5 w-3.5" />
                                      Ignorieren
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-xs text-xs">
                                    Markiert diesen ID-Konflikt als geprüft und blendet ihn aus.<br />
                                    Der aktuelle Wert bleibt unverändert im Änderungsprotokoll sichtbar.
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>

                        {/* Expanded details */}
                        {isGroupExpanded && (() => {
                          const fieldComparison = getParentFieldComparison(group.affectedRows, group.column, rows, getStudentNameForRow, group.referenceRow, group.correctId, group.referencePrefix);
                          return (
                            <div className="border-t bg-muted/20 p-3 space-y-3">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Einträge im Vergleich</p>
                              <div className="grid grid-cols-2 gap-2">
                                {/* Left card: Current state */}
                                <div className="rounded-md border bg-muted/50 p-2.5 space-y-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold">Aktueller Stand</span>
                                    <span className="text-muted-foreground text-[10px]">{(group.referenceRow ? 1 : 0) + group.affectedRows.length} Einträge</span>
                                  </div>
                                  <div className="space-y-1 border-t pt-1.5">
                                    {group.referenceRow && (() => {
                                      const refStudentName = getStudentNameForRow(group.referenceRow!);
                                      return (
                                        <div className="flex items-center gap-1.5 flex-wrap bg-blue-500/5 rounded px-1 py-0.5">
                                          <span className="text-muted-foreground truncate">
                                            Referenz (Z. {group.referenceRow}){refStudentName ? ` – ${refStudentName}` : ''}:
                                          </span>
                                          <code className="px-1.5 py-0.5 rounded font-mono bg-blue-500/10 text-blue-600 font-bold">{group.correctId}</code>
                                        </div>
                                      );
                                    })()}
                                    {(() => {
                                      const nc = new Map<string, number>();
                                      group.affectedRows.forEach(r => { const n = r.studentName || ''; nc.set(n, (nc.get(n) || 0) + 1); });
                                      return group.affectedRows.map(r => {
                                        const name = r.studentName || `Zeile ${r.row}`;
                                        const needsDisambig = r.studentName && (nc.get(r.studentName) || 0) > 1;
                                        const displayName = needsDisambig ? `${name} (Z. ${r.row})` : name;
                                        return (
                                          <div key={r.row} className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-muted-foreground truncate">{displayName}:</span>
                                            <code className={`px-1.5 py-0.5 rounded font-mono ${r.currentId !== group.correctId ? 'bg-destructive/10 text-destructive' : 'bg-green-500/10 text-green-700'}`}>
                                              {r.currentId}
                                            </code>
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>

                                {/* Right card: After consolidation */}
                                <div className="rounded-md border bg-blue-500/5 border-blue-500/30 p-2.5 space-y-2 text-xs">
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-blue-700">Nach Konsolidierung</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 pb-1.5 border-b">
                                    <span className="text-muted-foreground shrink-0">Einheitliche ID:</span>
                                    <code className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 rounded font-mono font-bold">{group.correctId}</code>
                                  </div>
                                  <div className="space-y-1 pt-0.5">
                                    {(() => {
                                      const nc = new Map<string, number>();
                                      group.affectedRows.forEach(r => { const n = r.studentName || ''; nc.set(n, (nc.get(n) || 0) + 1); });
                                      return group.affectedRows.map(r => {
                                        const name = r.studentName || `Zeile ${r.row}`;
                                        const needsDisambig = r.studentName && (nc.get(r.studentName) || 0) > 1;
                                        const displayName = needsDisambig ? `${name} (Z. ${r.row})` : name;
                                        return (
                                          <div key={r.row} className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-muted-foreground truncate">{displayName}:</span>
                                            {r.currentId !== group.correctId ? (
                                              <div className="flex items-center gap-1">
                                                <code className="px-1 py-0.5 bg-destructive/10 text-destructive rounded font-mono line-through text-[10px]">{r.currentId}</code>
                                                <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                                                <code className="px-1 py-0.5 bg-green-500/10 text-green-700 rounded font-mono text-[10px]">{group.correctId}</code>
                                              </div>
                                            ) : (
                                              <div className="flex items-center gap-1">
                                                <CheckCircle className="h-3 w-3 text-green-500" />
                                                <span className="text-green-700">bereits korrekt</span>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      });
                                    })()}
                                  </div>
                                </div>
                              </div>

                              {/* Field comparison */}
                              {fieldComparison.length > 0 && (
                                <div className="border-t pt-3 space-y-1.5">
                                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Felder der Elternperson</p>
                                  {fieldComparison.map(field => (
                                    <div key={field.fieldKey} className={`rounded-md p-2 text-xs ${field.allSame ? 'bg-muted/30' : 'bg-amber-500/10 border border-amber-500/30'}`}>
                                      {field.allSame ? (
                                        <div className="flex items-center gap-2">
                                          <span className="text-muted-foreground w-28 shrink-0">{field.label}</span>
                                          <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                                          <span className="text-foreground truncate">{field.singleValue || '–'}</span>
                                          <span className="text-muted-foreground text-[10px] ml-auto whitespace-nowrap">alle gleich</span>
                                        </div>
                                      ) : (
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <AlertTriangle className="h-3 w-3 text-amber-600 shrink-0" />
                                            <span className="font-medium text-amber-700 dark:text-amber-400">{field.label} – Unterschiede</span>
                                          </div>
                                          <div className="grid gap-0.5 pl-4">
                                            {field.rowLabels.map((label, i) => (
                                              <div key={i} className="flex items-center gap-2">
                                                <span className="text-muted-foreground w-32 shrink-0 truncate text-[11px]">{label}:</span>
                                                <span className={`text-[11px] ${field.values[i] !== field.uniqueValues[0] ? 'text-amber-700 dark:text-amber-400 font-medium' : 'text-foreground'}`}>
                                                  {field.values[i] || '–'}
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 border-t">
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" /> Zurück
                </Button>
                <span className="text-sm text-muted-foreground">Seite {page + 1} von {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
                  Weiter <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      </CardContent>
    </Card>
  );
}
