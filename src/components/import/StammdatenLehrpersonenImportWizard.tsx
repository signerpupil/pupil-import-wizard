import { useCallback, useState } from 'react';
import { ArrowLeft, UserCog, Download, Info } from 'lucide-react';
import { WizardProgress, type WizardStep } from '@/components/import/WizardProgress';
import { Step1FileUpload } from '@/components/import/Step1FileUpload';
import { NavigationButtons } from './NavigationButtons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { ParseResult } from '@/lib/fileParser';
import {
  buildOutputRows,
  exportStammdatenLehrpersonenToXlsx,
  BERUF_FIXED_VALUE,
} from '@/lib/stammdatenLehrpersonenExport';

const wizardSteps: WizardStep[] = [
  { label: 'Datei hochladen', description: 'CSV oder Excel' },
  { label: 'Vorschau & Export', description: 'XLSX herunterladen' },
];

interface Props {
  onReset: () => void;
}

export function StammdatenLehrpersonenImportWizard({ onReset }: Props) {
  const [currentStep, setCurrentStep] = useState(0);
  const [maxVisitedStep, setMaxVisitedStep] = useState(0);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleNext = useCallback(() => {
    const next = Math.min(currentStep + 1, 1);
    setCurrentStep(next);
    setMaxVisitedStep(prev => Math.max(prev, next));
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep === 0) onReset();
    else setCurrentStep(prev => prev - 1);
  }, [currentStep, onReset]);

  const handleExport = async () => {
    if (!parseResult) return;
    setIsExporting(true);
    try {
      await exportStammdatenLehrpersonenToXlsx(
        parseResult.headers,
        parseResult.rows,
        parseResult.fileName,
      );
      toast({ title: 'Export erfolgreich', description: 'Die XLSX-Datei wurde heruntergeladen.' });
    } catch (err) {
      toast({ title: 'Export fehlgeschlagen', description: String(err), variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  const preview = parseResult ? buildOutputRows(parseResult.headers, parseResult.rows) : null;
  const previewCols = preview
    ? preview.headers
        .map((h, i) => ({ header: h, index: i }))
        .filter(c => c.header !== '')
    : [];
  const previewDataRows = preview ? preview.data.slice(0, 10) : [];

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-5">
        <Button variant="ghost" size="icon" onClick={onReset} className="shrink-0 h-10 w-10 rounded-xl hover:bg-muted">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
            <UserCog className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Stammdaten Lehrpersonen</h2>
            <p className="text-sm text-muted-foreground">LO-Export bereinigen, Standard-User einfügen, Beruf fix setzen</p>
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

      {currentStep === 0 && (
        <Step1FileUpload
          parseResult={parseResult}
          onFileLoaded={setParseResult}
          onBack={handleBack}
          onNext={handleNext}
        />
      )}

      {currentStep === 1 && parseResult && preview && (
        <div className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Die Titelzeile wird umgeschrieben, eine fixe Standard-User-Zeile als Zeile 2 eingefügt
              und in der Spalte «Beruf» wird bei allen befüllten Datenzeilen der Wert «{BERUF_FIXED_VALUE}» gesetzt.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Vorschau
                <Badge variant="secondary">{parseResult.rows.length} Lehrpersonen</Badge>
                <Badge variant="outline">+ 1 Standard-User</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full overflow-auto max-h-[500px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky top-0 bg-muted z-10 w-12">Zeile</TableHead>
                      {previewCols.map(c => (
                        <TableHead key={c.index} className="sticky top-0 bg-muted z-10 whitespace-nowrap">
                          {c.header}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="bg-primary/5">
                      <TableCell className="text-xs font-medium">2 ★</TableCell>
                      {previewCols.map(c => (
                        <TableCell key={c.index} className="whitespace-nowrap text-sm font-medium text-primary">
                          {preview.standardUser[c.index]}
                        </TableCell>
                      ))}
                    </TableRow>
                    {previewDataRows.map((row, rIdx) => (
                      <TableRow key={rIdx}>
                        <TableCell className="text-xs text-muted-foreground">{rIdx + 3}</TableCell>
                        {previewCols.map(c => (
                          <TableCell key={c.index} className="whitespace-nowrap text-sm">
                            {row[c.index]}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parseResult.rows.length > previewDataRows.length && (
                <p className="text-xs text-muted-foreground mt-2">
                  Vorschau zeigt die ersten {previewDataRows.length} von {parseResult.rows.length} Datenzeilen.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-3 justify-between items-center">
            <NavigationButtons onBack={handleBack} hideNext />
            <Button onClick={handleExport} disabled={isExporting} size="lg">
              <Download className="mr-2 h-4 w-4" />
              {isExporting ? 'Export läuft…' : 'XLSX herunterladen'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}