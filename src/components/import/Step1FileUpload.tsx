import { useState, useCallback } from 'react';
import { Upload, FileSpreadsheet, X, ArrowLeft, ArrowRight, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { parseFile, type ParseResult } from '@/lib/fileParser';
import { ColumnPaginatedPreview } from './ColumnPaginatedPreview';

interface Step1FileUploadProps {
  onFileLoaded: (result: ParseResult) => void;
  onBack: () => void;
  onNext: () => void;
  parseResult: ParseResult | null;
}

export function Step1FileUpload({
  onFileLoaded,
  onBack,
  onNext,
  parseResult,
}: Step1FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await parseFile(file);
      onFileLoaded(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Datei');
    } finally {
      setIsLoading(false);
    }
  }, [onFileLoaded]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
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
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemoveFile = useCallback(() => {
    onFileLoaded({ headers: [], rows: [], fileName: '' });
  }, [onFileLoaded]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Datei hochladen</h2>
        <p className="text-muted-foreground mt-1">
          Laden Sie eine CSV- oder Excel-Datei aus LehrerOffice hoch.
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!parseResult?.fileName ? (
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
                {isLoading ? 'Datei wird geladen...' : 'Datei hierher ziehen'}
              </h3>
              <p className="text-muted-foreground mb-4">
                oder klicken Sie, um eine Datei auszuwählen
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
                id="file-upload"
                disabled={isLoading}
              />
              <label htmlFor="file-upload">
                <Button variant="outline" asChild disabled={isLoading}>
                  <span className="cursor-pointer">Datei auswählen</span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-4">
                Unterstützte Formate: CSV, Excel (.xlsx, .xls)
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-pupil-success/10 flex items-center justify-center">
                    <FileSpreadsheet className="h-5 w-5 text-pupil-success" />
                  </div>
                  <div>
                    <p className="font-medium">{parseResult.fileName}</p>
                    <p className="text-sm text-muted-foreground">
                      {parseResult.rows.length} Zeilen, {parseResult.headers.length} Spalten
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleRemoveFile}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <ColumnPaginatedPreview 
            headers={parseResult.headers} 
            rows={parseResult.rows.slice(0, 5)} 
            title="Vorschau (erste 5 Zeilen)"
          />
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button onClick={onNext} disabled={!parseResult?.fileName} size="lg">
          Weiter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
