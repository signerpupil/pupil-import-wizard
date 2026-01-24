import { FileSpreadsheet, Settings, Upload, Columns, Brain } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ImportType, FoerderplanerSubType, ColumnStatus } from '@/types/importTypes';
import type { ProcessingMode } from '@/types/correctionTypes';
import { importConfigs, foerderplanerSubTypes } from '@/types/importTypes';
import { cn } from '@/lib/utils';

interface WizardSummaryProps {
  importType: ImportType | null;
  subType: FoerderplanerSubType | null;
  processingMode: ProcessingMode;
  fileName?: string;
  rowCount?: number;
  columnStatuses?: ColumnStatus[];
  className?: string;
}

export function WizardSummary({
  importType,
  subType,
  processingMode,
  fileName,
  rowCount,
  columnStatuses,
  className,
}: WizardSummaryProps) {
  const getImportTypeName = () => {
    if (importType === 'foerderplaner' && subType) {
      const sub = foerderplanerSubTypes.find(s => s.subType === subType);
      return sub?.name ?? 'Förderplaner';
    }
    return importConfigs.find(c => c.type === importType)?.name ?? 'Import';
  };

  const getProcessingModeName = () => {
    return processingMode === 'initial' ? 'Erste Datenaufbereitung' : 'Weitere Datenaufbereitung';
  };

  const foundColumns = columnStatuses?.filter(c => c.status === 'found').length ?? 0;
  const missingColumns = columnStatuses?.filter(c => c.status === 'missing').length ?? 0;
  const missingRequired = columnStatuses?.filter(c => c.status === 'missing' && c.required).length ?? 0;

  return (
    <Card className={cn("bg-muted/30 border-dashed", className)}>
      <CardContent className="py-3 px-4">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {/* Import Type */}
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Typ:</span>
            <span className="font-medium">{getImportTypeName()}</span>
          </div>

          {/* Processing Mode */}
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Modus:</span>
            <Badge variant={processingMode === 'continued' ? 'default' : 'secondary'} className="text-xs">
              {getProcessingModeName()}
            </Badge>
          </div>

          {/* File Info */}
          {fileName && (
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Datei:</span>
              <span className="font-medium truncate max-w-[150px]" title={fileName}>
                {fileName}
              </span>
              {rowCount !== undefined && (
                <Badge variant="outline" className="text-xs">
                  {rowCount} Zeilen
                </Badge>
              )}
            </div>
          )}

          {/* Column Status */}
          {columnStatuses && columnStatuses.length > 0 && (
            <div className="flex items-center gap-2">
              <Columns className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Spalten:</span>
              <Badge variant="outline" className="text-xs bg-pupil-success/10 text-pupil-success border-pupil-success/20">
                {foundColumns} gefunden
              </Badge>
              {missingColumns > 0 && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs",
                    missingRequired > 0 
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                  )}
                >
                  {missingColumns} fehlen{missingRequired > 0 && ` (${missingRequired} Pflicht)`}
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
