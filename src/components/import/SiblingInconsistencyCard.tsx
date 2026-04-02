import { useState, useMemo, useCallback } from 'react';
import { Users, CheckCircle, ChevronDown, ChevronUp, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import type { ParsedRow, ValidationError } from '@/types/importTypes';
import { getOrteForPlz } from '@/lib/swissPlzData';

interface SiblingInconsistencyCardProps {
  errors: ValidationError[];
  rows: ParsedRow[];
  onBulkCorrect: (corrections: { row: number; column: string; value: string }[], correctionType?: 'bulk' | 'auto') => void;
}

interface SiblingFieldValues {
  field: string;
  values: Map<string, { count: number; childNames: string[]; rowNumbers: number[] }>;
  majorityValue: string;
}

interface SiblingFamilyGroup {
  parentId: string;
  idField: string;
  familyName: string;
  fields: SiblingFieldValues[];
  allRowNumbers: number[];
}

const ITEMS_PER_PAGE = 5;

/**
 * Parse sibling inconsistency errors and group by family (parentId).
 * Uses current row data to determine if inconsistencies still exist.
 */
function analyzeSiblingInconsistencies(
  errors: ValidationError[],
  rows: ParsedRow[]
): SiblingFamilyGroup[] {
  // Extract unique parentId + idField combinations from errors
  const siblingErrors = errors.filter(
    e => e.type === 'business' && e.message.includes('Geschwister-Inkonsistenz') && !e.correctedValue
  );

  // Parse parentId info from error messages
  const familyKeys = new Map<string, { idField: string; parentId: string; fields: Set<string> }>();

  for (const err of siblingErrors) {
    const match = err.message.match(/von\s+(P_ERZ\d_ID)="([^"]+)"/);
    if (!match) continue;
    const [, idField, parentId] = match;
    const key = `${idField}::${parentId}`;
    const existing = familyKeys.get(key);
    if (existing) {
      existing.fields.add(err.column);
    } else {
      familyKeys.set(key, { idField, parentId, fields: new Set([err.column]) });
    }
  }

  const groups: SiblingFamilyGroup[] = [];

  for (const [, { idField, parentId, fields }] of familyKeys) {
    // Find all rows belonging to this family from current data
    const familyRowIndices: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (String(rows[i][idField] ?? '').trim() === parentId) {
        familyRowIndices.push(i);
      }
    }
    if (familyRowIndices.length < 2) continue;

    // Get family name from first child
    const firstChild = rows[familyRowIndices[0]];
    const familyName = String(firstChild['S_Name'] ?? '').trim() || 'Unbekannt';

    // Analyze each field
    const fieldAnalyses: SiblingFieldValues[] = [];

    for (const field of fields) {
      const valueMap = new Map<string, { count: number; childNames: string[]; rowNumbers: number[] }>();

      for (const idx of familyRowIndices) {
        const val = String(rows[idx][field] ?? '').trim();
        if (val === '') continue;
        const existing = valueMap.get(val);
        const childName = `${rows[idx]['S_Vorname'] ?? ''} ${rows[idx]['S_Name'] ?? ''}`.trim();
        if (existing) {
          existing.count++;
          existing.childNames.push(childName);
          existing.rowNumbers.push(idx);
        } else {
          valueMap.set(val, { count: 1, childNames: [childName], rowNumbers: [idx] });
        }
      }

      // Only include if there's still an inconsistency
      if (valueMap.size > 1) {
        let maxCount = 0;
        let majorityValue = '';
        valueMap.forEach((info, val) => {
          if (info.count > maxCount) {
            maxCount = info.count;
            majorityValue = val;
          }
        });
        fieldAnalyses.push({ field, values: valueMap, majorityValue });
      }
    }

    if (fieldAnalyses.length > 0) {
      groups.push({
        parentId,
        idField,
        familyName,
        fields: fieldAnalyses,
        allRowNumbers: familyRowIndices,
      });
    }
  }

  return groups;
}

export function SiblingInconsistencyCard({ errors, rows, onBulkCorrect }: SiblingInconsistencyCardProps) {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [page, setPage] = useState(0);

  const groups = useMemo(() => analyzeSiblingInconsistencies(errors, rows), [errors, rows]);

  const totalPages = Math.ceil(groups.length / ITEMS_PER_PAGE);
  const paginatedGroups = groups.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const resolveAllMajority = useCallback(() => {
    const corrections: { row: number; column: string; value: string }[] = [];

    for (const group of groups) {
      for (const fieldInfo of group.fields) {
        fieldInfo.values.forEach((info, val) => {
          if (val !== fieldInfo.majorityValue) {
            for (const rowIdx of info.rowNumbers) {
              corrections.push({ row: rowIdx + 2, column: fieldInfo.field, value: fieldInfo.majorityValue });
            }
          }
        });
      }
    }

    if (corrections.length === 0) return;
    onBulkCorrect(corrections, 'bulk');
    toast({
      title: 'Geschwister-Inkonsistenzen aufgelöst',
      description: `${corrections.length} Werte in ${groups.length} Familien korrigiert.`,
    });
  }, [groups, onBulkCorrect, toast]);

  if (groups.length === 0) return null;

  const totalInconsistentFields = groups.reduce((sum, g) => sum + g.fields.length, 0);

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-lg">Geschwister-Konsistenz</CardTitle>
            <Badge variant="outline" className="text-amber-600 border-amber-500/30">
              {groups.length} {groups.length === 1 ? 'Familie' : 'Familien'}
            </Badge>
            <Badge variant="outline" className="text-amber-600 border-amber-500/30">
              {totalInconsistentFields} {totalInconsistentFields === 1 ? 'Feld' : 'Felder'}
            </Badge>
          </div>
          <Button
            onClick={resolveAllMajority}
            className="gap-2 bg-amber-600 hover:bg-amber-700"
            size="lg"
          >
            <CheckCircle className="h-4 w-4" />
            Alle Mehrheitswerte übernehmen
          </Button>
        </div>
        <CardDescription>
          Geschwister mit gleicher Eltern-ID haben unterschiedliche Adressdaten. Wählen Sie den korrekten Wert pro Familie.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Collapsible open={expanded} onOpenChange={setExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" className="w-full gap-2">
              {expanded ? (
                <><ChevronUp className="h-4 w-4" /> Details ausblenden</>
              ) : (
                <><ChevronDown className="h-4 w-4" /> Details anzeigen ({groups.length} Familien)</>
              )}
            </Button>
          </CollapsibleTrigger>

          <CollapsibleContent className="mt-4 space-y-3">
            <div className="space-y-3">
              {paginatedGroups.map((group, idx) => (
                <FamilyGroupCard
                  key={`${group.idField}-${group.parentId}`}
                  group={group}
                  onBulkCorrect={onBulkCorrect}
                />
              ))}
            </div>

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

function FamilyGroupCard({
  group,
  onBulkCorrect,
}: {
  group: SiblingFamilyGroup;
  onBulkCorrect: (corrections: { row: number; column: string; value: string }[], correctionType?: 'bulk' | 'auto') => void;
}) {
  const { toast } = useToast();
  // Track user selections per field
  const [selections, setSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of group.fields) {
      init[f.field] = f.majorityValue; // pre-select majority
    }
    return init;
  });

  // PLZ↔Ort coupling
  const handleSelection = useCallback((field: string, value: string) => {
    setSelections(prev => {
      const next = { ...prev, [field]: value };

      // If PLZ changed, auto-suggest matching Ort
      if (field === 'S_PLZ') {
        const ortField = group.fields.find(f => f.field === 'S_Ort');
        if (ortField) {
          const orte = getOrteForPlz(value);
          if (orte && orte.length === 1) {
            // Check if this Ort is among the options
            const ortValues = Array.from(ortField.values.keys());
            const matchingOrt = ortValues.find(o => o.toLowerCase() === orte[0].toLowerCase());
            if (matchingOrt) {
              next['S_Ort'] = matchingOrt;
            }
          }
        }
      }

      return next;
    });
  }, [group.fields]);

  const applySelection = useCallback(() => {
    const corrections: { row: number; column: string; value: string }[] = [];

    for (const fieldInfo of group.fields) {
      const selectedValue = selections[fieldInfo.field];
      if (!selectedValue) continue;

      fieldInfo.values.forEach((info, val) => {
        if (val !== selectedValue) {
          for (const rowIdx of info.rowNumbers) {
            corrections.push({ row: rowIdx + 2, column: fieldInfo.field, value: selectedValue });
          }
        }
      });
    }

    if (corrections.length === 0) return;
    onBulkCorrect(corrections, 'bulk');
    toast({
      title: 'Familie korrigiert',
      description: `${corrections.length} Werte für Familie ${group.familyName} angepasst.`,
    });
  }, [group, selections, onBulkCorrect, toast]);

  const applyMajority = useCallback(() => {
    const corrections: { row: number; column: string; value: string }[] = [];

    for (const fieldInfo of group.fields) {
      fieldInfo.values.forEach((info, val) => {
        if (val !== fieldInfo.majorityValue) {
          for (const rowIdx of info.rowNumbers) {
            corrections.push({ row: rowIdx + 2, column: fieldInfo.field, value: fieldInfo.majorityValue });
          }
        }
      });
    }

    if (corrections.length === 0) return;
    onBulkCorrect(corrections, 'bulk');
    toast({
      title: 'Mehrheitswert übernommen',
      description: `${corrections.length} Werte für Familie ${group.familyName} angepasst.`,
    });
  }, [group, onBulkCorrect, toast]);

  return (
    <div className="bg-background rounded-lg border overflow-hidden">
      <div className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Users className="h-4 w-4 text-amber-600" />
            <span className="font-semibold">Familie {group.familyName}</span>
            <Badge variant="outline" className="text-xs font-mono">
              {group.idField}="{group.parentId}"
            </Badge>
            <Badge variant="secondary" className="text-xs">
              {group.allRowNumbers.length} Kinder
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={applyMajority} className="gap-1.5">
              <CheckCircle className="h-3.5 w-3.5" />
              Mehrheitswert
            </Button>
            <Button size="sm" variant="default" onClick={applySelection} className="gap-1.5 bg-amber-600 hover:bg-amber-700">
              <MapPin className="h-3.5 w-3.5" />
              Auswahl anwenden
            </Button>
          </div>
        </div>

        {/* Fields with RadioGroups */}
        {group.fields.map(fieldInfo => (
          <FieldRadioGroup
            key={fieldInfo.field}
            fieldInfo={fieldInfo}
            selectedValue={selections[fieldInfo.field] ?? ''}
            onSelect={(val) => handleSelection(fieldInfo.field, val)}
          />
        ))}
      </div>
    </div>
  );
}

function FieldRadioGroup({
  fieldInfo,
  selectedValue,
  onSelect,
}: {
  fieldInfo: SiblingFieldValues;
  selectedValue: string;
  onSelect: (value: string) => void;
}) {
  const entries = Array.from(fieldInfo.values.entries()).sort((a, b) => b[1].count - a[1].count);

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-sm font-medium">{fieldInfo.field}</span>
        {entries.length === 2 && (
          <Badge variant="outline" className="text-xs text-amber-600 border-amber-400/50">
            Mehrheit: "{fieldInfo.majorityValue}"
          </Badge>
        )}
      </div>

      <RadioGroup value={selectedValue} onValueChange={onSelect} className="gap-1.5">
        {entries.map(([val, info]) => {
          const isMajority = val === fieldInfo.majorityValue;
          return (
            <div
              key={val}
              className={`flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 ${
                isMajority
                  ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800'
                  : 'bg-background border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value={val} id={`${fieldInfo.field}-${val}`} />
                <Label htmlFor={`${fieldInfo.field}-${val}`} className="cursor-pointer font-mono text-sm">
                  "{val}"
                </Label>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{info.count} {info.count === 1 ? 'Kind' : 'Kinder'}: {info.childNames.join(', ')}</span>
                {isMajority && (
                  <Badge className="bg-amber-100 text-amber-700 border-amber-300 text-[10px] dark:bg-amber-900/30 dark:text-amber-400">
                    Mehrheit
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </RadioGroup>
    </div>
  );
}
