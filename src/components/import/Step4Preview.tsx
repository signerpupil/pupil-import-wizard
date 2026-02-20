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
import type { ParsedRow, ValidationError, ColumnStatus, ChangeLogEntry } from '@/types/importTypes';
import type { CorrectionRule } from '@/types/correctionTypes';
import { exportToCSV, exportToExcel } from '@/lib/fileParser';
import { ColumnPaginatedPreview } from './ColumnPaginatedPreview';
import { NavigationButtons } from './NavigationButtons';
import { ChangeLog } from './ChangeLog';
import { CorrectionMemoryExport } from './CorrectionMemoryExport';

interface Step4PreviewProps {
  rows: ParsedRow[];
  headers: string[];
  errors: ValidationError[];
  columnStatuses: ColumnStatus[];
  removeExtraColumns: boolean;
  importTypeName: string;
  changeLog: ChangeLogEntry[];
  fileName?: string;
  onBack: () => void;
  onReset: () => void;
  // Correction memory props
  correctionRules?: CorrectionRule[];
  onExportCorrectionRules?: (rules: CorrectionRule[], fileName?: string) => void;
  onSaveCorrectionRulesToLocalStorage?: (rules: CorrectionRule[]) => void;
  onClearCorrectionRulesFromLocalStorage?: () => void;
  localStorageCorrectionRulesCount?: number;
}

export function Step4Preview({
  rows,
  headers,
  errors,
  columnStatuses,
  removeExtraColumns,
  importTypeName,
  changeLog,
  fileName,
  onBack,
  onReset,
  correctionRules = [],
  onExportCorrectionRules,
  onSaveCorrectionRulesToLocalStorage,
  onClearCorrectionRulesFromLocalStorage,
  localStorageCorrectionRulesCount = 0,
}: Step4PreviewProps) {
  const [exportFormat, setExportFormat] = useState<'csv' | 'xlsx'>('xlsx');
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

  const handleExport = async () => {
    const options = {
      onlyErrorFree: exportFilter === 'errorFree',
      errors,
      removeExtraColumns,
      expectedColumns,
    };

    if (exportFormat === 'csv') {
      exportToCSV(rows, headers, importTypeName, options);
    } else {
      await exportToExcel(rows, headers, importTypeName, options);
    }
    setExported(true);
  };

  // Build correction rules from change log
  const newCorrectionRules: CorrectionRule[] = changeLog
    .filter(entry => (entry.type === 'manual' || entry.type === 'bulk') && entry.originalValue !== entry.newValue)
    .map((entry, index) => ({
      id: `${Date.now()}-${index}`,
      column: entry.column,
      originalValue: entry.originalValue,
      correctedValue: entry.newValue,
      matchType: 'exact' as const,
      importType: 'schueler' as const, // TODO: Get from context
      createdAt: entry.timestamp.toISOString(),
      appliedCount: 0,
    }));

  // Combine existing rules with new ones (deduplicating)
  const allRules = [...correctionRules];
  for (const newRule of newCorrectionRules) {
    const exists = allRules.some(
      r => r.column === newRule.column && r.originalValue === newRule.originalValue
    );
    if (!exists) {
      allRules.push(newRule);
    }
  }

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
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (Semikolon-getrennt)</SelectItem>
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

      {/* Correction Memory Export */}
      {onExportCorrectionRules && onSaveCorrectionRulesToLocalStorage && onClearCorrectionRulesFromLocalStorage && (
        <CorrectionMemoryExport
          rules={allRules}
          fileName={fileName}
          importTypeName={importTypeName}
          onExportToFile={onExportCorrectionRules}
          onSaveToLocalStorage={onSaveCorrectionRulesToLocalStorage}
          onClearLocalStorage={onClearCorrectionRulesFromLocalStorage}
          localStorageCount={localStorageCorrectionRulesCount}
        />
      )}

      {/* Change Log */}
      <ChangeLog 
        entries={changeLog} 
        fileName={fileName}
        importTypeName={importTypeName}
      />

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
