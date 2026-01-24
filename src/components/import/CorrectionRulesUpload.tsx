import { useRef, useState } from 'react';
import { Upload, FileJson, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CorrectionRule } from '@/types/correctionTypes';

interface CorrectionRulesUploadProps {
  onFileLoaded: (rules: CorrectionRule[]) => void;
  loadFromFile: (file: File) => Promise<CorrectionRule[]>;
  isLoading: boolean;
  error: string | null;
}

export function CorrectionRulesUpload({
  onFileLoaded,
  loadFromFile,
  isLoading,
  error,
}: CorrectionRulesUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadedRulesCount, setLoadedRulesCount] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      return;
    }

    try {
      const rules = await loadFromFile(file);
      setLoadedRulesCount(rules.length);
      onFileLoaded(rules);
    } catch {
      setLoadedRulesCount(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer',
          isDragOver && 'border-primary bg-primary/5',
          loadedRulesCount !== null && !error && 'border-pupil-success bg-pupil-success/5',
          error && 'border-destructive bg-destructive/5',
          !isDragOver && !loadedRulesCount && !error && 'border-muted-foreground/25 hover:border-primary/50'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleInputChange}
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            <p className="text-sm text-muted-foreground">Datei wird gelesen...</p>
          </div>
        ) : loadedRulesCount !== null && !error ? (
          <div className="flex flex-col items-center gap-2">
            <CheckCircle className="h-8 w-8 text-pupil-success" />
            <p className="font-medium text-foreground">Korrektur-Regeln geladen</p>
            <Badge variant="outline" className="text-pupil-success border-pupil-success/30">
              {loadedRulesCount} Regeln
            </Badge>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
              <FileJson className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Korrektur-Datei hochladen</p>
              <p className="text-sm text-muted-foreground mt-1">
                JSON-Datei hierher ziehen oder klicken
              </p>
            </div>
            <Button variant="outline" size="sm" className="mt-2">
              <Upload className="h-4 w-4 mr-2" />
              Datei auswählen
            </Button>
          </div>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
