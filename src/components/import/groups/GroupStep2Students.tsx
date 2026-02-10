import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowRight, Upload, FileKey, Info, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { parseFile } from '@/lib/fileParser';
import type { GroupData, StudentGroupAssignment } from '@/types/importTypes';
import { useToast } from '@/hooks/use-toast';

interface GroupStep2StudentsProps {
  groups: GroupData[];
  assignments: StudentGroupAssignment[];
  onAssignmentsChange: (assignments: StudentGroupAssignment[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function GroupStep2Students({ groups, assignments, onAssignmentsChange, onBack, onNext }: GroupStep2StudentsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [mappingFileName, setMappingFileName] = useState<string | null>(null);
  const [idMapping, setIdMapping] = useState<Map<string, string>>(new Map());
  const [stats, setStats] = useState<{ total: number; matched: number; unmatched: number } | null>(null);
  const { toast } = useToast();

  const groupKeySet = new Set(groups.map(g => g.schluessel));
  const groupKeyToName = new Map(groups.map(g => [g.schluessel, g.name]));

  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    try {
      const result = await parseFile(file);
      setFileName(file.name);

      // Extract S_ID, S_Gruppen, S_Name, S_Vorname
      const newAssignments: StudentGroupAssignment[] = [];
      let matched = 0;
      let unmatched = 0;

      for (const row of result.rows) {
        const sId = String(row['S_ID'] ?? '').trim();
        if (!sId) continue;

        const sName = String(row['S_Name'] ?? '').trim();
        const sVorname = String(row['S_Vorname'] ?? '').trim();
        const gruppenRaw = String(row['S_Gruppen'] ?? '').trim();

        if (!gruppenRaw) continue;

        // Split by comma or semicolon
        const allKeys = gruppenRaw.split(/[,;]/).map(k => k.trim()).filter(Boolean);
        const matchedKeys = allKeys.filter(k => groupKeySet.has(k));

        if (matchedKeys.length > 0) {
          matched++;
          // Apply ID mapping if available
          const finalId = idMapping.get(sId) || sId;
          newAssignments.push({
            sId: finalId,
            sName,
            sVorname,
            gruppenKeys: matchedKeys,
          });
        } else {
          unmatched++;
        }
      }

      onAssignmentsChange(newAssignments);
      setStats({ total: result.rows.length, matched, unmatched });

      toast({
        title: 'Schülerdaten geladen',
        description: `${matched} Schüler mit passenden Gruppenzuweisungen gefunden.`,
      });
    } catch (err) {
      toast({
        title: 'Fehler beim Laden',
        description: String(err),
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [groups, groupKeySet, idMapping, onAssignmentsChange, toast]);

  const handleMappingUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await parseFile(file);
      const mapping = new Map<string, string>();

      // Look for two columns: first = LO-ID (S_ID), second = PUPIL-ID
      const headers = result.headers;
      if (headers.length < 2) {
        toast({ title: 'Fehler', description: 'Mapping-Datei benötigt mindestens 2 Spalten (LO-ID, PUPIL-ID)', variant: 'destructive' });
        return;
      }

      for (const row of result.rows) {
        const loId = String(row[headers[0]] ?? '').trim();
        const pupilId = String(row[headers[1]] ?? '').trim();
        if (loId && pupilId) {
          mapping.set(loId, pupilId);
        }
      }

      setIdMapping(mapping);
      setMappingFileName(file.name);

      // Re-apply mapping to existing assignments
      if (assignments.length > 0) {
        const updated = assignments.map(a => ({
          ...a,
          sId: mapping.get(a.sId) || a.sId,
        }));
        onAssignmentsChange(updated);
      }

      toast({
        title: 'Schlüssel-Mapping geladen',
        description: `${mapping.size} ID-Zuordnungen geladen.`,
      });
    } catch (err) {
      toast({ title: 'Fehler', description: String(err), variant: 'destructive' });
    }
  }, [assignments, onAssignmentsChange, toast]);

  const handleRemoveAssignment = (index: number) => {
    onAssignmentsChange(assignments.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Laden Sie die Schülerdaten aus LehrerOffice (CSV oder Excel). Die Spalten <code>S_ID</code> und <code>S_Gruppen</code> werden
          ausgelesen. Nur Zuweisungen, deren Gruppenschlüssel mit den erkannten manuellen Gruppen übereinstimmen, werden übernommen.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Student file upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Upload className="h-5 w-5" />
              Schülerdaten hochladen
            </CardTitle>
            <CardDescription>CSV oder Excel mit S_ID und S_Gruppen</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
            {fileName && (
              <p className="text-sm text-muted-foreground mt-2">Geladen: {fileName}</p>
            )}
          </CardContent>
        </Card>

        {/* Optional PUPIL key mapping */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileKey className="h-5 w-5" />
              PUPIL-Schlüsselabgleich (optional)
            </CardTitle>
            <CardDescription>CSV/Excel: Spalte 1 = LO-ID, Spalte 2 = PUPIL-ID</CardDescription>
          </CardHeader>
          <CardContent>
            <Input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleMappingUpload}
            />
            {mappingFileName && (
              <p className="text-sm text-muted-foreground mt-2">
                Mapping: {mappingFileName} ({idMapping.size} Zuordnungen)
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {stats && (
        <div className="flex gap-2 flex-wrap">
          <Badge variant="default">{stats.matched} Schüler mit Gruppenzuweisungen</Badge>
          <Badge variant="secondary">{stats.total} Zeilen total</Badge>
          {stats.unmatched > 0 && (
            <Badge variant="outline">{stats.unmatched} ohne passende Gruppe</Badge>
          )}
        </div>
      )}

      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Zuweisungen ({assignments.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>S_ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Vorname</TableHead>
                    <TableHead>Gruppen</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-sm">{a.sId}</TableCell>
                      <TableCell>{a.sName}</TableCell>
                      <TableCell>{a.sVorname}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {a.gruppenKeys.map((key, ki) => (
                            <Badge key={ki} variant="secondary" className="text-xs">
                              {groupKeyToName.get(key) || key}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveAssignment(idx)}
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
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button onClick={onNext}>
          Weiter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
