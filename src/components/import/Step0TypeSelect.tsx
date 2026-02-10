import { useState, useEffect } from 'react';
import { Users, BookOpen, GraduationCap, Search, Target, FileText, ArrowRight, ShieldCheck, FileUp, RefreshCw, Database, FileJson, FolderOpen, ClipboardList, Sparkles } from 'lucide-react';
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
  FolderOpen,
  ClipboardList,
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
  const [showFileUpload, setShowFileUpload] = useState(false);

  useEffect(() => {
    setShowFileUpload(processingMode === 'continued' && correctionSource === 'file');
  }, [processingMode, correctionSource]);

  const isSpecialType = selectedType === 'gruppen' || selectedType === 'lp-zuweisung';
  const canProceed = selectedType !== null && 
    (selectedType !== 'foerderplaner' || selectedSubType !== null) &&
    (isSpecialType ||
     processingMode === 'initial' || 
     (processingMode === 'continued' && (
       (correctionSource === 'localStorage' && localStorageRulesCount > 0) ||
       (correctionSource === 'file' && loadedCorrectionRules.length > 0)
     ))
    );

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
          <Sparkles className="h-3.5 w-3.5" />
          Willkommen im Import Wizard
        </div>
        <h2 className="text-3xl font-bold text-foreground tracking-tight">
          Was möchten Sie importieren?
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Wählen Sie den passenden Import-Typ für Ihre Daten aus LehrerOffice.
        </p>
      </div>

      {/* Import Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {importConfigs
          .filter((config) => config.type === 'schueler' || config.type === 'gruppen' || config.type === 'lp-zuweisung')
          .map((config) => {
            const Icon = iconMap[config.icon as keyof typeof iconMap];
            const isSelected = selectedType === config.type;

            return (
              <Card
                key={config.type}
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group',
                  isSelected
                    ? 'ring-2 ring-primary shadow-lg bg-primary/[0.03]'
                    : 'hover:border-primary/30'
                )}
                onClick={() => onSelectType(config.type)}
              >
                <CardHeader className="pb-3">
                  <div
                    className={cn(
                      'w-14 h-14 rounded-xl flex items-center justify-center mb-3 transition-colors',
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted group-hover:bg-primary/10 group-hover:text-primary'
                    )}
                  >
                    <Icon className="h-7 w-7" />
                  </div>
                  <CardTitle className="text-lg">{config.name}</CardTitle>
                  <CardDescription className="text-sm leading-relaxed">{config.description}</CardDescription>
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

      {/* Processing Mode Selection */}
      {selectedType && !isSpecialType && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Aufbereitungsmodus</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md group',
                processingMode === 'initial'
                  ? 'ring-2 ring-primary shadow-md bg-primary/[0.03]'
                  : 'hover:border-primary/30'
              )}
              onClick={() => onProcessingModeChange('initial')}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                      processingMode === 'initial'
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted group-hover:bg-primary/10'
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

            <Card
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-md group',
                processingMode === 'continued'
                  ? 'ring-2 ring-primary shadow-md bg-primary/[0.03]'
                  : 'hover:border-primary/30'
              )}
              onClick={() => onProcessingModeChange('continued')}
            >
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors',
                      processingMode === 'continued'
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted group-hover:bg-primary/10'
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

      {/* Correction Source Selection */}
      {selectedType && !isSpecialType && processingMode === 'continued' && (
        <Card className="border-primary/20 bg-primary/[0.02]">
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-4">Korrektur-Quelle wählen</h4>
            <RadioGroup
              value={correctionSource}
              onValueChange={(v) => onCorrectionSourceChange(v as CorrectionSource)}
              className="space-y-3"
            >
              <div 
                className={cn(
                  'flex items-start space-x-3 p-4 rounded-xl border transition-all',
                  correctionSource === 'localStorage' ? 'bg-background border-primary shadow-sm' : 'border-transparent hover:bg-background/50',
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

              <div 
                className={cn(
                  'flex items-start space-x-3 p-4 rounded-xl border transition-all',
                  correctionSource === 'file' ? 'bg-background border-primary shadow-sm' : 'border-transparent hover:bg-background/50'
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

      {/* Privacy Notice - compact at the bottom */}
      <Alert className="border-muted bg-muted/30">
        <ShieldCheck className="h-4 w-4 text-pupil-teal" />
        <AlertDescription className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Datenschutz:</span>{' '}
          Alle Daten werden ausschliesslich lokal in Ihrem Browser verarbeitet – nichts wird auf einem Server gespeichert.
        </AlertDescription>
      </Alert>

      {/* CTA Button */}
      <div className="flex justify-center pt-2">
        <Button 
          onClick={onNext} 
          disabled={!canProceed} 
          size="lg"
          className="px-8 text-base shadow-md hover:shadow-lg transition-all"
        >
          Weiter
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
