import { useState } from 'react';
import { Download, Trash2, Database, FileJson, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { CorrectionRule } from '@/types/correctionTypes';

interface CorrectionMemoryExportProps {
  rules: CorrectionRule[];
  fileName?: string;
  importTypeName: string;
  onExportToFile: (rules: CorrectionRule[], fileName?: string) => void;
  onSaveToLocalStorage: (rules: CorrectionRule[]) => void;
  onClearLocalStorage: () => void;
  localStorageCount: number;
}

export function CorrectionMemoryExport({
  rules,
  fileName,
  importTypeName,
  onExportToFile,
  onSaveToLocalStorage,
  onClearLocalStorage,
  localStorageCount,
}: CorrectionMemoryExportProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [saveToLocal, setSaveToLocal] = useState(true);

  if (rules.length === 0 && localStorageCount === 0) {
    return null;
  }

  // Group rules by column
  const rulesByColumn = rules.reduce((acc, rule) => {
    acc[rule.column] = (acc[rule.column] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleExport = () => {
    onExportToFile(rules, fileName);
  };

  const handleSaveToLocal = () => {
    if (saveToLocal && rules.length > 0) {
      onSaveToLocalStorage(rules);
    }
  };

  return (
    <Card className="border-primary/30 bg-primary/5">
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardHeader className="pb-3">
          <CollapsibleTrigger className="flex items-center justify-between w-full text-left">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Korrektur-Gedächtnis</CardTitle>
              {rules.length > 0 && (
                <Badge variant="outline" className="text-primary border-primary/30">
                  {rules.length} Regeln
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {localStorageCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {localStorageCount} gespeichert
                </Badge>
              )}
              {isExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CollapsibleTrigger>
          <CardDescription>
            Korrekturen können für zukünftige Importe wiederverwendet werden.
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Stats by column */}
            {Object.keys(rulesByColumn).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {Object.entries(rulesByColumn).map(([column, count]) => (
                  <Badge key={column} variant="outline">
                    {count}× {column}
                  </Badge>
                ))}
              </div>
            )}

            {/* Save to localStorage option */}
            {rules.length > 0 && (
              <div className="flex items-center space-x-2 p-3 bg-background rounded-lg border">
                <Checkbox
                  id="saveToLocal"
                  checked={saveToLocal}
                  onCheckedChange={(checked) => setSaveToLocal(checked === true)}
                />
                <Label htmlFor="saveToLocal" className="cursor-pointer flex-1">
                  <span className="font-medium">Im Browser für nächsten Import speichern</span>
                  <p className="text-sm text-muted-foreground">
                    Korrekturen werden lokal gespeichert und beim nächsten Import automatisch angewendet.
                  </p>
                </Label>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3">
              {rules.length > 0 && (
                <>
                  <Button onClick={handleExport} variant="outline" className="gap-2">
                    <FileJson className="h-4 w-4" />
                    Als Datei exportieren
                  </Button>
                  
                  {saveToLocal && (
                    <Button onClick={handleSaveToLocal} className="gap-2">
                      <Download className="h-4 w-4" />
                      Im Browser speichern
                    </Button>
                  )}
                </>
              )}

              {localStorageCount > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="gap-2 text-destructive hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                      Gespeicherte löschen
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Korrektur-Regeln löschen?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Alle {localStorageCount} gespeicherten Korrektur-Regeln werden aus dem Browser gelöscht. 
                        Diese Aktion kann nicht rückgängig gemacht werden.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                      <AlertDialogAction onClick={onClearLocalStorage} className="bg-destructive hover:bg-destructive/90">
                        Löschen
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>

            {/* Privacy note */}
            <p className="text-xs text-muted-foreground">
              💡 Alle Daten werden lokal in Ihrem Browser gespeichert. Für die Nutzung auf anderen 
              Geräten oder zum Teilen mit Kolleg*innen können Sie die Regeln als Datei exportieren.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
