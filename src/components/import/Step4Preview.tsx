import { Download, FileSpreadsheet, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import type { ParsedRow, ValidationError } from '@/types/importTypes';
import { exportToCSV, exportToExcel } from '@/lib/fileParser';

interface Step4PreviewProps {
  rows: ParsedRow[];
  mappings: Record<string, string>;
  errors: ValidationError[];
  importTypeName: string;
  onBack: () => void;
  onReset: () => void;
}

export function Step4Preview({
  rows,
  mappings,
  errors,
  importTypeName,
  onBack,
  onReset,
}: Step4PreviewProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [exportFilter, setExportFilter] = useState<'all' | 'errorFree'>('all');
  const [exported, setExported] = useState(false);

  const activeMappings = Object.entries(mappings).filter(
    ([_, target]) => target !== '__skip__' && target !== ''
  );

  const errorRows = new Set(errors.filter(e => !e.correctedValue).map(e => e.row));
  const errorFreeCount = rows.length - errorRows.size;

  const handleExport = () => {
    const options = {
      onlyErrorFree: exportFilter === 'errorFree',
      errors,
      usePupilHeaders: true,
    };

    if (exportFormat === 'csv') {
      exportToCSV(rows, mappings, importTypeName, options);
    } else {
      exportToExcel(rows, mappings, importTypeName, options);
    }
    setExported(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Vorschau & Export</h2>
        <p className="text-muted-foreground mt-1">
          Überprüfen Sie die Daten und exportieren Sie die bereinigte Datei.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-primary">{rows.length}</p>
            <p className="text-sm text-muted-foreground">Datensätze</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-pupil-teal">{activeMappings.length}</p>
            <p className="text-sm text-muted-foreground">Zugeordnete Felder</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-pupil-success">{errorFreeCount}</p>
            <p className="text-sm text-muted-foreground">Fehlerfreie Zeilen</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-pupil-warning">
              {errors.filter(e => e.correctedValue).length}
            </p>
            <p className="text-sm text-muted-foreground">Korrekturen</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Export-Optionen</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Format</label>
              <Select value={exportFormat} onValueChange={(v) => setExportFormat(v as 'csv' | 'xlsx')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV (Semikolon-getrennt)</SelectItem>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Daten</label>
              <Select value={exportFilter} onValueChange={(v) => setExportFilter(v as 'all' | 'errorFree')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Datensätze ({rows.length})</SelectItem>
                  <SelectItem value="errorFree">Nur fehlerfreie ({errorFreeCount})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <Button size="lg" onClick={handleExport} className="gap-2">
              <Download className="h-5 w-5" />
              Bereinigte Datei exportieren
            </Button>
            {exported && (
              <Badge className="bg-pupil-success gap-1">
                <CheckCircle className="h-4 w-4" />
                Exportiert!
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Data Preview */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Datenvorschau (erste 10 Zeilen)</h3>
        <div className="border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-pupil-teal">
                  <TableHead className="text-pupil-teal-foreground w-16">#</TableHead>
                  {activeMappings.slice(0, 5).map(([source, target]) => (
                    <TableHead key={source} className="text-pupil-teal-foreground whitespace-nowrap">
                      {target}
                    </TableHead>
                  ))}
                  {activeMappings.length > 5 && (
                    <TableHead className="text-pupil-teal-foreground">
                      +{activeMappings.length - 5} weitere
                    </TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 10).map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                    {activeMappings.slice(0, 5).map(([source]) => (
                      <TableCell key={source} className="whitespace-nowrap">
                        {String(row[source] ?? '')}
                      </TableCell>
                    ))}
                    {activeMappings.length > 5 && (
                      <TableCell className="text-muted-foreground">...</TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button variant="outline" onClick={onReset}>
          Neuen Import starten
        </Button>
      </div>
    </div>
  );
}
