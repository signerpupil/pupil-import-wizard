import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Download, RotateCcw, AlertTriangle, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import type { TeacherAssignment } from '@/types/importTypes';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface LPStep3ExportProps {
  assignments: TeacherAssignment[];
  onBack: () => void;
  onReset: () => void;
}

const PAGE_SIZE = 50;

export function LPStep3Export({ assignments, onBack, onReset }: LPStep3ExportProps) {
  const [page, setPage] = useState(0);

  const missingKeys = assignments.filter(a => !a.lpSchluessel);
  const validAssignments = assignments.filter(a => a.lpSchluessel);
  const totalPages = Math.ceil(assignments.length / PAGE_SIZE);
  const pageAssignments = assignments.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleExport = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('LP-Zuteilung');

    sheet.columns = [
      { header: 'LP Name', key: 'lpName', width: 30 },
      { header: 'LP Schlüssel', key: 'lpSchluessel', width: 15 },
      { header: 'Rolle', key: 'rolle', width: 25 },
      { header: 'Klasse', key: 'klasse', width: 30 },
      { header: 'Fach', key: 'fach', width: 25 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2EFDA' },
    };

    for (const a of assignments) {
      const row = sheet.addRow({
        lpName: a.lpName,
        lpSchluessel: a.lpSchluessel,
        rolle: a.rolle,
        klasse: a.klasse,
        fach: 'Fächer der Stundentafel',
      });

      if (!a.lpSchluessel) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFF2CC' },
        };
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(blob, 'LP-Zuteilung.xlsx');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="shadow-sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onReset} className="shadow-sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Neuer Import
          </Button>
          <Button onClick={handleExport} className="shadow-md">
            <Download className="h-4 w-4 mr-2" />
            LP-Zuteilung.xlsx herunterladen
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Export-Vorschau</CardTitle>
              <CardDescription>LP-Zuteilung.xlsx</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Badge variant="secondary">{assignments.length} Zuweisungen total</Badge>
            <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-0">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {validAssignments.length} mit Schlüssel
            </Badge>
            {missingKeys.length > 0 && (
              <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 border-0">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {missingKeys.length} ohne Schlüssel
              </Badge>
            )}
          </div>

          {missingKeys.length > 0 && (
            <Alert className="border-destructive/20 bg-destructive/[0.03]">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              <AlertDescription className="text-sm">
                {missingKeys.length} Zuweisungen haben keinen PUPIL-Schlüssel und sind im Export gelb markiert.
                Gehen Sie zurück zu Schritt 2, um diese manuell zuzuordnen.
              </AlertDescription>
            </Alert>
          )}

          <div className="border rounded-xl overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-muted/50 backdrop-blur-sm">LP Name</TableHead>
                  <TableHead className="sticky top-0 bg-muted/50 backdrop-blur-sm">LP Schlüssel</TableHead>
                  <TableHead className="sticky top-0 bg-muted/50 backdrop-blur-sm">Rolle</TableHead>
                  <TableHead className="sticky top-0 bg-muted/50 backdrop-blur-sm">Klasse</TableHead>
                  <TableHead className="sticky top-0 bg-muted/50 backdrop-blur-sm">Fach</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageAssignments.map((a, i) => (
                  <TableRow key={i} className={!a.lpSchluessel ? 'bg-destructive/[0.03]' : ''}>
                    <TableCell className="font-medium">{a.lpName}</TableCell>
                    <TableCell>
                      {a.lpSchluessel ? (
                        <Badge variant="outline">{a.lpSchluessel}</Badge>
                      ) : (
                        <span className="text-destructive text-sm">fehlt</span>
                      )}
                    </TableCell>
                    <TableCell>{a.rolle}</TableCell>
                    <TableCell>{a.klasse}</TableCell>
                    <TableCell>Fächer der Stundentafel</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="shadow-sm"
              >
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
                className="shadow-sm"
              >
                Weiter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} className="shadow-sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onReset} className="shadow-sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Neuer Import
          </Button>
          <Button onClick={handleExport} className="shadow-md">
            <Download className="h-4 w-4 mr-2" />
            LP-Zuteilung.xlsx herunterladen
          </Button>
        </div>
      </div>
    </div>
  );
}
