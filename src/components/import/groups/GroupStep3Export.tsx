import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, RotateCcw, Info } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { GroupData, StudentGroupAssignment } from '@/types/importTypes';
import { useToast } from '@/hooks/use-toast';

interface GroupStep3ExportProps {
  groups: GroupData[];
  assignments: StudentGroupAssignment[];
  onBack: () => void;
  onReset: () => void;
}

export function GroupStep3Export({ groups, assignments, onBack, onReset }: GroupStep3ExportProps) {
  const [schuljahr, setSchuljahr] = useState('');
  const [semester, setSemester] = useState('1');
  const [schuleinheiten, setSchuleinheiten] = useState('');
  const { toast } = useToast();

  const groupKeyToName = new Map(groups.map(g => [g.schluessel, g.name]));

  // Flatten: one row per student per group
  const flatAssignments = assignments.flatMap(a =>
    a.gruppenKeys.map(key => ({
      sId: a.sId,
      sName: a.sName,
      sVorname: a.sVorname,
      gruppenKey: key,
      gruppenName: groupKeyToName.get(key) || key,
    }))
  );

  const handleExportGroups = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Gruppen');

      ws.columns = [
        { header: 'Gruppe', key: 'gruppe', width: 30 },
        { header: 'Schlüssel', key: 'schluessel', width: 20 },
        { header: 'Lehrperson 1', key: 'lp1', width: 20 },
        { header: 'Lehrperson 2', key: 'lp2', width: 20 },
        { header: 'Lehrperson 3', key: 'lp3', width: 20 },
        { header: 'Lehrperson 4', key: 'lp4', width: 20 },
        { header: 'Lehrperson 5', key: 'lp5', width: 20 },
        { header: 'Lehrperson 6', key: 'lp6', width: 20 },
        { header: 'Lehrperson 7', key: 'lp7', width: 20 },
        { header: 'Lehrperson 8', key: 'lp8', width: 20 },
        { header: 'Schulfach', key: 'schulfach', width: 15 },
        { header: 'Schuleinheiten', key: 'schuleinheiten', width: 20 },
      ];

      // Style header row
      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };

      for (const group of groups) {
        ws.addRow({
          gruppe: group.name,
          schluessel: group.schluessel,
          lp1: group.lehrpersonen[0] || '',
          lp2: group.lehrpersonen[1] || '',
          lp3: group.lehrpersonen[2] || '',
          lp4: group.lehrpersonen[3] || '',
          lp5: group.lehrpersonen[4] || '',
          lp6: group.lehrpersonen[5] || '',
          lp7: group.lehrpersonen[6] || '',
          lp8: group.lehrpersonen[7] || '',
          schulfach: group.schulfach,
          schuleinheiten,
        });
      }

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), 'Gruppen-Importieren.xlsx');
      toast({ title: 'Export erfolgreich', description: 'Gruppen-Importieren.xlsx wurde heruntergeladen.' });
    } catch (err) {
      toast({ title: 'Export-Fehler', description: String(err), variant: 'destructive' });
    }
  };

  const handleExportAssignments = async () => {
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('SuS_Gruppen');

      ws.columns = [
        { header: 'Q_Schuljahr', key: 'schuljahr', width: 15 },
        { header: 'Q_Semester', key: 'semester', width: 12 },
        { header: 'S_ID', key: 'sid', width: 15 },
        { header: 'S_Gruppen', key: 'gruppen', width: 20 },
        { header: '(SuS Name)', key: 'name', width: 25 },
        { header: '(Gruppen Name)', key: 'gruppenName', width: 30 },
      ];

      const headerRow = ws.getRow(1);
      headerRow.font = { bold: true };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } };

      for (const a of flatAssignments) {
        ws.addRow({
          schuljahr,
          semester,
          sid: a.sId,
          gruppen: a.gruppenKey,
          name: `${a.sVorname} ${a.sName}`.trim(),
          gruppenName: a.gruppenName,
        });
      }

      const buffer = await wb.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), 'SuS_Gruppen_Import.xlsx');
      toast({ title: 'Export erfolgreich', description: 'SuS_Gruppen_Import.xlsx wurde heruntergeladen.' });
    } catch (err) {
      toast({ title: 'Export-Fehler', description: String(err), variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <Alert className="border-primary/30 bg-primary/5">
        <Info className="h-4 w-4" />
        <AlertDescription>
          Geben Sie Schuljahr, Semester und Schuleinheiten ein. Diese Werte werden in die Export-Dateien geschrieben.
          Die Spalten <code>(SuS Name)</code> und <code>(Gruppen Name)</code> dienen nur zur Verifikation und werden von PUPIL ignoriert.
        </AlertDescription>
      </Alert>

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Einstellungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="schuljahr">Schuljahr</Label>
              <Input
                id="schuljahr"
                placeholder="z.B. 2025/26"
                value={schuljahr}
                onChange={(e) => setSchuljahr(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Semester</Label>
              <Input
                id="semester"
                placeholder="z.B. 1"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schuleinheiten">Schuleinheiten</Label>
              <Input
                id="schuleinheiten"
                placeholder="z.B. Schuleinheit A"
                value={schuleinheiten}
                onChange={(e) => setSchuleinheiten(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview & Export: Groups */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Gruppen-Importieren.xlsx
                <Badge variant="secondary">{groups.length} Gruppen</Badge>
              </CardTitle>
              <CardDescription>Erstellt die Gruppen in PUPIL</CardDescription>
            </div>
            <Button onClick={handleExportGroups} disabled={groups.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Herunterladen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Gruppe</TableHead>
                  <TableHead>Schlüssel</TableHead>
                  <TableHead>LP 1</TableHead>
                  <TableHead>Schulfach</TableHead>
                  <TableHead>Schuleinheiten</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groups.map((g, i) => (
                  <TableRow key={i}>
                    <TableCell>{g.name}</TableCell>
                    <TableCell className="font-mono text-xs">{g.schluessel}</TableCell>
                    <TableCell>{g.lehrpersonen[0]}</TableCell>
                    <TableCell>{g.schulfach}</TableCell>
                    <TableCell>{schuleinheiten}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Preview & Export: Assignments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                SuS_Gruppen_Import.xlsx
                <Badge variant="secondary">{flatAssignments.length} Zuweisungen</Badge>
              </CardTitle>
              <CardDescription>Weist die Schüler den Gruppen zu</CardDescription>
            </div>
            <Button onClick={handleExportAssignments} disabled={flatAssignments.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Herunterladen
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {flatAssignments.length > 0 ? (
            <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Q_Schuljahr</TableHead>
                    <TableHead>Q_Semester</TableHead>
                    <TableHead>S_ID</TableHead>
                    <TableHead>S_Gruppen</TableHead>
                    <TableHead>(SuS Name)</TableHead>
                    <TableHead>(Gruppen Name)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flatAssignments.slice(0, 50).map((a, i) => (
                    <TableRow key={i}>
                      <TableCell>{schuljahr}</TableCell>
                      <TableCell>{semester}</TableCell>
                      <TableCell className="font-mono text-sm">{a.sId}</TableCell>
                      <TableCell className="font-mono text-xs">{a.gruppenKey}</TableCell>
                      <TableCell>{a.sVorname} {a.sName}</TableCell>
                      <TableCell>{a.gruppenName}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {flatAssignments.length > 50 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  ... und {flatAssignments.length - 50} weitere Zuweisungen
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Schüler-Zuweisungen vorhanden. Sie können diese in Schritt 2 hinzufügen.</p>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button variant="outline" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Neuer Import
        </Button>
      </div>
    </div>
  );
}
