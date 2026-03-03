import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Upload, CheckCircle2, AlertTriangle, Users, School, Wand2 } from 'lucide-react';
import { parseFile } from '@/lib/fileParser';
import type { ClassTeacherData, PupilPerson, PupilClass, TeacherAssignment } from '@/types/importTypes';
import { PUPILInstructionGuide } from './PUPILInstructionGuide';
import { PUPILClassesInstructionGuide } from './PUPILClassesInstructionGuide';

interface LPStep2TeachersProps {
  classData: ClassTeacherData[];
  persons: PupilPerson[];
  onPersonsChange: (persons: PupilPerson[]) => void;
  pupilClasses: PupilClass[];
  onPupilClassesChange: (classes: PupilClass[]) => void;
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

function matchClassToPupil(loKlasse: string, pupilClasses: PupilClass[]): string | null {
  const loNorm = loKlasse.trim().toLowerCase();
  for (const pc of pupilClasses) {
    const pupilNorm = pc.klassenname.trim().toLowerCase();
    if (pupilNorm.startsWith(loNorm)) {
      return pc.klassenname;
    }
  }
  return null;
}

export function LPStep2Teachers({
  classData, persons, onPersonsChange, pupilClasses, onPupilClassesChange,
  assignments, onAssignmentsChange, onBack, onNext,
}: LPStep2TeachersProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [classFileLoading, setClassFileLoading] = useState(false);
  const [classFileError, setClassFileError] = useState<string | null>(null);
  const [manualOverrides, setManualOverrides] = useState<Map<string, string>>(new Map());
  const [manualClassOverrides, setManualClassOverrides] = useState<Map<string, string>>(new Map());

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

  // Class matching results (includes manual overrides)
  const classMatchResults = useMemo(() => {
    if (pupilClasses.length === 0) return [];
    const uniqueClasses = [...new Set(classData.map(cd => cd.klasse))];
    return uniqueClasses.map(klasse => {
      const manualMatch = manualClassOverrides.get(klasse);
      if (manualMatch) {
        const pc = pupilClasses.find(p => p.klassenname === manualMatch);
        return { loKlasse: klasse, pupilKlasse: pc?.klassenname || null };
      }
      return {
        loKlasse: klasse,
        pupilKlasse: matchClassToPupil(klasse, pupilClasses),
      };
    });
  }, [classData, pupilClasses, manualClassOverrides]);

  const classesMatched = classMatchResults.filter(r => r.pupilKlasse);
  const classesUnmatched = classMatchResults.filter(r => !r.pupilKlasse);

  // Free PUPIL classes (not yet assigned to any LO class)
  const assignedPupilNames = useMemo(() => {
    return new Set(classesMatched.map(r => r.pupilKlasse!));
  }, [classesMatched]);

  const freePupilClasses = useMemo(() => {
    return pupilClasses.filter(pc => !assignedPupilNames.has(pc.klassenname));
  }, [pupilClasses, assignedPupilNames]);

  // Build class mapping for assignments
  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of classMatchResults) {
      if (r.pupilKlasse) {
        map.set(r.loKlasse, r.pupilKlasse);
      }
    }
    return map;
  }, [classMatchResults]);

  const handleManualClassOverride = (loKlasse: string, pupilKlasse: string) => {
    setManualClassOverrides(prev => {
      const next = new Map(prev);
      if (pupilKlasse === '__none__') {
        next.delete(loKlasse);
      } else {
        next.set(loKlasse, pupilKlasse);
      }
      return next;
    });
  };

  // Pattern detection: try fuzzy strategies on unmatched classes against free PUPIL classes
  const classPatternSuggestions = useMemo(() => {
    if (classesUnmatched.length === 0 || freePupilClasses.length === 0) return [];

    const suggestions: { loKlasse: string; pupilKlasse: string; pattern: string }[] = [];
    const usedPupil = new Set<string>();

    for (const um of classesUnmatched) {
      // Already manually overridden — skip
      if (manualClassOverrides.has(um.loKlasse)) continue;

      const loNorm = um.loKlasse.trim().toLowerCase().replace(/\s+/g, '');

      for (const pc of freePupilClasses) {
        if (usedPupil.has(pc.klassenname)) continue;
        const pupilNorm = pc.klassenname.trim().toLowerCase().replace(/\s+/g, '');

        // Strategy 1: whitespace-insensitive startsWith
        if (pupilNorm.startsWith(loNorm)) {
          suggestions.push({ loKlasse: um.loKlasse, pupilKlasse: pc.klassenname, pattern: 'Leerzeichen-tolerant' });
          usedPupil.add(pc.klassenname);
          break;
        }

        // Strategy 2: PUPIL name contains the LO name (substring)
        if (pupilNorm.includes(loNorm) && loNorm.length >= 3) {
          suggestions.push({ loKlasse: um.loKlasse, pupilKlasse: pc.klassenname, pattern: 'Enthält LO-Name' });
          usedPupil.add(pc.klassenname);
          break;
        }
      }
    }

    return suggestions;
  }, [classesUnmatched, freePupilClasses, manualClassOverrides]);

  const handleApplyPatternSuggestions = () => {
    setManualClassOverrides(prev => {
      const next = new Map(prev);
      for (const s of classPatternSuggestions) {
        next.set(s.loKlasse, s.pupilKlasse);
      }
      return next;
    });
  };

  useEffect(() => {
    if (persons.length === 0) return;
    
    const matchMap = new Map(matchResults.map(r => [r.name, r.person]));
    const newAssignments: TeacherAssignment[] = [];

    for (const cd of classData) {
      const resolvedKlasse = classMap.get(cd.klasse) || cd.klasse;
      for (const t of cd.teachers) {
        const person = matchMap.get(t.name);
        newAssignments.push({
          klasse: resolvedKlasse,
          lpName: person ? `${person.nachname} ${person.vorname}` : t.name,
          rolle: t.rolle,
          lpSchluessel: person?.schluessel || '',
        });
      }
    }

    onAssignmentsChange(newAssignments);
  }, [matchResults, classData, persons, classMap, onAssignmentsChange]);

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

  const handleClassFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setClassFileLoading(true);
    setClassFileError(null);

    try {
      const result = await parseFile(file);
      const headers = result.headers.map(h => h.toLowerCase().trim());

      const klassennameIdx = headers.findIndex(h => h.includes('klassenname') || h === 'klassenname');

      if (klassennameIdx === -1) {
        setClassFileError('Spalte "Klassenname" nicht gefunden. Bitte prüfen Sie die Datei.');
        setClassFileLoading(false);
        return;
      }

      // Also find Klassenlehrpersonen column
      const klpIdx = headers.findIndex(h => h.includes('klassenlehrpersonen'));

      const parsed: PupilClass[] = result.rows
        .filter(row => {
          const name = String(row[result.headers[klassennameIdx]] || '').trim();
          return name.length > 0;
        })
        .map(row => {
          const klpRaw = klpIdx !== -1 ? String(row[result.headers[klpIdx]] || '').trim() : '';
          return {
            klassenname: String(row[result.headers[klassennameIdx]] || '').trim(),
            klassenlehrpersonen: klpRaw ? klpRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
          };
        });

      onPupilClassesChange(parsed);
    } catch (err) {
      setClassFileError(`Fehler beim Verarbeiten der Datei: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setClassFileLoading(false);
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
      {/* Personen Upload */}
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
          <PUPILInstructionGuide />
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

      {/* PUPIL Klassen Upload */}
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <School className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">PUPIL-Klassen Datei hochladen</CardTitle>
              <CardDescription>Excel mit Klassenname (PUPIL-Export Klassen)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Die LO-Klassennamen werden mit den vollständigen PUPIL-Klassennamen abgeglichen (z.B. "KG 1 Br a" → "KG 1 Br a Primarschule Brunegg").
          </p>
          <PUPILClassesInstructionGuide />
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleClassFileUpload}
              className="block text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 file:shadow-sm file:cursor-pointer"
              disabled={classFileLoading}
            />
            {pupilClasses.length > 0 && (
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0">
                <School className="h-3 w-3 mr-1" />
                {pupilClasses.length} Klassen geladen
              </Badge>
            )}
          </div>
          {classFileError && (
            <Alert variant="destructive">
              <AlertDescription>{classFileError}</AlertDescription>
            </Alert>
          )}
          {pupilClasses.length > 0 && classMatchResults.length > 0 && (
            <div className="flex gap-3 pt-2">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {classesMatched.length} Klassen zugeordnet
              </Badge>
              {classesUnmatched.length > 0 && (
                <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 border-0">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {classesUnmatched.length} nicht zugeordnet
                </Badge>
              )}
            </div>
          )}
          {pupilClasses.length > 0 && classesUnmatched.length > 0 && classPatternSuggestions.length > 0 && (
            <div className="border rounded-xl overflow-hidden bg-accent/30">
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" />
                  <p className="text-sm">
                    <span className="font-medium">{classPatternSuggestions.length} Klassen</span> können per Muster zugeordnet werden
                    <span className="text-muted-foreground ml-1">({classPatternSuggestions[0].pattern})</span>
                  </p>
                </div>
                <Button size="sm" onClick={handleApplyPatternSuggestions} className="shrink-0">
                  <Wand2 className="h-3.5 w-3.5 mr-1.5" />
                  Muster anwenden
                </Button>
              </div>
              <div className="px-3 pb-3">
                <div className="flex flex-wrap gap-1.5">
                  {classPatternSuggestions.slice(0, 5).map(s => (
                    <Badge key={s.loKlasse} variant="secondary" className="text-xs">
                      {s.loKlasse} → {s.pupilKlasse.length > 30 ? s.pupilKlasse.slice(0, 30) + '…' : s.pupilKlasse}
                    </Badge>
                  ))}
                  {classPatternSuggestions.length > 5 && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      +{classPatternSuggestions.length - 5} weitere
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          )}
          {pupilClasses.length > 0 && classesUnmatched.length > 0 && (
            <div className="border rounded-xl overflow-hidden">
              <div className="p-3 bg-destructive/[0.03] border-b">
                <p className="text-sm font-medium">
                  Folgende LO-Klassen konnten keiner PUPIL-Klasse zugeordnet werden:
                </p>
              </div>
              <div className="max-h-[300px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="bg-muted/50">LO-Klasse</TableHead>
                      <TableHead className="bg-muted/50">Status</TableHead>
                      {freePupilClasses.length > 0 && (
                        <TableHead className="bg-muted/50">PUPIL-Klasse zuweisen</TableHead>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classesUnmatched.map((r) => (
                      <TableRow key={r.loKlasse}>
                        <TableCell className="font-medium">{r.loKlasse}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-amber-600 border-amber-300">
                            LO-Name wird verwendet
                          </Badge>
                        </TableCell>
                        {freePupilClasses.length > 0 && (
                          <TableCell>
                            <Select
                              value={manualClassOverrides.get(r.loKlasse) || '__none__'}
                              onValueChange={(val) => handleManualClassOverride(r.loKlasse, val)}
                            >
                              <SelectTrigger className="w-[280px] h-8 text-sm">
                                <SelectValue placeholder="PUPIL-Klasse wählen…" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="__none__">— Keine Zuordnung —</SelectItem>
                                {freePupilClasses.map(pc => (
                                  <SelectItem key={pc.klassenname} value={pc.klassenname}>
                                    {pc.klassenname}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          {pupilClasses.length > 0 && classesMatched.length > 0 && (
            <details className="border rounded-xl overflow-hidden">
              <summary className="p-3 cursor-pointer text-sm font-medium bg-primary/[0.03] hover:bg-primary/[0.05] transition-colors">
                Zugeordnete Klassen anzeigen ({classesMatched.length})
              </summary>
              <div className="max-h-[200px] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="bg-muted/50">LO-Klasse</TableHead>
                      <TableHead className="bg-muted/50">PUPIL-Klassenname</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classesMatched.map((r) => (
                      <TableRow key={r.loKlasse}>
                        <TableCell>{r.loKlasse}</TableCell>
                        <TableCell className="font-medium">{r.pupilKlasse}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </details>
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
