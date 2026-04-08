import { useState, useMemo, useCallback } from 'react';
import { Users, CheckCircle, ChevronDown, ChevronUp, CreditCard, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import type { ParsedRow, ValidationError } from '@/types/importTypes';

interface StudentDeduplicationCardProps {
  errors: ValidationError[];
  rows: ParsedRow[];
  onBulkCorrect: (corrections: { row: number; column: string; value: string }[], correctionType?: 'bulk' | 'auto') => void;
}

interface StudentDuplicateGroup {
  identifier: string;
  matchMethod: 'ahv' | 'name_birthday';
  studentName: string;
  ids: Map<string, number[]>; // S_ID → row indices (0-based)
  suggestedId: string;
  rowIndices: number[];
}

const ITEMS_PER_PAGE = 5;

function analyzeStudentDuplicates(
  errors: ValidationError[],
  rows: ParsedRow[]
): StudentDuplicateGroup[] {
  const dedupErrors = errors.filter(e => e.type === 'student_duplicate_id' && !e.correctedValue);
  if (dedupErrors.length === 0) return [];

  // Group by identifier (stored in message)
  const groupMap = new Map<string, ValidationError[]>();
  for (const err of dedupErrors) {
    const match = err.message.match(/Identifikator: (.+?)(?:\s*→|$)/);
    const key = match ? match[1].trim() : err.message;
    const existing = groupMap.get(key);
    if (existing) existing.push(err);
    else groupMap.set(key, [err]);
  }

  const groups: StudentDuplicateGroup[] = [];

  for (const [identifier, errs] of groupMap) {
    const matchMethod = errs[0].message.includes('AHV') ? 'ahv' : 'name_birthday';
    
    // Rebuild from current row data
    const ids = new Map<string, number[]>();
    const allRowIndices: number[] = [];

    for (const err of errs) {
      const rowIdx = err.row - 2; // row is 1-based + header offset
      if (rowIdx < 0 || rowIdx >= rows.length) continue;
      const currentId = String(rows[rowIdx]['S_ID'] ?? '').trim();
      if (!currentId) continue;
      allRowIndices.push(rowIdx);
      const existing = ids.get(currentId);
      if (existing) existing.push(rowIdx);
      else ids.set(currentId, [rowIdx]);
    }

    // If all IDs are now the same, skip (already resolved)
    if (ids.size <= 1) continue;

    // Suggest the most frequent ID
    let suggestedId = '';
    let maxCount = 0;
    for (const [id, idxs] of ids) {
      if (idxs.length > maxCount) {
        maxCount = idxs.length;
        suggestedId = id;
      }
    }

    const firstRow = rows[allRowIndices[0]];
    const studentName = `${String(firstRow['S_Vorname'] ?? '').trim()} ${String(firstRow['S_Name'] ?? '').trim()}`.trim() || 'Unbekannt';

    groups.push({
      identifier,
      matchMethod,
      studentName,
      ids,
      suggestedId,
      rowIndices: allRowIndices,
    });
  }

  return groups;
}

export function StudentDeduplicationCard({ errors, rows, onBulkCorrect }: StudentDeduplicationCardProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [page, setPage] = useState(0);

  const groups = useMemo(() => analyzeStudentDuplicates(errors, rows), [errors, rows]);

  const totalPages = Math.ceil(groups.length / ITEMS_PER_PAGE);
  const pagedGroups = groups.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const handleUnifyGroup = useCallback((group: StudentDuplicateGroup) => {
    const corrections: { row: number; column: string; value: string }[] = [];
    for (const [id, idxs] of group.ids) {
      if (id === group.suggestedId) continue;
      for (const idx of idxs) {
        corrections.push({ row: idx, column: 'S_ID', value: group.suggestedId });
      }
    }
    if (corrections.length > 0) {
      onBulkCorrect(corrections, 'bulk');
      toast({
        title: 'S_ID vereinheitlicht',
        description: `${corrections.length} Zeile(n) für "${group.studentName}" auf ID "${group.suggestedId}" gesetzt.`,
      });
    }
  }, [onBulkCorrect, toast]);

  const handleUnifyAll = useCallback(() => {
    const corrections: { row: number; column: string; value: string }[] = [];
    for (const group of groups) {
      for (const [id, idxs] of group.ids) {
        if (id === group.suggestedId) continue;
        for (const idx of idxs) {
          corrections.push({ row: idx, column: 'S_ID', value: group.suggestedId });
        }
      }
    }
    if (corrections.length > 0) {
      onBulkCorrect(corrections, 'bulk');
      toast({
        title: 'Schüler-Deduplizierung',
        description: `${corrections.length} S_ID(s) über ${groups.length} Gruppe(n) vereinheitlicht.`,
      });
    }
  }, [groups, onBulkCorrect, toast]);

  if (groups.length === 0) return null;

  const totalAffectedRows = groups.reduce((sum, g) => {
    let count = 0;
    for (const [id, idxs] of g.ids) {
      if (id !== g.suggestedId) count += idxs.length;
    }
    return sum + count;
  }, 0);

  return (
    <Card className="border-purple-500/30 bg-purple-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">Schüler-Deduplizierung</CardTitle>
            <Badge variant="outline" className="text-purple-500 border-purple-500/30">
              {groups.length} {groups.length === 1 ? 'Person' : 'Personen'}
            </Badge>
            <Badge variant="outline" className="text-purple-500 border-purple-500/30">
              {totalAffectedRows} zu korrigierende Zeilen
            </Badge>
          </div>
          <Button
            onClick={handleUnifyAll}
            className="gap-2 bg-purple-600 hover:bg-purple-700"
            size="lg"
          >
            <CheckCircle className="h-4 w-4" />
            Alle {groups.length} vereinheitlichen
          </Button>
        </div>
        <CardDescription>
          Gleiche Schüler mit unterschiedlichen S_IDs erkannt (z.B. Primar- vs. Oberstufe). 
          Mit einem Klick alle auf die häufigste ID vereinheitlichen.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full justify-between text-muted-foreground">
              {isOpen ? 'Gruppen ausblenden' : 'Gruppen anzeigen'}
              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 mt-3">
            {pagedGroups.map((group, i) => (
              <div key={group.identifier} className="border rounded-lg p-4 space-y-2 bg-background/50">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">{group.studentName}</span>
                    <Badge variant="outline" className="text-xs">
                      {group.matchMethod === 'ahv' ? (
                        <><CreditCard className="h-3 w-3 mr-1" /> AHV</>
                      ) : (
                        <><User className="h-3 w-3 mr-1" /> Name+Gebdat</>
                      )}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnifyGroup(group)}
                    className="text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Vereinheitlichen → {group.suggestedId}
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Identifikator: {group.identifier}
                </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  {Array.from(group.ids.entries()).map(([id, idxs]) => (
                    <Badge
                      key={id}
                      variant={id === group.suggestedId ? 'default' : 'secondary'}
                      className={id === group.suggestedId ? 'bg-purple-600' : ''}
                    >
                      S_ID: {id} ({idxs.length}×, Zeilen {idxs.map(r => r + 2).join(', ')})
                    </Badge>
                  ))}
                </div>
              </div>
            ))}

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 0}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  Seite {page + 1} von {totalPages}
                </span>
                <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>
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
