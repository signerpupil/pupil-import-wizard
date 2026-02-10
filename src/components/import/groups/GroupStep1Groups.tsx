import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Clipboard, Trash2, Info, Plus, BookOpen, CheckCircle2, Search, AlertTriangle, School } from 'lucide-react';
import type { GroupData } from '@/types/importTypes';
import type { SubjectMapping, PupilSubject } from '../GroupImportWizard';

interface GroupStep1GroupsProps {
  groups: GroupData[];
  onGroupsChange: (groups: GroupData[]) => void;
  subjectMap: SubjectMapping[];
  onSubjectMapChange: (map: SubjectMapping[]) => void;
  pupilSubjects: PupilSubject[];
  onPupilSubjectsChange: (subjects: PupilSubject[]) => void;
  onBack: () => void;
  onNext: () => void;
}

function generateKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'GRP_';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function parseGroupData(text: string): { groups: GroupData[]; skippedAutomatic: number; skippedInactive: number } {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length < 2) return { groups: [], skippedAutomatic: 0, skippedInactive: 0 };

  let headerRowIndex = -1;
  let headerCols: string[] = [];
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const cols = lines[i].split('\t');
    if (cols.some(c => c.trim() === 'Lehrperson 1')) {
      headerRowIndex = i;
      headerCols = cols.map(c => c.trim());
      break;
    }
  }

  if (headerRowIndex === -1) {
    return { groups: [], skippedAutomatic: 0, skippedInactive: 0 };
  }

  const colIndex = {
    name: 0,
    status: headerCols.findIndex(c => c.startsWith('Im ') || c === 'Status') >= 0
      ? headerCols.findIndex(c => c.startsWith('Im ') || c === 'Status')
      : 1,
    schulfach: headerCols.indexOf('Schulfach'),
    selektion: headerCols.indexOf('Selektion'),
    schluessel: headerCols.indexOf('Schlüssel'),
    lp: [] as number[],
  };

  for (let i = 1; i <= 8; i++) {
    const idx = headerCols.indexOf(`Lehrperson ${i}`);
    if (idx >= 0) colIndex.lp.push(idx);
  }

  const firstRowCols = lines[0].split('\t').map(c => c.trim());
  const statusIdx = firstRowCols.indexOf('Status');
  if (statusIdx >= 0 && colIndex.status <= 1) {
    colIndex.status = statusIdx;
  }

  const groups: GroupData[] = [];
  let skippedAutomatic = 0;
  let skippedInactive = 0;

  for (let i = headerRowIndex + 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const name = cols[colIndex.name]?.trim() || '';
    const status = cols[colIndex.status]?.trim() || '';
    const selektion = colIndex.selektion >= 0 ? (cols[colIndex.selektion]?.trim() || '') : '';
    const schulfach = colIndex.schulfach >= 0 ? (cols[colIndex.schulfach]?.trim() || '') : '';
    const schluessel = colIndex.schluessel >= 0 ? (cols[colIndex.schluessel]?.trim() || '') : '';

    if (!status && !selektion && !schulfach) continue;

    if (status !== 'aktiv') {
      skippedInactive++;
      continue;
    }

    if (selektion.toLowerCase().startsWith('automatisch')) {
      skippedAutomatic++;
      continue;
    }

    const lehrpersonen = colIndex.lp.map(idx => cols[idx]?.trim() || '').filter(Boolean);

    groups.push({
      name,
      schluessel: schluessel || generateKey(),
      schulfach,
      lehrpersonen: [...lehrpersonen, ...Array(8 - lehrpersonen.length).fill('')].slice(0, 8),
    });
  }

  return { groups, skippedAutomatic, skippedInactive };
}

function parseSubjectData(text: string): SubjectMapping[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  const subjects: SubjectMapping[] = [];

  for (const line of lines) {
    const cols = line.split('\t').map(c => c.trim());
    if (cols.length < 5) continue;

    const fachname = cols[0];
    const kuerzel = cols[4];
    const schluessel = cols.length > 7 ? cols[7] : '';
    const zeugnisname = cols.length > 8 ? cols[8] : '';

    if (!fachname || !kuerzel) continue;
    if (fachname.toLowerCase() === 'fach') continue;
    if (fachname.toLowerCase() === 'schulfächer') continue;
    if (cols.slice(1).every(c => !c)) continue;

    subjects.push({ fachname, kuerzel, schluessel, zeugnisname });
  }

  return subjects;
}

function parsePupilSubjects(text: string): PupilSubject[] {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  const subjects: PupilSubject[] = [];

  for (const line of lines) {
    const cols = line.split('\t').map(c => c.trim());
    const name = cols[0] || '';
    // Try to find a schluessel-like column (short code)
    const schluessel = cols.length > 1 ? cols[1] : '';

    if (!name) continue;
    // Skip obvious headers
    if (name.toLowerCase() === 'fach' || name.toLowerCase() === 'name' || name.toLowerCase() === 'bezeichnung') continue;

    subjects.push({ name, schluessel });
  }

  return subjects;
}

export function GroupStep1Groups({ groups, onGroupsChange, subjectMap, onSubjectMapChange, pupilSubjects, onPupilSubjectsChange, onBack, onNext }: GroupStep1GroupsProps) {
  const [pasteText, setPasteText] = useState('');
  const [parseStats, setParseStats] = useState<{ skippedAutomatic: number; skippedInactive: number } | null>(null);
  const [subjectPasteText, setSubjectPasteText] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [pupilPasteText, setPupilPasteText] = useState('');
  const [pupilFilter, setPupilFilter] = useState('');

  const handleParse = () => {
    const result = parseGroupData(pasteText);
    
    if (subjectMap.length > 0) {
      const kuerzelToName = new Map(subjectMap.map(s => [s.kuerzel, s.fachname]));
      const updatedGroups = result.groups.map(g => ({
        ...g,
        schulfach: kuerzelToName.get(g.schulfach) || g.schulfach,
      }));
      onGroupsChange(updatedGroups);
    } else {
      onGroupsChange(result.groups);
    }
    setParseStats({ skippedAutomatic: result.skippedAutomatic, skippedInactive: result.skippedInactive });
  };

  const handleParseSubjects = () => {
    const parsed = parseSubjectData(subjectPasteText);
    onSubjectMapChange(parsed);

    if (groups.length > 0 && parsed.length > 0) {
      const kuerzelToName = new Map(parsed.map(s => [s.kuerzel, s.fachname]));
      const updatedGroups = groups.map(g => ({
        ...g,
        schulfach: kuerzelToName.get(g.schulfach) || g.schulfach,
      }));
      onGroupsChange(updatedGroups);
    }
  };

  const handleParsePupilSubjects = () => {
    const parsed = parsePupilSubjects(pupilPasteText);
    onPupilSubjectsChange(parsed);
  };

  const handleRemoveGroup = (index: number) => {
    onGroupsChange(groups.filter((_, i) => i !== index));
  };

  const handleAddGroup = () => {
    onGroupsChange([...groups, {
      name: '',
      schluessel: generateKey(),
      schulfach: '',
      lehrpersonen: Array(8).fill(''),
    }]);
  };

  const handleGroupFieldChange = (index: number, field: keyof GroupData, value: string) => {
    const updated = [...groups];
    if (field === 'lehrpersonen') return;
    updated[index] = { ...updated[index], [field]: value };
    onGroupsChange(updated);
  };

  const handleLPChange = (groupIndex: number, lpIndex: number, value: string) => {
    const updated = [...groups];
    const lps = [...updated[groupIndex].lehrpersonen];
    lps[lpIndex] = value;
    updated[groupIndex] = { ...updated[groupIndex], lehrpersonen: lps };
    onGroupsChange(updated);
  };

  // Compare group subjects against PUPIL subjects
  const missingSubjects = useMemo(() => {
    if (groups.length === 0 || pupilSubjects.length === 0) return [];
    const pupilNames = new Set(pupilSubjects.map(s => s.name.toLowerCase()));
    const usedSubjects = new Set(groups.map(g => g.schulfach).filter(Boolean));
    const missing: string[] = [];
    usedSubjects.forEach(subject => {
      if (!pupilNames.has(subject.toLowerCase())) {
        missing.push(subject);
      }
    });
    return missing;
  }, [groups, pupilSubjects]);

  const handleReassignSubject = (oldSubject: string, newSubject: string) => {
    const updatedGroups = groups.map(g =>
      g.schulfach === oldSubject ? { ...g, schulfach: newSubject } : g
    );
    onGroupsChange(updatedGroups);
  };

  const filteredSubjects = subjectMap.filter(s =>
    !subjectFilter ||
    s.fachname.toLowerCase().includes(subjectFilter.toLowerCase()) ||
    s.kuerzel.toLowerCase().includes(subjectFilter.toLowerCase()) ||
    s.schluessel.toLowerCase().includes(subjectFilter.toLowerCase())
  );

  const filteredPupilSubjects = pupilSubjects.filter(s =>
    !pupilFilter ||
    s.name.toLowerCase().includes(pupilFilter.toLowerCase()) ||
    s.schluessel.toLowerCase().includes(pupilFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Anleitung:</strong> Fügen Sie zuerst die <strong>Fächerübersicht</strong> aus LehrerOffice ein,
          dann die <strong>Fächer aus PUPIL</strong>, und zuletzt die <strong>Gruppenübersicht</strong>.
          Fehlende Fächer werden automatisch erkannt.
        </AlertDescription>
      </Alert>

      {/* Subject Mapping from LehrerOffice */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            1. Fächerübersicht aus LehrerOffice
          </CardTitle>
          <CardDescription>
            Fächer aus LehrerOffice einfügen, um Kürzel automatisch durch Fachnamen zu ersetzen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Fächerübersicht aus LehrerOffice hier einfügen (Tab-getrennt: Fach, Typ, Jahresnote, ..., Kürzel, ..., Schlüssel, Im Zeugnis)..."
            rows={4}
            value={subjectPasteText}
            onChange={(e) => setSubjectPasteText(e.target.value)}
            className="font-mono text-xs"
          />
          <Button onClick={handleParseSubjects} disabled={!subjectPasteText.trim()} variant="secondary">
            <BookOpen className="h-4 w-4 mr-2" />
            Fächer erkennen
          </Button>

          {subjectMap.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {subjectMap.length} Fächer erkannt
                </Badge>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Fächer filtern..."
                    value={subjectFilter}
                    onChange={(e) => setSubjectFilter(e.target.value)}
                    className="h-9 pl-8 text-sm"
                  />
                </div>
              </div>
              <div className="max-h-[250px] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-background">Fachname</TableHead>
                      <TableHead className="sticky top-0 bg-background">Kürzel (LO)</TableHead>
                      <TableHead className="sticky top-0 bg-background">Schlüssel</TableHead>
                      <TableHead className="sticky top-0 bg-background">Im Zeugnis</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubjects.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.fachname}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{s.kuerzel}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{s.schluessel}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{s.zeugnisname}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PUPIL Subjects */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            2. Fächer aus PUPIL
          </CardTitle>
          <CardDescription>
            Fächerliste aus PUPIL einfügen, um zu prüfen ob alle benötigten Fächer vorhanden sind
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Fächerliste aus PUPIL hier einfügen (Tab-getrennt, z.B. Fachname und Schlüssel)..."
            rows={4}
            value={pupilPasteText}
            onChange={(e) => setPupilPasteText(e.target.value)}
            className="font-mono text-xs"
          />
          <Button onClick={handleParsePupilSubjects} disabled={!pupilPasteText.trim()} variant="secondary">
            <School className="h-4 w-4 mr-2" />
            PUPIL-Fächer erkennen
          </Button>

          {pupilSubjects.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  {pupilSubjects.length} PUPIL-Fächer erkannt
                </Badge>
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="PUPIL-Fächer filtern..."
                    value={pupilFilter}
                    onChange={(e) => setPupilFilter(e.target.value)}
                    className="h-9 pl-8 text-sm"
                  />
                </div>
              </div>
              <div className="max-h-[200px] overflow-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-background">Fachname</TableHead>
                      <TableHead className="sticky top-0 bg-background">Schlüssel</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPupilSubjects.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{s.schluessel}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Groups paste */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clipboard className="h-5 w-5" />
            3. Gruppen aus LehrerOffice einfügen
          </CardTitle>
          <CardDescription>
            Kopierte Tabelle (Tab-getrennt) hier einfügen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Hier die kopierte Tabelle aus LehrerOffice einfügen..."
            rows={8}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            className="font-mono text-xs"
          />
          <Button onClick={handleParse} disabled={!pasteText.trim()}>
            Gruppen erkennen
          </Button>

          {parseStats && (
            <div className="flex gap-2 flex-wrap">
              <Badge variant="default">{groups.length} manuelle Gruppen erkannt</Badge>
              {parseStats.skippedAutomatic > 0 && (
                <Badge variant="secondary">{parseStats.skippedAutomatic} automatische Gruppen übersprungen</Badge>
              )}
              {parseStats.skippedInactive > 0 && (
                <Badge variant="outline">{parseStats.skippedInactive} inaktive Gruppen übersprungen</Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Missing subjects warning */}
      {missingSubjects.length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertTriangle className="h-5 w-5" />
              Fehlende Fächer in PUPIL ({missingSubjects.length})
            </CardTitle>
            <CardDescription className="text-orange-700">
              Diese Fächer werden von Gruppen verwendet, sind aber nicht in PUPIL vorhanden.
              Sie können ein anderes PUPIL-Fach zuweisen oder die Fächer zuerst in PUPIL erfassen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {missingSubjects.map((subject) => {
                const affectedGroups = groups.filter(g => g.schulfach === subject);
                return (
                  <div key={subject} className="flex items-center gap-3 p-3 bg-background rounded-lg border">
                    <div className="flex-1">
                      <div className="font-medium text-sm">{subject}</div>
                      <div className="text-xs text-muted-foreground">
                        Betrifft {affectedGroups.length} Gruppe{affectedGroups.length !== 1 ? 'n' : ''}: {affectedGroups.map(g => g.name).join(', ')}
                      </div>
                    </div>
                    <Select onValueChange={(val) => {
                      if (val !== '__skip__') {
                        handleReassignSubject(subject, val);
                      }
                    }}>
                      <SelectTrigger className="w-[220px] h-9 text-sm">
                        <SelectValue placeholder="Anderes Fach zuweisen..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__" className="text-muted-foreground italic">
                          In PUPIL erfassen (nicht ändern)
                        </SelectItem>
                        {pupilSubjects.map((ps) => (
                          <SelectItem key={ps.name} value={ps.name}>
                            {ps.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Show success if all subjects matched */}
      {groups.length > 0 && pupilSubjects.length > 0 && missingSubjects.length === 0 && (
        <Alert className="border-green-300 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-700" />
          <AlertDescription className="text-green-800">
            <strong>Alle Fächer vorhanden!</strong> Alle in den Gruppen verwendeten Fächer sind in PUPIL erfasst.
          </AlertDescription>
        </Alert>
      )}

      {groups.length > 0 && (
        <>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Zurück
          </Button>
          <Button onClick={onNext} disabled={groups.length === 0}>
            Weiter
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Erkannte Gruppen ({groups.length})</CardTitle>
              <Button variant="outline" size="sm" onClick={handleAddGroup}>
                <Plus className="h-4 w-4 mr-1" />
                Gruppe hinzufügen
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Gruppe</TableHead>
                    <TableHead className="min-w-[140px]">Schlüssel</TableHead>
                    <TableHead className="min-w-[100px]">Schulfach</TableHead>
                    <TableHead className="min-w-[150px]">Lehrperson 1</TableHead>
                    <TableHead className="min-w-[150px]">Lehrperson 2</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {groups.map((group, idx) => (
                    <TableRow key={idx}>
                      <TableCell>
                        <Input
                          value={group.name}
                          onChange={(e) => handleGroupFieldChange(idx, 'name', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={group.schluessel}
                          onChange={(e) => handleGroupFieldChange(idx, 'schluessel', e.target.value)}
                          className="h-8 text-sm font-mono"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={group.schulfach}
                          onChange={(e) => handleGroupFieldChange(idx, 'schulfach', e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={group.lehrpersonen[0] || ''}
                          onChange={(e) => handleLPChange(idx, 0, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={group.lehrpersonen[1] || ''}
                          onChange={(e) => handleLPChange(idx, 1, e.target.value)}
                          className="h-8 text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveGroup(idx)}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
        </>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button onClick={onNext} disabled={groups.length === 0}>
          Weiter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
