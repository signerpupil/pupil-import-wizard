import { useState, useCallback, useMemo } from 'react';
import { WizardProgress, type WizardStep } from '@/components/import/WizardProgress';
import { Step1FileUpload } from '@/components/import/Step1FileUpload';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ArrowLeft, ArrowRight, UserCog, Download, Check, Pencil, AlertTriangle } from 'lucide-react';
import { NavigationButtons } from './NavigationButtons';
import type { ParsedRow } from '@/types/importTypes';
import type { ParseResult } from '@/lib/fileParser';
import { mapHeaders, BERUF_PRESETS, exportLehrpersonenToXlsx } from '@/lib/lehrpersonenExport';
import { useToast } from '@/hooks/use-toast';
import { findDuplicateEmails, type EmailDuplicate } from '@/lib/lehrpersonenEmailCheck';

const wizardSteps: WizardStep[] = [
  { label: 'Datei hochladen', description: 'CSV oder Excel' },
  { label: 'Beruf festlegen', description: 'Rolle konfigurieren' },
  { label: 'Export', description: 'XLSX herunterladen' },
];

interface LehrpersonenImportWizardProps {
  onReset: () => void;
}

export function LehrpersonenImportWizard({ onReset }: LehrpersonenImportWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [defaultBeruf, setDefaultBeruf] = useState('Lehrperson');
  const [customBeruf, setCustomBeruf] = useState('');
  const [rowBerufOverrides, setRowBerufOverrides] = useState<Record<number, string>>({});
  const [editingRow, setEditingRow] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const effectiveBeruf = customBeruf || defaultBeruf;

  const handleNext = useCallback(() => {
    const nextStep = Math.min(currentStep + 1, 2);
    setCurrentStep(nextStep);
    setMaxVisitedStep(prev => Math.max(prev, nextStep));
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep === 0) {
      onReset();
    } else {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep, onReset]);

  const handleBerufSelect = (value: string) => {
    if (value === '__custom__') {
      setDefaultBeruf('');
      setCustomBeruf('');
    } else {
      setDefaultBeruf(value);
      setCustomBeruf('');
    }
  };

  const handleRowBerufEdit = (rowIdx: number) => {
    setEditingRow(rowIdx);
    setEditValue(rowBerufOverrides[rowIdx] ?? effectiveBeruf);
  };

  const handleRowBerufSave = (rowIdx: number) => {
    if (editValue && editValue !== effectiveBeruf) {
      setRowBerufOverrides(prev => ({ ...prev, [rowIdx]: editValue }));
    } else {
      setRowBerufOverrides(prev => {
        const next = { ...prev };
        delete next[rowIdx];
        return next;
      });
    }
    setEditingRow(null);
  };

  const handleExport = async () => {
    if (!parseResult) return;
    setIsExporting(true);
    try {
      await exportLehrpersonenToXlsx(
        parseResult.headers,
        parseResult.rows,
        rowBerufOverrides,
        effectiveBeruf,
        parseResult.fileName,
      );
      toast({ title: 'Export erfolgreich', description: 'Die XLSX-Datei wurde heruntergeladen.' });
    } catch (err) {
      toast({ title: 'Export fehlgeschlagen', description: String(err), variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const mappedHeaders = parseResult ? mapHeaders(parseResult.headers) : [];
  // Key columns to show in preview
  const previewColumns = parseResult
    ? parseResult.headers
        .map((h, i) => ({ original: h, mapped: mappedHeaders[i], index: i }))
        .filter(c => c.mapped !== '')
    : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-5">
        <Button variant="ghost" size="icon" onClick={onReset} className="shrink-0 h-10 w-10 rounded-xl hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <UserCog className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Lehrpersonen-Import</h2>
            <p className="text-sm text-muted-foreground">LehrerOffice-Daten für PUPIL aufbereiten</p>
          </div>
        </div>
      </div>

      <WizardProgress
        currentStep={currentStep}
        maxVisitedStep={maxVisitedStep}
        steps={wizardSteps}
        onStepClick={(step) => setCurrentStep(step)}
        showDescriptions={true}
      />

      {/* Step 1: File Upload */}
      {currentStep === 0 && (
        <Step1FileUpload
          parseResult={parseResult}
          onFileLoaded={setParseResult}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}

      {/* Step 2: Beruf Configuration + Preview */}
      {currentStep === 1 && parseResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Standard-Beruf / Rolle festlegen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="beruf-select">Beruf-Wert für alle Lehrpersonen</Label>
                  <Select
                    value={customBeruf ? '__custom__' : defaultBeruf}
                    onValueChange={handleBerufSelect}
                  >
                    <SelectTrigger id="beruf-select" className="mt-1.5">
                      <SelectValue placeholder="Beruf wählen…" />
                    </SelectTrigger>
                    <SelectContent>
                      {BERUF_PRESETS.map(p => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                      <SelectItem value="__custom__">Eigener Wert…</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {(customBeruf !== '' || (!defaultBeruf && customBeruf === '')) && (
                  <div className="flex-1">
                    <Label htmlFor="beruf-custom">Eigener Beruf-Wert</Label>
                    <Input
                      id="beruf-custom"
                      value={customBeruf}
                      onChange={e => setCustomBeruf(e.target.value)}
                      placeholder="z.B. Schulleitung"
                      className="mt-1.5"
                    />
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                Dieser Wert wird in der Spalte «Beruf» für alle Zeilen eingesetzt.
                Einzelne Zeilen können in der Vorschau individuell angepasst werden.
              </p>
            </CardContent>
          </Card>

          {/* Preview Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Vorschau
                <Badge variant="secondary">{parseResult.rows.length} Lehrpersonen</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-auto max-h-[500px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-muted z-10 w-10">#</TableHead>
                      {previewColumns.map(c => (
                        <TableHead key={c.index} className="sticky top-0 bg-muted z-10 whitespace-nowrap">
                          {c.mapped}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parseResult.rows.map((row, rowIdx) => (
                      <TableRow key={rowIdx}>
                        <TableCell className="text-muted-foreground text-xs">{rowIdx + 1}</TableCell>
                        {previewColumns.map(c => {
                          const isBeruf = c.original === 'L_Funktion';
                          const displayValue = isBeruf
                            ? (rowBerufOverrides[rowIdx] ?? effectiveBeruf)
                            : String(row[c.original] ?? '');

                          return (
                            <TableCell key={c.index} className="whitespace-nowrap">
                              {isBeruf ? (
                                editingRow === rowIdx ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={editValue}
                                      onChange={e => setEditValue(e.target.value)}
                                      className="h-7 w-32 text-xs"
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') handleRowBerufSave(rowIdx);
                                        if (e.key === 'Escape') setEditingRow(null);
                                      }}
                                      autoFocus
                                    />
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleRowBerufSave(rowIdx)}>
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1 group">
                                    <span className={rowBerufOverrides[rowIdx] ? 'text-primary font-medium' : ''}>
                                      {displayValue}
                                    </span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                                      onClick={() => handleRowBerufEdit(rowIdx)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )
                              ) : (
                                <span className="text-sm">{displayValue}</span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <NavigationButtons
            onBack={handleBack}
            onNext={handleNext}
            nextDisabled={!effectiveBeruf}
            nextLabel="Weiter zum Export"
          />
        </div>
      )}

      {/* Step 3: Export */}
      {currentStep === 2 && parseResult && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Export bereit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Quelldatei:</span>
                  <p className="font-medium">{parseResult.fileName}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Lehrpersonen:</span>
                  <p className="font-medium">{parseResult.rows.length}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Standard-Beruf:</span>
                  <p className="font-medium">{effectiveBeruf}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Individuelle Anpassungen:</span>
                  <p className="font-medium">{Object.keys(rowBerufOverrides).length}</p>
                </div>
              </div>

              <Button onClick={handleExport} disabled={isExporting} className="w-full" size="lg">
                <Download className="h-5 w-5 mr-2" />
                {isExporting ? 'Wird exportiert…' : 'XLSX herunterladen'}
              </Button>
            </CardContent>
          </Card>

          <NavigationButtons
            onBack={handleBack}
            onNext={onReset}
            nextLabel="Neuer Import"
          />
        </div>
      )}
    </div>
  );
}
