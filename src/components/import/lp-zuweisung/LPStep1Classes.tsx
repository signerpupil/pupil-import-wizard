import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowRight, ClipboardPaste, CheckCircle2, Info } from 'lucide-react';
import type { ClassTeacherData } from '@/types/importTypes';

const SECTION_HEADERS = ['kindergarten', 'primarschule', 'bezirksschule', 'realschule', 'sekundarschule', 'sonder'];

interface TeacherColumn {
  index: number;
  rolle: string;
}

function detectTeacherColumns(headerCols: string[]): TeacherColumn[] {
  const columns: TeacherColumn[] = [];
  for (let i = 0; i < headerCols.length; i++) {
    const col = headerCols[i].toLowerCase();
    if (col.includes('klassenlehrperson')) {
      columns.push({ index: i, rolle: 'Klassenlehrperson' });
    } else if (col.includes('weitere stellvertretung')) {
      columns.push({ index: i, rolle: 'Weitere Stellvertretung' });
    } else if (col.includes('vikariat')) {
      columns.push({ index: i, rolle: 'Vikariat' });
    } else if (col.includes('heilpädagog') || col.includes('heilpaedagog')) {
      columns.push({ index: i, rolle: 'Heilpädagoge/in' });
    } else if (col.includes('schulsozialarbeiter')) {
      columns.push({ index: i, rolle: 'Schulsozialarbeiter/in' });
    } else if (col.includes('förderlehrperson') || col.includes('foerderlehrperson')) {
      columns.push({ index: i, rolle: 'Förderlehrperson' });
    } else if (col.includes('lehrperson')) {
      columns.push({ index: i, rolle: 'Weitere Lehrperson' });
    }
  }
  return columns;
}

interface LPStep1ClassesProps {
  classData: ClassTeacherData[];
  onClassDataChange: (data: ClassTeacherData[]) => void;
  onBack: () => void;
  onNext: () => void;
}

export function LPStep1Classes({ classData, onClassDataChange, onBack, onNext }: LPStep1ClassesProps) {
  const [rawText, setRawText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

  const splitLine = (line: string): string[] => {
    // Try tab-separated first
    const tabCols = line.split('\t');
    if (tabCols.length >= 5) return tabCols;
    // Fallback: split by 2+ spaces (but not single space inside names)
    const spaceCols = line.split(/\s{2,}/);
    if (spaceCols.length >= 5) return spaceCols;
    // Last resort: return tab split even if few columns
    return tabCols;
  };

  const parseData = () => {
    setParseError(null);
    const lines = rawText.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      setParseError('Bitte fügen Sie die Daten aus LehrerOffice ein (mind. Header + eine Datenzeile).');
      return;
    }

    // Find header row(s) - LehrerOffice may use a two-row header
    // Row 1: "Klasse | Status | Grunddaten | Unterricht | ..."
    // Row 2: "| Im 1. Halbjahr | ... | Klassenlehrperson | Klassenlehrperson 2 | ..."
    let headerIndex = -1;
    let headerEndIndex = -1;
    let headerCols: string[] = [];
    
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const cols = splitLine(lines[i]);
      const hasKlasse = cols[0]?.trim().toLowerCase() === 'klasse';
      const hasLP = cols.some(c => c.toLowerCase().includes('lehrperson'));
      
      if (hasKlasse || hasLP) {
        if (headerIndex === -1) {
          headerIndex = i;
          headerCols = cols.map(c => c.trim());
        }
        
        // If this row has teacher columns, we're done
        if (hasLP) {
          headerEndIndex = i;
          headerCols = cols.map(c => c.trim());
          break;
        }
        
        // Row has "Klasse" but no teacher cols → check next row for multi-row header
        if (hasKlasse && !hasLP && i + 1 < lines.length) {
          const nextCols = splitLine(lines[i + 1]);
          if (nextCols.some(c => c.toLowerCase().includes('lehrperson'))) {
            // Multi-row header: use row 2 for column names, merge "Klasse" from row 1
            headerEndIndex = i + 1;
            headerCols = nextCols.map(c => c.trim());
            // Ensure first col is "Klasse" if row 2 has it empty
            if (!headerCols[0]) headerCols[0] = 'Klasse';
            break;
          }
        }
        
        headerEndIndex = i;
        break;
      }
    }

    if (headerIndex === -1) {
      setParseError('Kein Header mit "Klasse" oder "Lehrperson" gefunden. Bitte kopieren Sie die Daten inkl. Kopfzeile.');
      return;
    }

    // Detect status column and teacher columns dynamically
    let statusIndex = -1;
    for (let i = 0; i < headerCols.length; i++) {
      const col = headerCols[i].toLowerCase();
      if (col === 'status' || col.startsWith('im ') || col.includes('semester') || col.includes('halbjahr')) {
        statusIndex = i;
        break;
      }
    }

    const teacherColumns = detectTeacherColumns(headerCols);
    if (teacherColumns.length === 0) {
      setParseError(`Keine Lehrpersonen-Spalten im Header erkannt. (${headerCols.length} Spalten erkannt, Header Zeile ${headerIndex + 1}–${headerEndIndex + 1})`);
      return;
    }

    const results: ClassTeacherData[] = [];
    const dataLines = lines.slice(headerEndIndex + 1);

    for (const line of dataLines) {
      const cols = splitLine(line).map(c => c.trim());
      if (cols.length < 3) continue;

      const klasse = cols[0];
      if (!klasse) continue;

      // Filter section headers
      if (SECTION_HEADERS.some(s => klasse.toLowerCase() === s || klasse.toLowerCase().startsWith(s + ' '))) {
        // Only skip if no status or status is not "aktiv"
        if (statusIndex < 0 || cols[statusIndex]?.toLowerCase() !== 'aktiv') continue;
      }

      // Filter non-active
      if (statusIndex >= 0 && cols[statusIndex]?.toLowerCase() !== 'aktiv') continue;

      const teachers: { name: string; rolle: string }[] = [];
      for (const tc of teacherColumns) {
        if (tc.index < cols.length && cols[tc.index]) {
          const name = cols[tc.index].trim();
          if (name) {
            teachers.push({ name, rolle: tc.rolle });
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
      <Card className="transition-all duration-200 hover:shadow-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ClipboardPaste className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base">Klassen-Daten einfügen</CardTitle>
              <CardDescription>Zuweisungsdaten aus LehrerOffice (Tab-getrennt)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-primary/20 bg-primary/[0.03]">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-sm">
              Kopieren Sie die Daten inkl. Kopfzeile aus LehrerOffice. Rollen (Klassenlehrperson, Vikariat, Heilpädagoge/in, Förderlehrperson, Schulsozialarbeiter/in etc.) werden automatisch aus den Spaltenüberschriften erkannt.
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

          <Button onClick={parseData} disabled={!rawText.trim()} className="shadow-sm">
            <ClipboardPaste className="h-4 w-4 mr-2" />
            Daten verarbeiten
          </Button>
        </CardContent>
      </Card>

      {classData.length > 0 && (
        <>
        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={onBack} className="shadow-sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück
          </Button>
          <Button onClick={onNext} disabled={classData.length === 0} className="shadow-sm">
            Weiter
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Erkannte Zuweisungen</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 flex-wrap">
              <Badge variant="secondary">{classData.length} Klassen</Badge>
              <Badge variant="secondary">{totalTeachers} Zuweisungen</Badge>
              <Badge variant="secondary">{uniqueTeachers} eindeutige LPs</Badge>
            </div>

            <div className="max-h-[400px] overflow-auto border rounded-xl">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky top-0 bg-muted/50 backdrop-blur-sm">Klasse</TableHead>
                    <TableHead className="sticky top-0 bg-muted/50 backdrop-blur-sm">Lehrpersonen</TableHead>
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
        <Button variant="outline" onClick={onBack} className="shadow-sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Zurück
        </Button>
        <Button onClick={onNext} disabled={classData.length === 0} className="shadow-sm">
          Weiter
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
