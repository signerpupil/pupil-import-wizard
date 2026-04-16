import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { parseFile, mergeParseResults, type ParseResult } from '@/lib/fileParser';
import { ColumnPaginatedPreview } from './ColumnPaginatedPreview';
import { NavigationButtons } from './NavigationButtons';
import { StammdatenInstructionGuide } from './StammdatenInstructionGuide';

interface Step1FileUploadProps {
  onFileLoaded: (result: ParseResult) => void;
  onBack: () => void;
  onNext: () => void;
  parseResult: ParseResult | null;
  importType?: string;
}

interface LoadedFile {
  name: string;
  result: ParseResult;
}

export function Step1FileUpload({
  onFileLoaded,
  onBack,
  onNext,
  parseResult,
  importType,
}: Step1FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedFiles, setLoadedFiles] = useState<LoadedFile[]>([]);

  const processFiles = useCallback(async (files: File[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const newResults: LoadedFile[] = [];
      for (const file of files) {
        // Skip duplicates
        if (loadedFiles.some(f => f.name === file.name)) continue;
        const result = await parseFile(file);
        newResults.push({ name: file.name, result });
      }

      if (newResults.length === 0) {
        setIsLoading(false);
        return;
      }

      const allFiles = [...loadedFiles, ...newResults];
      setLoadedFiles(allFiles);

      // Merge all files
      const allResults = allFiles.map(f => f.result);
      const merged = mergeParseResults(allResults);
      onFileLoaded(merged);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Datei');
    } finally {
      setIsLoading(false);
    }
  }, [onFileLoaded, loadedFiles, importType]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) processFiles(files);
    },
    [processFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length > 0) processFiles(files);
      // Reset input so same file can be re-selected
      e.target.value = '';
    },
    [processFiles]
  );

  const handleRemoveFile = useCallback((fileName: string) => {
    const remaining = loadedFiles.filter(f => f.name !== fileName);
    setLoadedFiles(remaining);
    if (remaining.length === 0) {
      onFileLoaded({ headers: [], rows: [], fileName: '' });
    } else {
      try {
        const merged = mergeParseResults(remaining.map(f => f.result));
        onFileLoaded(merged);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Fehler beim Zusammenführen');
      }
    }
  }, [onFileLoaded, loadedFiles]);

  const handleRemoveAll = useCallback(() => {
    setLoadedFiles([]);
    onFileLoaded({ headers: [], rows: [], fileName: '' });
    setError(null);
  }, [onFileLoaded]);

  const hasFiles = loadedFiles.length > 0;
  const isMultiFile = loadedFiles.length > 1;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Datei hochladen</h2>
        <p className="text-muted-foreground mt-1">
          Laden Sie eine oder mehrere CSV-/Excel-Dateien aus LehrerOffice hoch.
        </p>
      </div>

      {importType === 'schueler' && <StammdatenInstructionGuide />}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!hasFiles ? (
        <Card
          className={cn(
            'border-2 border-dashed transition-all',
            isDragging && 'border-primary bg-primary/5',
            isLoading && 'opacity-50 pointer-events-none'
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                {isLoading ? 'Datei wird geladen...' : 'Dateien hierher ziehen'}
              </h3>
              <p className="text-muted-foreground mb-4">
                oder klicken Sie, um Dateien auszuwählen
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
                disabled={isLoading}
                multiple
              />
              <label htmlFor="file-upload">
                <Button variant="outline" asChild disabled={isLoading}>
                  <span className="cursor-pointer">Dateien auswählen</span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-4">
                Unterstützte Formate: CSV, Excel (.xlsx, .xls) · Mehrere Dateien möglich (z.B. Primar + Oberstufe)
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* File list */}
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">
                  {isMultiFile ? `${loadedFiles.length} Dateien geladen` : 'Datei geladen'}
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileInput}
                    className="hidden"
                    id="file-upload-add"
                    disabled={isLoading}
                    multiple
                  />
                  <label htmlFor="file-upload-add">
                    <Button variant="outline" size="sm" asChild disabled={isLoading}>
                      <span className="cursor-pointer gap-1">
                        <Plus className="h-3.5 w-3.5" />
                        Weitere Datei
                      </span>
                    </Button>
                  </label>
                  {isMultiFile && (
                    <Button variant="ghost" size="sm" onClick={handleRemoveAll} className="text-muted-foreground">
                      Alle entfernen
                    </Button>
                  )}
                </div>
              </div>

              {loadedFiles.map((file) => (
                <div key={file.name} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-pupil-success/10 flex items-center justify-center">
                      <FileSpreadsheet className="h-4 w-4 text-pupil-success" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {file.result.rows.length} Zeilen, {file.result.headers.length} Spalten
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveFile(file.name)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              {isMultiFile && parseResult && (
                <div className="pt-2 border-t flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    Zusammengeführt: {parseResult.rows.length} Zeilen total
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Spalte <code className="bg-muted px-1 rounded">_source_file</code> wird automatisch ergänzt
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          <NavigationButtons
            onBack={onBack}
            onNext={onNext}
            nextDisabled={!parseResult?.fileName}
            size="lg"
          />

          {parseResult && parseResult.rows.length > 0 && (
            <ColumnPaginatedPreview
              headers={parseResult.headers}
              rows={parseResult.rows.slice(0, 5)}
              title="Vorschau (erste 5 Zeilen)"
            />
          )}
        </div>
      )}

      {!hasFiles && (
        <NavigationButtons
          onBack={onBack}
          onNext={onNext}
          nextDisabled={!parseResult?.fileName}
          size="lg"
        />
      )}
    </div>
  );
}
