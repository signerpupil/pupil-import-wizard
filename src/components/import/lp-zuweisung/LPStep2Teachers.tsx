import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, AlertTriangle, Users } from 'lucide-react';
import { parseFile } from '@/lib/fileParser';
import type { ClassTeacherData, PupilPerson, TeacherAssignment } from '@/types/importTypes';

interface LPStep2TeachersProps {
  classData: ClassTeacherData[];
  persons: PupilPerson[];
  onPersonsChange: (persons: PupilPerson[]) => void;
  assignments: TeacherAssignment[];
  onAssignmentsChange: (assignments: TeacherAssignment[]) => void;
  onBack: () => void;
  onNext: () => void;
}

function normalizeName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function buildLookupMap(persons: PupilPerson[]): Map<string, PupilPerson> {
  const map = new Map<string, PupilPerson>();
  for (const p of persons) {
    const key1 = normalizeName(`${p.nachname} ${p.vorname}`);
    map.set(key1, p);
    const key2 = normalizeName(`${p.vorname} ${p.nachname}`);
    if (!map.has(key2)) map.set(key2, p);
  }
  return map;
}

function matchTeacher(
  name: string,
  lookupMap: Map<string, PupilPerson>,
  manualOverrides: Map<string, string>,
  persons: PupilPerson[]
): PupilPerson | null {
  const override = manualOverrides.get(name);
  if (override) {
    return persons.find(p => p.schluessel === override) || null;
  }

  const normalized = normalizeName(name);
  
  const direct = lookupMap.get(normalized);
  if (direct) return direct;

  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    const reversed = normalizeName(`${parts[parts.length - 1]} ${parts.slice(0, -1).join(' ')}`);
    const rev = lookupMap.get(reversed);
    if (rev) return rev;
  }

  return null;
}

export function LPStep2Teachers({
  classData, persons, onPersonsChange, assignments, onAssignmentsChange,
  onBack, onNext,
}: LPStep2TeachersProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [manualOverrides, setManualOverrides] = useState<Map<string, string>>(new Map());

  const uniqueTeacherNames = useMemo(() => {
    const names = new Set<string>();
    classData.forEach(cd => cd.teachers.forEach(t => names.add(t.name)));
    return Array.from(names).sort();
  }, [classData]);

  const lookupMap = useMemo(() => buildLookupMap(persons), [persons]);

  const matchResults = useMemo(() => {
    return uniqueTeacherNames.map(name => ({
      name,
      person: matchTeacher(name, lookupMap, manualOverrides, persons),
    }));
  }, [uniqueTeacherNames, lookupMap, manualOverrides, persons]);

  const matched = matchResults.filter(r => r.person);
  const unmatched = matchResults.filter(r => !r.person);

  useEffect(() => {
    if (persons.length === 0) return;
    
    const matchMap = new Map(matchResults.map(r => [r.name, r.person]));
    const newAssignments: TeacherAssignment[] = [];

    for (const cd of classData) {
      for (const t of cd.teachers) {
        const person = matchMap.get(t.name);
        newAssignments.push({
          klasse: cd.klasse,
          lpName: person ? `${person.nachname} ${person.vorname}` : t.name,
          rolle: t.rolle,
          lpSchluessel: person?.schluessel || '',
        });
      }
    }

    onAssignmentsChange(newAssignments);
  }, [matchResults, classData, persons, onAssignmentsChange]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await parseFile(file);
      const headers = result.headers.map(h => h.toLowerCase().trim());

      const nachnameIdx = headers.findIndex(h => h.includes('nachname') || h === 'name');
      const vornameIdx = headers.findIndex(h => h.includes('vorname'));
      const schluesselIdx = headers.findIndex(h => h.includes('schlüssel') || h.includes('schluessel') || h === 'schluessel');

      if (nachnameIdx === -1 || vornameIdx === -1 || schluesselIdx === -1) {
        setError('Spalten "Nachname", "Vorname" und "Schlüssel" nicht gefunden. Bitte prüfen Sie die Datei.');
        setIsLoading(false);
        return;
      }

      const parsedPersons: PupilPerson[] = result.rows
        .filter(row => {
          const nachname = String(row[result.headers[nachnameIdx]] || '').trim();
          const schluessel = String(row[result.headers[schluesselIdx]] || '').trim();
          return nachname && schluessel;
        })
        .map(row => ({
          nachname: String(row[result.headers[nachnameIdx]] || '').trim(),
          vorname: String(row[result.headers[vornameIdx]] || '').trim(),
          schluessel: String(row[result.headers[schluesselIdx]] || '').trim(),
        }));

      onPersonsChange(parsedPersons);
    } catch (err) {
      setError(`Fehler beim Verarbeiten der Datei: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualOverride = (teacherName: string, schluessel: string) => {
    setManualOverrides(prev => {
      const next = new Map(prev);
      if (schluessel === '__none__') {
        next.delete(teacherName);
      } else {
        next.set(teacherName, schluessel);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6">
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Upload className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Personen-PUPIL Datei hochladen</CardTitle>
              <CardDescription>Excel/CSV mit Nachname, Vorname, Schlüssel</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Die LP-Namen aus Schritt 1 werden automatisch mit den PUPIL-Schlüsseln abgeglichen.
          </p>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="block text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:shadow-sm file:cursor-pointer"
              disabled={isLoading}
            />
            {persons.length > 0 && (
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0">
                <Users className="h-3 w-3 mr-1" />
                {persons.length} Personen geladen
              </Badge>
            )}
          </div>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {persons.length > 0 && (
        <>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack} className="shadow-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <Button onClick={onNext} disabled={persons.length === 0} className="shadow-sm">
            Weiter
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Zuordnungsergebnisse</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {matched.length} zugeordnet
              </Badge>
              {unmatched.length > 0 && (
                <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 border-0">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {unmatched.length} nicht zugeordnet
                </Badge>
              )}
            </div>

            {unmatched.length > 0 && (
              <div className="border rounded-xl overflow-hidden">
                <div className="p-3 bg-destructive/[0.03] border-b">
                  <p className="text-sm font-medium">
                    Folgende Lehrpersonen konnten nicht automatisch zugeordnet werden:
                  </p>
                </div>
                <div className="max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="bg-muted/50">LP Name (aus LO)</TableHead>
                        <TableHead className="bg-muted/50">Manuelle Zuordnung</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unmatched.map((r) => (
                        <TableRow key={r.name}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell>
                            <Select
                              value={manualOverrides.get(r.name) || '__none__'}
                              onValueChange={(v) => handleManualOverride(r.name, v)}
                            >
                              <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="Person auswählen..." />
                              </SelectTrigger>
                              <SelectContent className="bg-popover z-50">
                                <SelectItem value="__none__">— Nicht zuordnen —</SelectItem>
                                {persons.map((p) => (
                                  <SelectItem key={p.schluessel} value={p.schluessel}>
                                    {p.nachname} {p.vorname} ({p.schluessel})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {matched.length > 0 && (
              <details className="border rounded-xl overflow-hidden">
                <summary className="p-3 cursor-pointer text-sm font-medium bg-primary/[0.03] hover:bg-primary/[0.05] transition-colors">
                  Erfolgreich zugeordnete Lehrpersonen anzeigen ({matched.length})
                </summary>
                <div className="max-h-[300px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="bg-muted/50">LP Name (aus LO)</TableHead>
                        <TableHead className="bg-muted/50">PUPIL-Schlüssel</TableHead>
                        <TableHead className="bg-muted/50">Name (PUPIL)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matched.map((r) => (
                        <TableRow key={r.name}>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{r.person!.schluessel}</Badge>
                          </TableCell>
                          <TableCell>{r.person!.nachname} {r.person!.vorname}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </details>
            )}
          </CardContent>
        </Card>
        </>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="shadow-sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <Button onClick={onNext} disabled={persons.length === 0} className="shadow-sm">
          Weiter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
