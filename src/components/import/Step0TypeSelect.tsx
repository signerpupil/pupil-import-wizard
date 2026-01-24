import { useState, useEffect } from 'react';
import { Users, BookOpen, GraduationCap, Search, Target, FileText, ArrowRight, ShieldCheck, FileUp, RefreshCw, Database, FileJson } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ImportType, FoerderplanerSubType } from '@/types/importTypes';
import type { ProcessingMode, CorrectionSource, CorrectionRule } from '@/types/correctionTypes';
import { importConfigs, foerderplanerSubTypes } from '@/types/importTypes';
import { CorrectionRulesUpload } from './CorrectionRulesUpload';

interface Step0TypeSelectProps {
  selectedType: ImportType | null;
  selectedSubType: FoerderplanerSubType | null;
  onSelectType: (type: ImportType) => void;
  onSelectSubType: (subType: FoerderplanerSubType) => void;
  onNext: () => void;
  // New props for correction memory
  processingMode: ProcessingMode;
  onProcessingModeChange: (mode: ProcessingMode) => void;
  correctionSource: CorrectionSource;
  onCorrectionSourceChange: (source: CorrectionSource) => void;
  onCorrectionRulesLoaded: (rules: CorrectionRule[]) => void;
  loadCorrectionRulesFromFile: (file: File) => Promise<CorrectionRule[]>;
  isLoadingCorrectionRules: boolean;
  correctionRulesError: string | null;
  localStorageRulesCount: number;
  loadedCorrectionRules: CorrectionRule[];
}

const iconMap = {
  Users,
  BookOpen,
  GraduationCap,
  Search,
  Target,
  FileText,
};

export function Step0TypeSelect({
  selectedType,
  selectedSubType,
  onSelectType,
  onSelectSubType,
  onNext,
  processingMode,
  onProcessingModeChange,
  correctionSource,
  onCorrectionSourceChange,
  onCorrectionRulesLoaded,
  loadCorrectionRulesFromFile,
  isLoadingCorrectionRules,
  correctionRulesError,
  localStorageRulesCount,
  loadedCorrectionRules,
}: Step0TypeSelectProps) {
  // Track if file upload is needed
  const [showFileUpload, setShowFileUpload] = useState(false);

  // Update file upload visibility when source changes
  useEffect(() => {
    setShowFileUpload(processingMode === 'continued' && correctionSource === 'file');
  }, [processingMode, correctionSource]);

  const canProceed = selectedType !== null && 
    (selectedType !== 'foerderplaner' || selectedSubType !== null) &&
    (processingMode === 'initial' || 
     (processingMode === 'continued' && (
       (correctionSource === 'localStorage' && localStorageRulesCount > 0) ||
       (correctionSource === 'file' && loadedCorrectionRules.length > 0)
     ))
    );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Import-Typ auswählen</h2>
        <p className="text-muted-foreground mt-1">
          Wählen Sie, welche Art von Daten Sie aus LehrerOffice importieren möchten.
        </p>
      </div>

      {/* Privacy Notice */}
      <Alert className="border-pupil-teal/30 bg-pupil-teal/5">
        <ShieldCheck className="h-4 w-4 text-pupil-teal" />
        <AlertDescription className="text-sm">
          <span className="font-medium text-foreground">Datenschutz-Hinweis:</span>{' '}
          <span className="text-muted-foreground">
            Ihre Dateiinhalte werden ausschliesslich lokal in Ihrem Browser verarbeitet und niemals auf einem Server gespeichert. 
            Die automatische Musteranalyse zur Erkennung von Formatierungsfehlern erfolgt vollständig im Browser. 
            Nach Schliessen des Browsers oder Neuladen der Seite werden alle importierten Daten automatisch gelöscht.
          </span>
        </AlertDescription>
      </Alert>

      {/* Import Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {importConfigs
          .filter((config) => config.type === 'schueler') // Temporarily only show Schülerdaten
          .map((config) => {
            const Icon = iconMap[config.icon as keyof typeof iconMap];
            const isSelected = selectedType === config.type;

            return (
              <Card
                key={config.type}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-lg',
                  isSelected && 'ring-2 ring-primary shadow-lg'
                )}
                onClick={() => onSelectType(config.type)}
              >
                <CardHeader className="pb-3">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center mb-2',
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{config.name}</CardTitle>
                  <CardDescription>{config.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
      </div>

      {selectedType === 'foerderplaner' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Förderplaner-Typ auswählen</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {foerderplanerSubTypes.map((subType) => {
              const Icon = iconMap[subType.icon as keyof typeof iconMap];
              const isSelected = selectedSubType === subType.subType;

              return (
                <Card
                  key={subType.subType}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    isSelected && 'ring-2 ring-pupil-teal shadow-md'
                  )}
                  onClick={() => onSelectSubType(subType.subType)}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          isSelected ? 'bg-pupil-teal text-pupil-teal-foreground' : 'bg-muted'
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="font-medium">{subType.name}</p>
                        <p className="text-sm text-muted-foreground">{subType.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Processing Mode Selection - Only show if type is selected */}
      {selectedType && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Aufbereitungsmodus</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Initial Processing */}
            <Card
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                processingMode === 'initial' && 'ring-2 ring-primary shadow-md'
              )}
              onClick={() => onProcessingModeChange('initial')}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                      processingMode === 'initial' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <FileUp className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Erste Datenaufbereitung</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Neue Datei ohne vorherige Korrekturen aufbereiten. Korrekturen können für zukünftige Importe gespeichert werden.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Continued Processing */}
            <Card
              className={cn(
                'cursor-pointer transition-all hover:shadow-md',
                processingMode === 'continued' && 'ring-2 ring-primary shadow-md'
              )}
              onClick={() => onProcessingModeChange('continued')}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0',
                      processingMode === 'continued' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <RefreshCw className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">Weitere Datenaufbereitung</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Datei mit gespeicherten Korrekturen abgleichen. Bekannte Fehler werden automatisch korrigiert.
                    </p>
                    {localStorageRulesCount > 0 && (
                      <Badge variant="secondary" className="mt-2">
                        {localStorageRulesCount} Regeln im Browser gespeichert
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Correction Source Selection - Only show for continued mode */}
      {selectedType && processingMode === 'continued' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-4">Korrektur-Quelle wählen</h4>
            <RadioGroup
              value={correctionSource}
              onValueChange={(v) => onCorrectionSourceChange(v as CorrectionSource)}
              className="space-y-4"
            >
              {/* localStorage option */}
              <div 
                className={cn(
                  'flex items-start space-x-3 p-3 rounded-lg border transition-colors',
                  correctionSource === 'localStorage' ? 'bg-background border-primary' : 'border-transparent hover:bg-background/50',
                  localStorageRulesCount === 0 && 'opacity-50 cursor-not-allowed'
                )}
              >
                <RadioGroupItem 
                  value="localStorage" 
                  id="localStorage" 
                  className="mt-1"
                  disabled={localStorageRulesCount === 0}
                />
                <Label htmlFor="localStorage" className={cn("font-normal cursor-pointer flex-1", localStorageRulesCount === 0 && 'cursor-not-allowed')}>
                  <span className="font-medium flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Lokale Korrekturen verwenden
                    {localStorageRulesCount > 0 && (
                      <Badge variant="outline" className="text-primary border-primary/30">
                        {localStorageRulesCount} Regeln
                      </Badge>
                    )}
                  </span>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {localStorageRulesCount > 0 
                      ? 'Gespeicherte Korrekturen aus diesem Browser verwenden'
                      : 'Keine gespeicherten Korrekturen vorhanden'
                    }
                  </p>
                </Label>
              </div>

              {/* File upload option */}
              <div 
                className={cn(
                  'flex items-start space-x-3 p-3 rounded-lg border transition-colors',
                  correctionSource === 'file' ? 'bg-background border-primary' : 'border-transparent hover:bg-background/50'
                )}
              >
                <RadioGroupItem value="file" id="file" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="file" className="font-normal cursor-pointer">
                    <span className="font-medium flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      Korrektur-Datei hochladen
                      {loadedCorrectionRules.length > 0 && (
                        <Badge variant="outline" className="text-pupil-success border-pupil-success/30">
                          {loadedCorrectionRules.length} Regeln geladen
                        </Badge>
                      )}
                    </span>
                    <p className="text-sm text-muted-foreground mt-0.5">
                      Exportierte JSON-Datei mit Korrektur-Regeln verwenden
                    </p>
                  </Label>

                  {showFileUpload && (
                    <div className="mt-4">
                      <CorrectionRulesUpload
                        onFileLoaded={onCorrectionRulesLoaded}
                        loadFromFile={loadCorrectionRulesFromFile}
                        isLoading={isLoadingCorrectionRules}
                        error={correctionRulesError}
                      />
                    </div>
                  )}
                </div>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={!canProceed} size="lg">
          Weiter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
