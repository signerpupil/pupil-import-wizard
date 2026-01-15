import { useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle, Edit2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ValidationError, ParsedRow } from '@/types/importTypes';

interface Step3ValidationProps {
  errors: ValidationError[];
  rows: ParsedRow[];
  onErrorCorrect: (rowIndex: number, field: string, value: string) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step3Validation({
  errors,
  rows,
  onErrorCorrect,
  onBack,
  onNext,
}: Step3ValidationProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; field: string } | null>(null);
  const [editValue, setEditValue] = useState('');

  const handleStartEdit = (row: number, field: string, currentValue: string) => {
    setEditingCell({ row, field });
    setEditValue(currentValue);
  };

  const handleSaveEdit = () => {
    if (editingCell) {
      onErrorCorrect(editingCell.row, editingCell.field, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const uncorrectedErrors = errors.filter(e => e.correctedValue === undefined);
  const correctedErrors = errors.filter(e => e.correctedValue !== undefined);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Daten validieren</h2>
        <p className="text-muted-foreground mt-1">
          Überprüfen und korrigieren Sie fehlerhafte Daten vor dem Export.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-muted rounded-lg text-center">
          <p className="text-3xl font-bold">{rows.length}</p>
          <p className="text-sm text-muted-foreground">Datensätze gesamt</p>
        </div>
        <div className="p-4 bg-destructive/10 rounded-lg text-center">
          <p className="text-3xl font-bold text-destructive">{uncorrectedErrors.length}</p>
          <p className="text-sm text-muted-foreground">Offene Fehler</p>
        </div>
        <div className="p-4 bg-pupil-success/10 rounded-lg text-center">
          <p className="text-3xl font-bold text-pupil-success">{correctedErrors.length}</p>
          <p className="text-sm text-muted-foreground">Korrigiert</p>
        </div>
      </div>

      {errors.length === 0 ? (
        <Alert className="border-pupil-success bg-pupil-success/10">
          <CheckCircle className="h-4 w-4 text-pupil-success" />
          <AlertDescription className="text-pupil-success">
            Alle Daten sind valide. Sie können mit dem Export fortfahren.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-pupil-teal">
                <TableHead className="text-pupil-teal-foreground w-20">Zeile</TableHead>
                <TableHead className="text-pupil-teal-foreground">Feld</TableHead>
                <TableHead className="text-pupil-teal-foreground">Wert</TableHead>
                <TableHead className="text-pupil-teal-foreground">Fehler</TableHead>
                <TableHead className="text-pupil-teal-foreground w-32">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.map((error, idx) => {
                const isEditing = editingCell?.row === error.row && editingCell?.field === error.field;
                const isCorrected = error.correctedValue !== undefined;

                return (
                  <TableRow key={idx} className={isCorrected ? 'bg-pupil-success/5' : 'bg-destructive/5'}>
                    <TableCell className="font-mono">{error.row}</TableCell>
                    <TableCell className="font-medium">{error.field}</TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-8"
                          autoFocus
                        />
                      ) : (
                        <span className={isCorrected ? 'line-through text-muted-foreground' : ''}>
                          {error.value || '(leer)'}
                        </span>
                      )}
                      {isCorrected && !isEditing && (
                        <span className="ml-2 text-pupil-success font-medium">
                          → {error.correctedValue}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={isCorrected ? 'secondary' : 'destructive'}>
                        {error.message}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Button size="sm" onClick={handleSaveEdit}>
                          <Save className="h-4 w-4 mr-1" />
                          Speichern
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStartEdit(error.row, error.field, error.correctedValue ?? error.value)}
                        >
                          <Edit2 className="h-4 w-4 mr-1" />
                          {isCorrected ? 'Ändern' : 'Korrigieren'}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Zurück
        </Button>
        <Button onClick={onNext} size="lg">
          Weiter zur Vorschau
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
