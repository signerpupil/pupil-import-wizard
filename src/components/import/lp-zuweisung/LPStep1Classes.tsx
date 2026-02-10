import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowRight, ClipboardPaste, CheckCircle2, Info } from 'lucide-react';
import type { ClassTeacherData } from '@/types/importTypes';

// Role mapping based on column position relative to the first LP column
const ROLE_POSITIONS: { offset: number; rolle: string }[] = [
  { offset: 0, rolle: 'Klassenlehrperson' },
  { offset: 1, rolle: 'Klassenlehrperson' },
  { offset: 2, rolle: 'Klassenlehrperson' },
  { offset: 3, rolle: 'Weitere Lehrperson' },
  { offset: 4, rolle: 'Weitere Lehrperson' },
  { offset: 5, rolle: 'Weitere Lehrperson' },
  { offset: 6, rolle: 'Heilpädagoge/in' },
  { offset: 7, rolle: 'Heilpädagoge/in' },
  { offset: 8, rolle: 'Heilpädagoge/in' },
  { offset: 9, rolle: 'Weitere Förderlehrperson' },
  { offset: 10, rolle: 'Weitere Förderlehrperson' },
  { offset: 11, rolle: 'Weitere Förderlehrperson' },
  { offset: 12, rolle: 'Vikariat' },
  { offset: 13, rolle: 'Vikariat' },
];

interface LPStep1ClassesProps {
  classData: ClassTeacherData[];
  onClassDataChange: (data: ClassTeacherData[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function LPStep1Classes({ classData, onClassDataChange, onBack, onNext }: LPStep1ClassesProps) {
  const [rawText, setRawText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const parseData = () => {
    setParseError(null);
    const lines = rawText.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      setParseError('Bitte fügen Sie die Daten aus LehrerOffice ein (mind. Header + eine Datenzeile).');
      return;
    }

    // Find header row - look for "Klasse" and teacher-related keywords
    let headerIndex = -1;
    let headerCols: string[] = [];
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const cols = lines[i].split('\t');
      if (cols[0]?.trim().toLowerCase() === 'klasse' || 
          cols.some(c => c.toLowerCase().includes('lehrperson'))) {
        headerIndex = i;
        headerCols = cols.map(c => c.trim());
        break;
      }
    }

    if (headerIndex === -1) {
      // Try without header - assume first column is class name, status is second
      headerIndex = -1;
    }

    // Find LP column indices dynamically
    let lpStartIndex = -1;
    let statusIndex = -1;
    
    if (headerCols.length > 0) {
      for (let i = 0; i < headerCols.length; i++) {
        const col = headerCols[i].toLowerCase();
        if (col === 'status' || col.startsWith('im ') || col.includes('semester')) statusIndex = i;
        if ((col.includes('lehrperson 1') || col === 'klassenlehrperson 1') && lpStartIndex === -1) {
          lpStartIndex = i;
        }
      }
    }

    // If we couldn't find LP columns in header, use the Zuweisungen-sheet structure
    // where columns are: Klasse | Klasse(repeat) | KLP1 | KLP2 | KLP3 | WLP1...
    // Or the LO-Export where LP columns start around index 9-10
    
    const results: ClassTeacherData[] = [];
    const dataLines = headerIndex >= 0 ? lines.slice(headerIndex + 1) : lines;

    for (const line of dataLines) {
      const cols = line.split('\t').map(c => c.trim());
      if (cols.length < 3) continue;

      const klasse = cols[0];
      if (!klasse) continue;

      // Check status if we know the column
      if (statusIndex >= 0 && cols[statusIndex]?.toLowerCase() !== 'aktiv') continue;

      // Determine where LP data starts
      let effectiveLpStart = lpStartIndex >= 0 ? lpStartIndex : 2;
      
      // If no header found, try to auto-detect: skip non-name columns
      if (lpStartIndex < 0 && headerIndex < 0) {
        // Heuristic: LP columns start after the class info columns
        // In the Zuweisungen format: col0=Klasse, col1=Klasse(repeat), col2+=LPs
        effectiveLpStart = 2;
      }

      const teachers: { name: string; rolle: string }[] = [];
      for (let i = 0; i < ROLE_POSITIONS.length; i++) {
        const colIdx = effectiveLpStart + ROLE_POSITIONS[i].offset;
        if (colIdx < cols.length && cols[colIdx]) {
          const name = cols[colIdx].trim();
          if (name) {
            teachers.push({ name, rolle: ROLE_POSITIONS[i].rolle });
          }
        }
      }

      if (teachers.length > 0) {
        results.push({ klasse, teachers });
      }
    }

    if (results.length === 0) {
      setParseError('Keine gültigen Klassen-Zuweisungen erkannt. Bitte prüfen Sie das Format.');
      return;
    }

    onClassDataChange(results);
  };

  const totalTeachers = classData.reduce((sum, c) => sum + c.teachers.length, 0);
  const uniqueTeachers = new Set(classData.flatMap(c => c.teachers.map(t => t.name))).size;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Klassen-Daten einfügen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-800">
              Kopieren Sie die Zuweisungsdaten aus LehrerOffice (Tab-getrennt). 
              Die Daten sollten pro Zeile eine Klasse mit den zugewiesenen Lehrpersonen enthalten.
              Format: Klasse | [Klasse] | KLP 1 | KLP 2 | KLP 3 | WLP 1-3 | HP 1-3 | WFL 1-3 | Vikariat
            </AlertDescription>
          </Alert>

          <Textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Daten hier einfügen (Ctrl+V)..."
            className="min-h-[200px] font-mono text-xs"
          />

          {parseError && (
            <Alert variant="destructive">
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          <Button onClick={parseData} disabled={!rawText.trim()}>
            <ClipboardPaste className="h-4 w-4 mr-2" />
            Daten verarbeiten
          </Button>
        </CardContent>
      </Card>

      {classData.length > 0 && (
        <>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <Button onClick={onNext} disabled={classData.length === 0}>
            Weiter
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Erkannte Zuweisungen
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Badge variant="secondary">{classData.length} Klassen</Badge>
              <Badge variant="secondary">{totalTeachers} Zuweisungen</Badge>
              <Badge variant="secondary">{uniqueTeachers} eindeutige LPs</Badge>
            </div>

            <div className="max-h-[400px] overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-background">Klasse</TableHead>
                    <TableHead className="sticky top-0 bg-background">Lehrpersonen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classData.slice(0, 50).map((cd, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium whitespace-nowrap">{cd.klasse}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {cd.teachers.map((t, j) => (
                            <Badge key={j} variant="outline" className="text-xs">
                              {t.name} <span className="text-muted-foreground ml-1">({t.rolle})</span>
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {classData.length > 50 && (
                <p className="text-sm text-muted-foreground p-2 text-center">
                  ... und {classData.length - 50} weitere Klassen
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        </>
      )}

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <Button onClick={onNext} disabled={classData.length === 0}>
          Weiter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
