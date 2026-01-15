import { Users, BookOpen, GraduationCap, Search, Target, FileText, ArrowRight, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { ImportType, FoerderplanerSubType } from '@/types/importTypes';
import { importConfigs, foerderplanerSubTypes } from '@/types/importTypes';

interface Step0TypeSelectProps {
  selectedType: ImportType | null;
  selectedSubType: FoerderplanerSubType | null;
  onSelectType: (type: ImportType) => void;
  onSelectSubType: (subType: FoerderplanerSubType) => void;
  onNext: () => void;
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
}: Step0TypeSelectProps) {
  const canProceed = selectedType !== null && 
    (selectedType !== 'foerderplaner' || selectedSubType !== null);

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
            Ihre Daten werden ausschließlich lokal in Ihrem Browser verarbeitet und niemals auf einem Server gespeichert. 
            Nach Schließen des Browsers oder Neuladen der Seite werden alle importierten Daten automatisch gelöscht. 
            Die KI-Korrekturvorschläge verwenden nur anonymisierte Stichproben und speichern keine Daten.
          </span>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {importConfigs.map((config) => {
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

      <div className="flex justify-end pt-4">
        <Button onClick={onNext} disabled={!canProceed} size="lg">
          Weiter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
