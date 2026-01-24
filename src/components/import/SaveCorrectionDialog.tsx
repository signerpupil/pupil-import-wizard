import { useState } from 'react';
import { Save, X, Link } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { CorrectionRule } from '@/types/correctionTypes';
import type { ParsedRow, ImportType } from '@/types/importTypes';

interface SaveCorrectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  column: string;
  originalValue: string;
  correctedValue: string;
  rowData: ParsedRow;
  importType: ImportType;
  onSave: (rule: CorrectionRule) => void;
  createRuleFromCorrection: (
    column: string,
    originalValue: string,
    correctedValue: string,
    identifierColumn?: string,
    identifierValue?: string
  ) => CorrectionRule;
}

// Identifier columns that can be used to bind corrections to specific records
const IDENTIFIER_COLUMNS: Record<string, string> = {
  'S_AHV': 'Schüler AHV',
  'P_ERZ1_AHV': 'Erziehungsberechtigter 1 AHV',
  'P_ERZ2_AHV': 'Erziehungsberechtigter 2 AHV',
};

export function SaveCorrectionDialog({
  open,
  onOpenChange,
  column,
  originalValue,
  correctedValue,
  rowData,
  onSave,
  createRuleFromCorrection,
}: SaveCorrectionDialogProps) {
  const [saveMode, setSaveMode] = useState<'skip' | 'exact' | 'identifier'>('exact');
  const [selectedIdentifier, setSelectedIdentifier] = useState<string | null>(null);

  // Find available identifiers from the row data
  const availableIdentifiers = Object.entries(IDENTIFIER_COLUMNS)
    .filter(([col]) => {
      const value = rowData[col];
      return value !== undefined && value !== null && String(value).trim() !== '';
    })
    .map(([col, label]) => ({
      column: col,
      label,
      value: String(rowData[col]),
    }));

  const handleSave = () => {
    if (saveMode === 'skip') {
      onOpenChange(false);
      return;
    }

    let identifierColumn: string | undefined;
    let identifierValue: string | undefined;

    if (saveMode === 'identifier' && selectedIdentifier) {
      const identifier = availableIdentifiers.find(i => i.column === selectedIdentifier);
      if (identifier) {
        identifierColumn = identifier.column;
        identifierValue = identifier.value;
      }
    }

    const rule = createRuleFromCorrection(
      column,
      originalValue,
      correctedValue,
      identifierColumn,
      identifierValue
    );

    onSave(rule);
    onOpenChange(false);
  };

  // Truncate long values for display
  const truncateValue = (value: string, maxLength = 30) => {
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + '...';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Korrektur speichern?
          </DialogTitle>
          <DialogDescription>
            Möchten Sie diese Korrektur für zukünftige Importe speichern?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Correction preview */}
          <div className="bg-muted rounded-lg p-3 text-sm">
            <p className="font-medium text-foreground mb-1">{column}</p>
            <div className="flex items-center gap-2 text-muted-foreground">
              <span className="line-through">{truncateValue(originalValue)}</span>
              <span>→</span>
              <span className="text-pupil-success font-medium">{truncateValue(correctedValue)}</span>
            </div>
          </div>

          {/* Save options */}
          <RadioGroup
            value={saveMode}
            onValueChange={(v) => setSaveMode(v as 'skip' | 'exact' | 'identifier')}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3">
              <RadioGroupItem value="skip" id="skip" className="mt-1" />
              <Label htmlFor="skip" className="font-normal cursor-pointer">
                <span className="font-medium">Nur für diesen Import</span>
                <p className="text-sm text-muted-foreground">
                  Die Korrektur wird nicht gespeichert
                </p>
              </Label>
            </div>

            <div className="flex items-start space-x-3">
              <RadioGroupItem value="exact" id="exact" className="mt-1" />
              <Label htmlFor="exact" className="font-normal cursor-pointer">
                <span className="font-medium">Für zukünftige Importe merken</span>
                <p className="text-sm text-muted-foreground">
                  Wird bei gleichem Wert in derselben Spalte angewendet
                </p>
              </Label>
            </div>

            {availableIdentifiers.length > 0 && (
              <div className="flex items-start space-x-3">
                <RadioGroupItem value="identifier" id="identifier" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="identifier" className="font-normal cursor-pointer">
                    <span className="font-medium flex items-center gap-1">
                      <Link className="h-3.5 w-3.5" />
                      An Person binden
                    </span>
                    <p className="text-sm text-muted-foreground">
                      Nur für diese spezifische Person anwenden
                    </p>
                  </Label>

                  {saveMode === 'identifier' && (
                    <div className="mt-3 space-y-2 pl-0">
                      {availableIdentifiers.map((identifier) => (
                        <div key={identifier.column} className="flex items-center space-x-2">
                          <Checkbox
                            id={identifier.column}
                            checked={selectedIdentifier === identifier.column}
                            onCheckedChange={(checked) => {
                              setSelectedIdentifier(checked ? identifier.column : null);
                            }}
                          />
                          <Label 
                            htmlFor={identifier.column} 
                            className="font-normal text-sm cursor-pointer"
                          >
                            {identifier.label}: <span className="font-mono text-xs">{identifier.value}</span>
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </RadioGroup>
        </div>

        <DialogFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
          <Button 
            onClick={handleSave}
            disabled={saveMode === 'identifier' && !selectedIdentifier}
          >
            <Save className="h-4 w-4 mr-2" />
            {saveMode === 'skip' ? 'Überspringen' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
