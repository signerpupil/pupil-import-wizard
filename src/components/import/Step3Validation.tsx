import { useState } from 'react';
import { ArrowLeft, ArrowRight, AlertCircle, CheckCircle, Edit2, Save, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { ValidationError, ParsedRow } from '@/types/importTypes';

interface AISuggestion {
  type: string;
  affectedColumn: string;
  affectedRows: number[];
  pattern: string;
  suggestion: string;
  autoFix: boolean;
  fixFunction?: string;
}

interface Step3ValidationProps {
  errors: ValidationError[];
  rows: ParsedRow[];
  onErrorCorrect: (rowIndex: number, column: string, value: string) => void;
  onBulkCorrect: (corrections: { row: number; column: string; value: string }[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step3Validation({
  errors,
  rows,
  onErrorCorrect,
  onBulkCorrect,
  onBack,
  onNext,
}: Step3ValidationProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; column: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const { toast } = useToast();

  const handleStartEdit = (row: number, column: string, currentValue: string) => {
    setEditingCell({ row, column });
    setEditValue(currentValue);
  };

  const handleSaveEdit = () => {
    if (editingCell) {
      onErrorCorrect(editingCell.row, editingCell.column, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const fetchAISuggestions = async () => {
    if (errors.length === 0) return;
    
    setIsLoadingAI(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/suggest-corrections`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            errors: errors.filter(e => !e.correctedValue).slice(0, 50),
            sampleData: rows.slice(0, 5),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Fehler beim Abrufen der KI-Vorschläge');
      }

      const data = await response.json();
      setAiSuggestions(data.suggestions || []);
      
      if (data.suggestions?.length > 0) {
        toast({
          title: 'KI-Analyse abgeschlossen',
          description: `${data.suggestions.length} Korrekturvorschläge gefunden`,
        });
      } else {
        toast({
          title: 'Keine Muster erkannt',
          description: 'Die KI konnte keine automatischen Korrekturen vorschlagen.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('AI suggestion error:', error);
      toast({
        title: 'Fehler',
        description: error instanceof Error ? error.message : 'KI-Analyse fehlgeschlagen',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  const applyBulkCorrection = (suggestion: AISuggestion) => {
    // Apply corrections based on the suggestion
    const corrections: { row: number; column: string; value: string }[] = [];
    
    suggestion.affectedRows.forEach(rowNum => {
      const error = errors.find(e => e.row === rowNum && e.column === suggestion.affectedColumn);
      if (error) {
        let correctedValue = error.value;
        
        // Apply common fixes based on the fix function description
        if (suggestion.fixFunction?.toLowerCase().includes('excel') || 
            suggestion.fixFunction?.toLowerCase().includes('serial')) {
          // Convert Excel serial date to proper date
          const serialNum = parseInt(error.value);
          if (!isNaN(serialNum)) {
            const date = new Date((serialNum - 25569) * 86400 * 1000);
            correctedValue = `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getFullYear()}`;
          }
        } else if (suggestion.fixFunction?.toLowerCase().includes('ahv') && error.value) {
          // Try to format AHV number
          const digits = error.value.replace(/\D/g, '');
          if (digits.length === 13 && digits.startsWith('756')) {
            correctedValue = `${digits.slice(0, 3)}.${digits.slice(3, 7)}.${digits.slice(7, 11)}.${digits.slice(11, 13)}`;
          }
        }
        
        corrections.push({
          row: rowNum,
          column: suggestion.affectedColumn,
          value: correctedValue,
        });
      }
    });

    if (corrections.length > 0) {
      onBulkCorrect(corrections);
      toast({
        title: 'Korrekturen angewendet',
        description: `${corrections.length} Werte wurden korrigiert`,
      });
      
      // Remove this suggestion
      setAiSuggestions(prev => prev.filter(s => s !== suggestion));
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

      {/* AI Suggestions Button */}
      {uncorrectedErrors.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">KI-Korrekturvorschläge</CardTitle>
              </div>
              <Button 
                onClick={fetchAISuggestions} 
                disabled={isLoadingAI}
                className="gap-2"
              >
                {isLoadingAI ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analysiere...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Vorschläge generieren
                  </>
                )}
              </Button>
            </div>
            <CardDescription>
              Lassen Sie die KI Muster erkennen und Bulk-Korrekturen vorschlagen
            </CardDescription>
          </CardHeader>
          
          {aiSuggestions.length > 0 && (
            <CardContent className="space-y-3">
              {aiSuggestions.map((suggestion, idx) => (
                <div key={idx} className="p-4 bg-background rounded-lg border space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{suggestion.affectedColumn}</Badge>
                        <Badge className="bg-pupil-warning">{suggestion.affectedRows.length} Zeilen</Badge>
                      </div>
                      <p className="text-sm font-medium">{suggestion.pattern}</p>
                      <p className="text-sm text-muted-foreground">{suggestion.suggestion}</p>
                    </div>
                    {suggestion.autoFix && (
                      <Button 
                        size="sm" 
                        onClick={() => applyBulkCorrection(suggestion)}
                        className="gap-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Anwenden
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      )}

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
                <TableHead className="text-pupil-teal-foreground">Spalte</TableHead>
                <TableHead className="text-pupil-teal-foreground">Wert</TableHead>
                <TableHead className="text-pupil-teal-foreground">Fehler</TableHead>
                <TableHead className="text-pupil-teal-foreground w-32">Aktion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.slice(0, 50).map((error, idx) => {
                const isEditing = editingCell?.row === error.row && editingCell?.column === error.column;
                const isCorrected = error.correctedValue !== undefined;

                return (
                  <TableRow key={idx} className={isCorrected ? 'bg-pupil-success/5' : 'bg-destructive/5'}>
                    <TableCell className="font-mono">{error.row}</TableCell>
                    <TableCell className="font-medium font-mono text-sm">{error.column}</TableCell>
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
                          onClick={() => handleStartEdit(error.row, error.column, error.correctedValue ?? error.value)}
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
          {errors.length > 50 && (
            <div className="p-3 text-center text-sm text-muted-foreground bg-muted/50">
              Zeige 50 von {errors.length} Fehlern. Nutzen Sie die KI-Vorschläge für Bulk-Korrekturen.
            </div>
          )}
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
