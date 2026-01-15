import { Check, X, AlertTriangle, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import type { ColumnStatus } from '@/types/importTypes';
import { NavigationButtons } from './NavigationButtons';

interface Step2ColumnCheckProps {
  columnStatuses: ColumnStatus[];
  removeExtraColumns: boolean;
  onRemoveExtraColumnsChange: (value: boolean) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step2ColumnCheck({
  columnStatuses,
  removeExtraColumns,
  onRemoveExtraColumnsChange,
  onBack,
  onNext,
}: Step2ColumnCheckProps) {
  const foundColumns = columnStatuses.filter(c => c.status === 'found');
  const missingColumns = columnStatuses.filter(c => c.status === 'missing');
  const extraColumns = columnStatuses.filter(c => c.status === 'extra');
  const missingRequired = missingColumns.filter(c => c.required);

  // Group by category
  const categories = [...new Set(columnStatuses.filter(c => c.category).map(c => c.category))];

  const canProceed = missingRequired.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Spalten überprüfen</h2>
        <p className="text-muted-foreground mt-1">
          Überprüfung der Spalten aus Ihrer Datei. Fehlende Pflichtfelder müssen ergänzt werden.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-pupil-success/10 rounded-lg text-center">
          <p className="text-3xl font-bold text-pupil-success">{foundColumns.length}</p>
          <p className="text-sm text-muted-foreground">Gefunden</p>
        </div>
        <div className={cn(
          "p-4 rounded-lg text-center",
          missingRequired.length > 0 ? "bg-destructive/10" : "bg-pupil-warning/10"
        )}>
          <p className={cn(
            "text-3xl font-bold",
            missingRequired.length > 0 ? "text-destructive" : "text-pupil-warning"
          )}>
            {missingColumns.length}
          </p>
          <p className="text-sm text-muted-foreground">
            Fehlen {missingRequired.length > 0 && `(${missingRequired.length} Pflicht)`}
          </p>
        </div>
        <div className="p-4 bg-muted rounded-lg text-center">
          <p className="text-3xl font-bold text-muted-foreground">{extraColumns.length}</p>
          <p className="text-sm text-muted-foreground">Zusätzlich</p>
        </div>
      </div>

      {/* Extra columns handling */}
      {extraColumns.length > 0 && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Zusätzliche Spalten</p>
              <p className="text-sm text-muted-foreground">
                {extraColumns.length} Spalte(n) nicht in der Definition gefunden
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="remove-extra" className="text-sm">
              Beim Export entfernen
            </Label>
            <Switch
              id="remove-extra"
              checked={removeExtraColumns}
              onCheckedChange={onRemoveExtraColumnsChange}
            />
          </div>
        </div>
      )}

      {/* Missing required warning */}
      {missingRequired.length > 0 && (
        <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <div className="flex items-center gap-2 text-destructive mb-2">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-semibold">Fehlende Pflichtfelder</p>
          </div>
          <p className="text-sm text-muted-foreground mb-2">
            Folgende Pflichtfelder fehlen in Ihrer Datei:
          </p>
          <div className="flex flex-wrap gap-2">
            {missingRequired.map(col => (
              <Badge key={col.name} variant="destructive">{col.name}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Navigation buttons above table */}
      <NavigationButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel={canProceed ? 'Weiter zur Validierung' : 'Pflichtfelder fehlen'}
        nextDisabled={!canProceed}
        size="lg"
      />

      {/* Column table by category */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-pupil-teal">
              <TableHead className="text-pupil-teal-foreground font-semibold">Spaltenname</TableHead>
              <TableHead className="text-pupil-teal-foreground font-semibold">Kategorie</TableHead>
              <TableHead className="text-pupil-teal-foreground font-semibold w-32">Pflicht</TableHead>
              <TableHead className="text-pupil-teal-foreground font-semibold w-32">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(category => (
              <>
                <TableRow key={`cat-${category}`} className="bg-muted/50">
                  <TableCell colSpan={4} className="font-semibold text-muted-foreground py-2">
                    {category}
                  </TableCell>
                </TableRow>
                {columnStatuses
                  .filter(c => c.category === category)
                  .map(col => (
                    <TableRow key={col.name} className={cn(
                      col.status === 'missing' && col.required && 'bg-destructive/5',
                      col.status === 'extra' && 'bg-muted/30'
                    )}>
                      <TableCell className="font-mono text-sm">{col.name}</TableCell>
                      <TableCell className="text-muted-foreground">{col.category || '-'}</TableCell>
                      <TableCell>
                        {col.required ? (
                          <Badge className="bg-primary">Ja</Badge>
                        ) : (
                          <span className="text-muted-foreground">Nein</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {col.status === 'found' && (
                          <div className="flex items-center gap-1 text-pupil-success">
                            <Check className="h-4 w-4" />
                            <span>Gefunden</span>
                          </div>
                        )}
                        {col.status === 'missing' && (
                          <div className={cn(
                            "flex items-center gap-1",
                            col.required ? "text-destructive" : "text-pupil-warning"
                          )}>
                            <X className="h-4 w-4" />
                            <span>Fehlt</span>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                }
              </>
            ))}
            
            {/* Extra columns */}
            {extraColumns.length > 0 && (
              <>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={4} className="font-semibold text-muted-foreground py-2">
                    Zusätzliche Spalten (nicht in Definition)
                  </TableCell>
                </TableRow>
                {extraColumns.map(col => (
                  <TableRow key={col.name} className="bg-muted/20">
                    <TableCell className="font-mono text-sm">{col.name}</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell>
                      <span className="text-muted-foreground">Nein</span>
                    </TableCell>
                    <TableCell>
                      <Tooltip>
                        <TooltipTrigger>
                          <Badge variant="outline" className="text-muted-foreground">
                            Zusätzlich
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          Diese Spalte ist nicht in der Definition enthalten
                        </TooltipContent>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      <NavigationButtons
        onBack={onBack}
        onNext={onNext}
        nextLabel={canProceed ? 'Weiter zur Validierung' : 'Pflichtfelder fehlen'}
        nextDisabled={!canProceed}
        size="lg"
      />
    </div>
  );
}
