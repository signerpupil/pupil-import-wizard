import { useState, useMemo, useCallback } from 'react';
import { Users, CheckCircle, ChevronDown, ChevronUp, AlertTriangle, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import type { ParsedRow, ValidationError } from '@/types/importTypes';

interface StudentParentOverlapCardProps {
  errors: ValidationError[];
  rows: ParsedRow[];
  onBulkCorrect: (corrections: { row: number; column: string; value: string }[], correctionType?: 'bulk' | 'auto') => void;
}

interface OverlapGroup {
  overlappingId: string;
  parentField: string;
  studentRowIdx: number; // 0-based
  parentRowIdx: number; // 0-based
  studentName: string;
  parentName: string;
  childName: string;
  ageHint: string;
  errorRow: number; // 1-based (from error.row)
}

const ITEMS_PER_PAGE = 5;

function analyzeOverlaps(errors: ValidationError[], rows: ParsedRow[]): OverlapGroup[] {
  const overlapErrors = errors.filter(e => e.type === 'student_parent_id_overlap' && !e.correctedValue);
  if (overlapErrors.length === 0) return [];

  const groups: OverlapGroup[] = [];

  for (const err of overlapErrors) {
    const parentRowIdx = err.row - 2; // back to 0-based
    const parentField = err.column;
    const overlappingId = err.value;

    // Parse student row from message
    const studentRowMatch = err.message.match(/Zeile (\d+)/);
    const studentRow = studentRowMatch ? parseInt(studentRowMatch[1]) : 0;
    const studentRowIdx = studentRow - 2;

    const studentName = studentRowIdx >= 0 && studentRowIdx < rows.length
      ? `${String(rows[studentRowIdx]['S_Vorname'] ?? '')} ${String(rows[studentRowIdx]['S_Name'] ?? '')}`.trim()
      : '';
    const childName = parentRowIdx >= 0 && parentRowIdx < rows.length
      ? `${String(rows[parentRowIdx]['S_Vorname'] ?? '')} ${String(rows[parentRowIdx]['S_Name'] ?? '')}`.trim()
      : '';
    const parentName = parentRowIdx >= 0 && parentRowIdx < rows.length
      ? `${String(rows[parentRowIdx][parentField.replace('_ID', '_Vorname')] ?? '')} ${String(rows[parentRowIdx][parentField.replace('_ID', '_Name')] ?? '')}`.trim()
      : '';

    const ageHintMatch = err.message.match(/\(Altersunterschied ~(\d+) Jahre/);
    const ageHint = ageHintMatch ? `~${ageHintMatch[1]} Jahre Altersunterschied` : '';

    groups.push({
      overlappingId,
      parentField,
      studentRowIdx,
      parentRowIdx,
      studentName,
      parentName,
      childName,
      ageHint,
      errorRow: err.row,
    });
  }

  return groups;
}

export function StudentParentOverlapCard({ errors, rows, onBulkCorrect }: StudentParentOverlapCardProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const { toast } = useToast();

  const groups = useMemo(() => analyzeOverlaps(errors, rows), [errors, rows]);

  const unresolvedGroups = useMemo(
    () => groups.filter((_, i) => !resolvedIds.has(String(i))),
    [groups, resolvedIds]
  );

  const totalPages = Math.ceil(unresolvedGroups.length / ITEMS_PER_PAGE);
  const pagedGroups = unresolvedGroups.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const markAsCorrect = useCallback((groupIdx: number) => {
    // Mark the warning as resolved by setting correctedValue to current value (no change)
    const group = groups[groupIdx];
    onBulkCorrect([{
      row: group.errorRow,
      column: group.parentField,
      value: group.overlappingId,
    }], 'bulk');
    setResolvedIds(prev => new Set(prev).add(String(groupIdx)));
    toast({ title: 'Als korrekt markiert', description: `ID ${group.overlappingId} wurde als korrekter Eintrag markiert.` });
  }, [groups, onBulkCorrect, toast]);

  const markAllAsCorrect = useCallback(() => {
    const corrections = unresolvedGroups.map(g => ({
      row: g.errorRow,
      column: g.parentField,
      value: g.overlappingId,
    }));
    onBulkCorrect(corrections, 'bulk');
    const newResolved = new Set(resolvedIds);
    groups.forEach((_, i) => newResolved.add(String(i)));
    setResolvedIds(newResolved);
    toast({ title: 'Alle als korrekt markiert', description: `${unresolvedGroups.length} Überschneidungen als korrekt markiert.` });
  }, [unresolvedGroups, groups, resolvedIds, onBulkCorrect, toast]);

  const applyIdCorrection = useCallback((groupIdx: number, newId: string) => {
    const group = groups[groupIdx];
    onBulkCorrect([{
      row: group.errorRow,
      column: group.parentField,
      value: newId,
    }], 'bulk');
    setResolvedIds(prev => new Set(prev).add(String(groupIdx)));
    setEditingIdx(null);
    toast({ title: 'ID korrigiert', description: `${group.parentField} in Zeile ${group.errorRow} auf "${newId}" geändert.` });
  }, [groups, onBulkCorrect, toast]);

  if (groups.length === 0) return null;

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <CardTitle className="text-lg">Schüler-Eltern ID-Überschneidung</CardTitle>
            <Badge variant="outline" className="text-amber-500 border-amber-500/30">
              {unresolvedGroups.length} / {groups.length} offen
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {unresolvedGroups.length > 0 && (
              <Button
                onClick={markAllAsCorrect}
                className="gap-2 bg-amber-600 hover:bg-amber-700"
                size="sm"
              >
                <CheckCircle className="h-4 w-4" />
                Alle als korrekt markieren
              </Button>
            )}
          </div>
        </div>
        <CardDescription>
          Eine Eltern-ID stimmt mit einer bestehenden Schüler-ID überein. Bei mehrjährigen Imports kann dies korrekt sein (ehem. Schüler → Elternteil).
        </CardDescription>
      </CardHeader>

      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full flex items-center gap-2 justify-center">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {isOpen ? 'Einklappen' : 'Details anzeigen'}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-3 pt-2">
            {pagedGroups.map((group) => {
              const globalIdx = groups.indexOf(group);
              return (
                <div key={`${group.overlappingId}-${group.errorRow}`} className="border rounded-lg p-3 bg-background/50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs font-mono">{group.overlappingId}</Badge>
                        <span className="text-sm text-muted-foreground">{group.parentField}</span>
                      </div>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Schüler:</span>{' '}
                        <span className="font-medium">{group.studentName || '–'}</span>
                        <span className="text-muted-foreground"> (Zeile {group.studentRowIdx + 2})</span>
                      </p>
                      <p className="text-sm">
                        <span className="text-muted-foreground">Kind:</span>{' '}
                        <span className="font-medium">{group.childName || '–'}</span>
                        <span className="text-muted-foreground"> (Zeile {group.parentRowIdx + 2})</span>
                        {group.parentName && (
                          <span className="text-muted-foreground"> — Elternteil: {group.parentName}</span>
                        )}
                      </p>
                      {group.ageHint && (
                        <p className="text-xs text-amber-600">{group.ageHint} → möglicherweise ehem. Schüler</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => markAsCorrect(globalIdx)}
                        className="text-green-600 border-green-500/30 hover:bg-green-500/10"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Korrekt
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingIdx(globalIdx);
                          setEditValue(group.overlappingId);
                        }}
                        className="text-blue-600 border-blue-500/30 hover:bg-blue-500/10"
                      >
                        <Edit2 className="h-3 w-3 mr-1" />
                        Korrigieren
                      </Button>
                    </div>
                  </div>
                  {editingIdx === globalIdx && (
                    <div className="flex gap-2 items-center pt-1">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="max-w-xs text-sm"
                        placeholder="Neue ID eingeben"
                      />
                      <Button size="sm" onClick={() => applyIdCorrection(globalIdx, editValue)}>
                        Übernehmen
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingIdx(null)}>
                        Abbrechen
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}

            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 0}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Zurück
                </Button>
                <span className="text-sm text-muted-foreground">
                  Seite {currentPage + 1} von {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages - 1}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Weiter <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
