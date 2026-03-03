import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GitCompareArrows, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import type { ClassTeacherData, PupilClass } from '@/types/importTypes';

interface LPComparisonCardProps {
  classData: ClassTeacherData[];
  pupilClasses: PupilClass[];
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function nameVariants(name: string): string[] {
  const norm = normalizeName(name);
  const parts = norm.split(/\s+/);
  if (parts.length >= 2) {
    const reversed = `${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`;
    return [norm, reversed];
  }
  return [norm];
}

function namesMatch(a: string, b: string): boolean {
  const aVars = nameVariants(a);
  const bVars = nameVariants(b);
  return aVars.some(av => bVars.some(bv => av === bv));
}

interface ClassComparison {
  klasse: string;
  pupilKlasse: string;
  onlyInLO: string[];
  onlyInPupil: string[];
  matching: string[];
  hasDifferences: boolean;
}

export function LPComparisonCard({ classData, pupilClasses }: LPComparisonCardProps) {
  const [showMatching, setShowMatching] = useState(false);
  const [filter, setFilter] = useState<'all' | 'diffs' | 'matching'>('all');

  const comparisons = useMemo(() => {
    const results: ClassComparison[] = [];

    // Build a map of LO class -> teacher names
    const loClassTeachers = new Map<string, string[]>();
    for (const cd of classData) {
      const existing = loClassTeachers.get(cd.klasse) || [];
      existing.push(...cd.teachers.map(t => t.name));
      loClassTeachers.set(cd.klasse, existing);
    }

    // Match each LO class to a PUPIL class and compare
    for (const [loKlasse, loTeachers] of loClassTeachers) {
      const loNorm = loKlasse.trim().toLowerCase();
      const pupilClass = pupilClasses.find(pc => pc.klassenname.trim().toLowerCase().startsWith(loNorm));

      if (!pupilClass || pupilClass.klassenlehrpersonen.length === 0) continue;

      // Compare using swapped name support
      const onlyInLO: string[] = [];
      const matching: string[] = [];
      const matchedPupilIndices = new Set<number>();

      for (const loName of loTeachers) {
        let found = false;
        for (let pi = 0; pi < pupilClass.klassenlehrpersonen.length; pi++) {
          if (matchedPupilIndices.has(pi)) continue;
          if (namesMatch(loName, pupilClass.klassenlehrpersonen[pi])) {
            matching.push(loName);
            matchedPupilIndices.add(pi);
            found = true;
            break;
          }
        }
        if (!found) onlyInLO.push(loName);
      }

      const onlyInPupil: string[] = [];
      for (let pi = 0; pi < pupilClass.klassenlehrpersonen.length; pi++) {
        if (!matchedPupilIndices.has(pi)) {
          onlyInPupil.push(pupilClass.klassenlehrpersonen[pi]);
        }
      }

      results.push({
        klasse: loKlasse,
        pupilKlasse: pupilClass.klassenname,
        onlyInLO,
        onlyInPupil,
        matching,
        hasDifferences: onlyInPupil.length > 0,
      });
    }

    return results.sort((a, b) => (a.hasDifferences === b.hasDifferences ? 0 : a.hasDifferences ? -1 : 1));
  }, [classData, pupilClasses]);

  if (comparisons.length === 0) return null;

  const withDiffs = comparisons.filter(c => c.hasDifferences);
  const withoutDiffs = comparisons.filter(c => !c.hasDifferences);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <GitCompareArrows className="h-5 w-5" />
          </div>
          <div>
            <CardTitle className="text-base">Vergleich PUPIL vs. LehrerOffice</CardTitle>
            <CardDescription>
              Klassenlehrpersonen aus PUPIL werden mit allen zugewiesenen LP aus LehrerOffice abgeglichen. 
              Dies dient zur Verifizierung der Klassenzuordnung — prüfen Sie insbesondere Klassen, 
              bei denen in PUPIL andere Klassenlehrpersonen hinterlegt sind als in LehrerOffice.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors border ${filter === 'all' ? 'ring-2 ring-ring ring-offset-1 bg-secondary text-secondary-foreground' : 'bg-secondary/60 text-secondary-foreground hover:bg-secondary'}`}
          >
            {comparisons.length} Klassen verglichen
          </button>
          {withDiffs.length > 0 && (
            <button
              onClick={() => setFilter('diffs')}
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors border-0 ${filter === 'diffs' ? 'ring-2 ring-ring ring-offset-1 bg-destructive/15 text-destructive' : 'bg-destructive/10 text-destructive hover:bg-destructive/15'}`}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {withDiffs.length} mit Unterschieden
            </button>
          )}
          <button
            onClick={() => setFilter('matching')}
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors border-0 ${filter === 'matching' ? 'ring-2 ring-ring ring-offset-1 bg-primary/15 text-primary' : 'bg-primary/10 text-primary hover:bg-primary/15'}`}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            {withoutDiffs.length} übereinstimmend
          </button>
        </div>

        {withDiffs.length > 0 && filter !== 'matching' && (
          <div className="border rounded-xl overflow-hidden">
            <div className="p-3 bg-destructive/[0.03] border-b">
              <p className="text-sm font-medium">Klassen mit Unterschieden</p>
            </div>
            <div className="max-h-[400px] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="bg-muted/50">Klasse</TableHead>
                    <TableHead className="bg-muted/50">Nur in PUPIL</TableHead>
                    <TableHead className="bg-muted/50">LP in LehrerOffice</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withDiffs.map(c => (
                    <TableRow key={c.klasse}>
                      <TableCell className="font-medium align-top">{c.klasse}</TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          {c.onlyInPupil.map(n => (
                            <Badge key={n} variant="outline" className="text-destructive border-destructive/30 block w-fit">
                              {n}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="space-y-1">
                          {c.matching.map(n => (
                            <Badge key={n} variant="outline" className="text-primary border-primary/30 block w-fit font-semibold">
                              ✓ {n}
                            </Badge>
                          ))}
                          {c.onlyInLO.map(n => (
                            <span key={n} className="text-muted-foreground text-sm block">{n}</span>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {withoutDiffs.length > 0 && filter !== 'diffs' && (
          <div className="border rounded-xl overflow-hidden">
            <button
              onClick={() => setShowMatching(!showMatching)}
              className="w-full p-3 cursor-pointer text-sm font-medium bg-primary/[0.03] hover:bg-primary/[0.05] transition-colors flex items-center gap-2"
            >
              {showMatching ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              Übereinstimmende Klassen anzeigen ({withoutDiffs.length})
            </button>
            {showMatching && (
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="bg-muted/50">Klasse</TableHead>
                      <TableHead className="bg-muted/50">Lehrpersonen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {withoutDiffs.map(c => (
                      <TableRow key={c.klasse}>
                        <TableCell className="font-medium">{c.klasse}</TableCell>
                        <TableCell>{c.matching.join(', ')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
