import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, ArrowRightLeft, AlertTriangle, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { FieldMapping } from '@/types/importTypes';
import { autoMapFields } from '@/lib/fileParser';

interface Step2FieldMappingProps {
  sourceHeaders: string[];
  fieldDefinitions: FieldMapping[];
  mappings: Record<string, string>;
  onMappingsChange: (mappings: Record<string, string>) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step2FieldMapping({
  sourceHeaders,
  fieldDefinitions,
  mappings,
  onMappingsChange,
  onBack,
  onNext,
}: Step2FieldMappingProps) {
  const [initialized, setInitialized] = useState(false);

  // Auto-map on first load
  useEffect(() => {
    if (!initialized && sourceHeaders.length > 0 && Object.keys(mappings).length === 0) {
      const autoMappings = autoMapFields(sourceHeaders, fieldDefinitions);
      onMappingsChange(autoMappings);
      setInitialized(true);
    }
  }, [initialized, sourceHeaders, fieldDefinitions, mappings, onMappingsChange]);

  const handleMappingChange = (sourceField: string, targetField: string) => {
    onMappingsChange({
      ...mappings,
      [sourceField]: targetField,
    });
  };

  // Get available target fields (including those not in PUPIL)
  const targetOptions = [
    { value: '__skip__', label: '– Nicht importieren –' },
    ...fieldDefinitions
      .filter(f => f.targetField && !f.notInPupil)
      .map(f => ({
        value: f.targetField,
        label: f.targetField,
        required: f.required,
        category: f.category,
      })),
  ];

  // Group by category
  const categories = [...new Set(fieldDefinitions.map(f => f.category))].filter(Boolean);

  // Check if required fields are mapped
  const requiredFields = fieldDefinitions.filter(f => f.required && !f.notInPupil);
  const mappedRequiredFields = requiredFields.filter(f => 
    Object.values(mappings).includes(f.targetField)
  );
  const allRequiredMapped = mappedRequiredFields.length === requiredFields.length;

  // Fields not in PUPIL
  const notInPupilFields = fieldDefinitions.filter(f => f.notInPupil);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Felder zuordnen</h2>
        <p className="text-muted-foreground mt-1">
          Ordnen Sie die Quellfelder aus LehrerOffice den PUPIL-Zielfeldern zu.
        </p>
      </div>

      {/* Required fields indicator */}
      <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
        <div className="flex items-center gap-2">
          <Badge variant={allRequiredMapped ? 'default' : 'destructive'} className={allRequiredMapped ? 'bg-pupil-success' : ''}>
            {mappedRequiredFields.length}/{requiredFields.length}
          </Badge>
          <span className="text-sm">Pflichtfelder zugeordnet</span>
        </div>
        {notInPupilFields.length > 0 && (
          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger>
                <div className="flex items-center gap-1 text-pupil-warning">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="text-sm">{notInPupilFields.length} Felder ohne PUPIL-Entsprechung</span>
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-sm">
                  Diese Felder existieren in LehrerOffice, haben aber kein entsprechendes Feld in PUPIL:
                </p>
                <ul className="text-xs mt-1">
                  {notInPupilFields.slice(0, 5).map(f => (
                    <li key={f.sourceField}>• {f.sourceField}</li>
                  ))}
                  {notInPupilFields.length > 5 && <li>• ...</li>}
                </ul>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Mapping table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-pupil-teal">
              <TableHead className="text-pupil-teal-foreground font-semibold w-1/3">
                Quellfeld (LehrerOffice)
              </TableHead>
              <TableHead className="text-pupil-teal-foreground w-12 text-center">
                <ArrowRightLeft className="h-4 w-4 mx-auto" />
              </TableHead>
              <TableHead className="text-pupil-teal-foreground font-semibold w-1/3">
                Zielfeld (PUPIL)
              </TableHead>
              <TableHead className="text-pupil-teal-foreground font-semibold">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sourceHeaders.map((sourceField, idx) => {
              const currentMapping = mappings[sourceField] || '__skip__';
              const isSkipped = currentMapping === '__skip__';
              const fieldDef = fieldDefinitions.find(f => f.targetField === currentMapping);
              const isRequired = fieldDef?.required;

              return (
                <TableRow key={idx} className={cn(isSkipped && 'opacity-60')}>
                  <TableCell className="font-mono text-sm">{sourceField}</TableCell>
                  <TableCell className="text-center">
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-auto" />
                  </TableCell>
                  <TableCell>
                    <Select
                      value={currentMapping}
                      onValueChange={(value) => handleMappingChange(sourceField, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__skip__">– Nicht importieren –</SelectItem>
                        {categories.map(category => (
                          <div key={category}>
                            <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted">
                              {category}
                            </div>
                            {targetOptions
                              .filter(opt => {
                                const def = fieldDefinitions.find(f => f.targetField === opt.value);
                                return def?.category === category;
                              })
                              .map(opt => (
                                <SelectItem key={opt.value} value={opt.value}>
                                  {opt.label}
                                  {fieldDefinitions.find(f => f.targetField === opt.value)?.required && ' *'}
                                </SelectItem>
                              ))
                            }
                          </div>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {isSkipped ? (
                      <Badge variant="outline" className="text-muted-foreground">
                        Wird übersprungen
                      </Badge>
                    ) : isRequired ? (
                      <Badge className="bg-primary">Pflichtfeld</Badge>
                    ) : (
                      <Badge variant="secondary">Optional</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Badge className="bg-primary">Pflichtfeld</Badge>
          <span>Muss zugeordnet werden</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Optional</Badge>
          <span>Kann zugeordnet werden</span>
        </div>
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4" />
          <span>* = Pflichtfeld</span>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button onClick={onNext} disabled={!allRequiredMapped} size="lg">
          Weiter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
