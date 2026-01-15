import { Download, CheckCircle, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import type { ParsedRow, ValidationError, ColumnStatus } from '@/types/importTypes';
import { exportToCSV, exportToExcel } from '@/lib/fileParser';
import { ColumnPaginatedPreview } from './ColumnPaginatedPreview';
import { NavigationButtons } from './NavigationButtons';

interface Step4PreviewProps {
  rows: ParsedRow[];
  headers: string[];
  errors: ValidationError[];
  columnStatuses: ColumnStatus[];
  removeExtraColumns: boolean;
  importTypeName: string;
  onBack: () => void;
  onReset: () => void;
}

export function Step4Preview({
  rows,
  headers,
  errors,
  columnStatuses,
  removeExtraColumns,
  importTypeName,
  onBack,
  onReset,
}: Step4PreviewProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('csv');
  const [exportFilter, setExportFilter] = useState<'all' | 'errorFree'>('all');
  const [exported, setExported] = useState(false);

  const uncorrectedErrors = errors.filter(e => !e.correctedValue);
  const errorRows = new Set(uncorrectedErrors.map(e => e.row));
  const errorFreeCount = rows.length - errorRows.size;
  const correctedCount = errors.filter(e => e.correctedValue).length;

  // Get expected column names
  const expectedColumns = columnStatuses
    .filter(c => c.status !== 'extra')
    .map(c => c.name);

  // Determine export headers
  const exportHeaders = removeExtraColumns
    ? headers.filter(h => expectedColumns.includes(h))
    : headers;

  const handleExport = () => {
    const options = {
      onlyErrorFree: exportFilter === 'errorFree',
      errors,
      removeExtraColumns,
      expectedColumns,
    };

    if (exportFormat === 'csv') {
      exportToCSV(rows, headers, importTypeName, options);
    } else {
      exportToExcel(rows, headers, importTypeName, options);
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
            <p className="text-3xl font-bold text-pupil-teal">{exportHeaders.length}</p>
            <p className="text-sm text-muted-foreground">Spalten (Export)</p>
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
            <p className="text-3xl font-bold text-pupil-warning">{correctedCount}</p>
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

          {removeExtraColumns && (
            <p className="text-sm text-muted-foreground mt-4">
              ℹ️ Zusätzliche Spalten werden beim Export entfernt ({headers.length - exportHeaders.length} Spalte(n))
            </p>
          )}

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

      {/* Navigation buttons above table */}
      <NavigationButtons
        onBack={onBack}
        showNext={false}
      />

      {/* Data Preview */}
      <ColumnPaginatedPreview
        headers={exportHeaders}
        rows={rows.slice(0, 10)}
        title="Datenvorschau (erste 10 Zeilen)"
        showRowNumbers={true}
      />

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
