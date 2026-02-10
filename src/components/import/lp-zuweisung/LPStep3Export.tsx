import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

    // Header
    sheet.columns = [
      { header: 'LP Name', key: 'lpName', width: 30 },
      { header: 'LP Schlüssel', key: 'lpSchluessel', width: 15 },
      { header: 'Rolle', key: 'rolle', width: 25 },
      { header: 'Klasse', key: 'klasse', width: 30 },
      { header: 'Fach', key: 'fach', width: 25 },
    ];

    // Style header
    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2EFDA' },
    };

    // Add data
    for (const a of assignments) {
      const row = sheet.addRow({
        lpName: a.lpName,
        lpSchluessel: a.lpSchluessel,
        rolle: a.rolle,
        klasse: a.klasse,
        fach: 'Fächer der Stundentafel',
      });

      // Highlight rows without key
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export-Vorschau
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Badge variant="secondary">{assignments.length} Zuweisungen total</Badge>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              {validAssignments.length} mit Schlüssel
            </Badge>
            {missingKeys.length > 0 && (
              <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {missingKeys.length} ohne Schlüssel
              </Badge>
            )}
          </div>

          {missingKeys.length > 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm text-amber-800">
                {missingKeys.length} Zuweisungen haben keinen PUPIL-Schlüssel und sind im Export gelb markiert.
                Gehen Sie zurück zu Schritt 2, um diese manuell zuzuordnen.
              </AlertDescription>
            </Alert>
          )}

          <div className="border rounded-lg overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky top-0 bg-background">LP Name</TableHead>
                  <TableHead className="sticky top-0 bg-background">LP Schlüssel</TableHead>
                  <TableHead className="sticky top-0 bg-background">Rolle</TableHead>
                  <TableHead className="sticky top-0 bg-background">Klasse</TableHead>
                  <TableHead className="sticky top-0 bg-background">Fach</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageAssignments.map((a, i) => (
                  <TableRow key={i} className={!a.lpSchluessel ? 'bg-amber-50' : ''}>
                    <TableCell className="font-medium">{a.lpName}</TableCell>
                    <TableCell>
                      {a.lpSchluessel ? (
                        <Badge variant="outline">{a.lpSchluessel}</Badge>
                      ) : (
                        <span className="text-amber-600 text-sm">fehlt</span>
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
              >
                Weiter
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <div className="flex gap-3">
          <Button variant="outline" onClick={onReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Neuer Import
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            LP-Zuteilung.xlsx herunterladen
          </Button>
        </div>
      </div>
    </div>
  );
}
