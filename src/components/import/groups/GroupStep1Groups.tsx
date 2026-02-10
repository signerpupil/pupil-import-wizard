import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowRight, Clipboard, Trash2, Info, Plus, BookOpen, CheckCircle2, Search } from 'lucide-react';
import type { GroupData } from '@/types/importTypes';
import type { SubjectMapping } from '../GroupImportWizard';

interface GroupStep1GroupsProps {
  groups: GroupData[];
  onGroupsChange: (groups: GroupData[]) => void;
  subjectMap: SubjectMapping[];
  onSubjectMapChange: (map: SubjectMapping[]) => void;
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
  // The pasted data is tab-separated: Ordnung | Fachname | Fachname Zeugnis | Kürzel | Fachbereich | Farbe | Niveau
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length === 0) return [];

  const subjects: SubjectMapping[] = [];

  for (const line of lines) {
    const cols = line.split('\t').map(c => c.trim());
    // Need at least 4 columns (Ordnung, Fachname, Fachname Zeugnis, Kürzel)
    if (cols.length < 4) continue;

    const ordnung = cols[0];
    const fachname = cols[1];
    const kuerzel = cols[3];
    const fachbereich = cols[4] || '';

    // Skip header row
    if (ordnung.toLowerCase() === 'ordnung') continue;

    // Only include entries with a kürzel
    if (fachname && kuerzel) {
      subjects.push({ ordnung, fachname, kuerzel, fachbereich });
    }
  }

  return subjects;
}

export function GroupStep1Groups({ groups, onGroupsChange, subjectMap, onSubjectMapChange, onBack, onNext }: GroupStep1GroupsProps) {
  const [pasteText, setPasteText] = useState('');
  const [parseStats, setParseStats] = useState<{ skippedAutomatic: number; skippedInactive: number } | null>(null);
  const [subjectPasteText, setSubjectPasteText] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');

  const handleParse = () => {
    const result = parseGroupData(pasteText);
    
    // If subject map is loaded, replace kürzel with fachname in schulfach field
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

    // If groups already loaded, update schulfach with fachname
    if (groups.length > 0 && parsed.length > 0) {
      const kuerzelToName = new Map(parsed.map(s => [s.kuerzel, s.fachname]));
      const updatedGroups = groups.map(g => ({
        ...g,
        schulfach: kuerzelToName.get(g.schulfach) || g.schulfach,
      }));
      onGroupsChange(updatedGroups);
    }
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

  const filteredSubjects = subjectMap.filter(s =>
    !subjectFilter ||
    s.fachname.toLowerCase().includes(subjectFilter.toLowerCase()) ||
    s.kuerzel.toLowerCase().includes(subjectFilter.toLowerCase()) ||
    s.fachbereich.toLowerCase().includes(subjectFilter.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Anleitung:</strong> Öffnen Sie in LehrerOffice die Gruppenübersicht, markieren Sie alle Zeilen
          (inkl. Header) und kopieren Sie diese (Ctrl+C). Fügen Sie die Daten unten ein. Nur manuelle,
          aktive Gruppen werden übernommen.
        </AlertDescription>
      </Alert>

      {/* Subject Mapping - optional, before groups */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Fächerübersicht (optional)
          </CardTitle>
          <CardDescription>
            Fächer aus PUPIL einfügen, um Kürzel automatisch durch Fachnamen zu ersetzen
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="Fächerübersicht aus PUPIL hier einfügen (Tab-getrennt: Ordnung, Fachname, Fachname Zeugnis, Kürzel, Fachbereich, ...)..."
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
                      <TableHead className="sticky top-0 bg-background">Kürzel</TableHead>
                      <TableHead className="sticky top-0 bg-background">Fachbereich</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubjects.map((s, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{s.fachname}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">{s.kuerzel}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{s.fachbereich}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clipboard className="h-5 w-5" />
            Gruppen aus LehrerOffice einfügen
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
