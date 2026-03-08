import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, ArrowRight, ClipboardPaste, CheckCircle2 } from 'lucide-react';
import type { ClassTeacherData } from '@/types/importTypes';
import { LOInstructionGuide } from './LOInstructionGuide';

const SECTION_HEADERS = ['kindergarten', 'primarschule', 'bezirksschule', 'realschule', 'sekundarschule', 'sonder'];

// Words/patterns that should NEVER be treated as teacher names
const NOT_A_NAME_PATTERNS = [
  /^\d/, // starts with number
  /^\d{2}\.\d{2}\.\d{4}/, // date
  /^#/, // #### placeholders
  /^import\s/i,
  /^wie\s/i,
  /^in\s+der\s/i,
  /^aus\s+der\s/i,
  /schüler/i,
  /umteilen/i,
  /belassen/i,
  /entfernen/i,
  /archivieren/i,
  /möglich/i,
  /einbeziehen/i,
  /ausschliessen/i,
  /ausschließen/i,
  /ablegen/i,
  /transfer/i,
  /vikariat/i,
  /planklasse/i,
  /homeschooling/i,
  /privatschul/i,
  /sportschule/i,
  /volksschule/i,
  /extern$/i,
  /sonder/i,
  /oberstufe/i,
  /ehemalige/i,
  /einteilung/i,
  /temporär/i,
  /fehlende/i,
  /kursid/i,
  /fremdschlüssel/i,
  /schnittstelle/i,
  /bemerkung/i,
  /bista/i,
  /geändert/i,
  /erstellt/i,
  /einstellung/i,
  /weiteres/i,
  /wortbeurteilung/i,
  /schuljahreswechsel/i,
  /^\d+\s*sus$/i, // "25 SuS"
  /^\d+(\.\d+)?(\s*\|\s*\d+(\.\d+)?)+/, // "3.75 | 4.75 | 5.5"
  /^[A-Z0-9]{6,}$/, // long uppercase/number codes like UDMKH4BG556BE155
  /^[A-Z]\d[A-Z]/, // codes like KG1BRA, P1HOA
  /^[A-Z]{2,}\d/, // codes starting with letters then digit like SS4IG, L29JF
];

function looksLikePersonName(value: string): boolean {
  if (!value || value.length < 3 || value.length > 60) return false;
  if (NOT_A_NAME_PATTERNS.some(p => p.test(value))) return false;
  // Should have at most 5 words, contain mostly letters
  const words = value.split(/\s+/);
  if (words.length > 5) return false;
  // At least one word should be >2 chars and start with uppercase
  return words.some(w => w.length > 2 && /^[A-ZÄÖÜÉÈÀ]/.test(w));
}

interface TeacherColumn {
  index: number;
  rolle: string;
}

function detectTeacherColumns(headerCols: string[]): TeacherColumn[] {
  const columns: TeacherColumn[] = [];
  for (let i = 0; i < headerCols.length; i++) {
    const col = headerCols[i].toLowerCase().trim();
    if (!col) continue;
    
    // Exclude the count column "Lehrpersonen" (plural, no specific role)
    if (col === 'lehrpersonen') continue;
    // Exclude other non-teacher columns that might partially match
    if (col === 'schüler/innen' || col === 'wortbeurteilung') continue;
    
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

  const parseData = () => {
    setParseError(null);
    const lines = rawText.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      setParseError('Bitte fügen Sie die Daten aus LehrerOffice ein (mind. Header + eine Datenzeile).');
      return;
    }

    // Split each line by tabs
    const allRows = lines.map(l => l.split('\t').map(c => c.trim()));

    // Find header row(s): look for lines containing teacher keywords
    // LehrerOffice can produce either:
    //   A) Single header row with all column names
    //   B) Two header rows: row1 = group headers (Klasse, Status, Grunddaten...),
    //      row2 = sub-headers (..., Klassenlehrperson, Vikariat, ...)
    
    let headerRowIndices: number[] = [];
    let mergedHeader: string[] = [];
    
    for (let i = 0; i < Math.min(allRows.length, 5); i++) {
      const row = allRows[i];
      const hasKlasse = row[0]?.toLowerCase() === 'klasse';
      const hasLP = row.some(c => c.toLowerCase().includes('lehrperson'));
      
      if (hasKlasse || hasLP) {
        headerRowIndices.push(i);
        // If this row has both Klasse and LP columns, it's a single-row header
        if (hasKlasse && hasLP) {
          mergedHeader = row;
          break;
        }
        // If we found LP (teacher columns), stop looking
        if (hasLP) break;
      }
    }

    if (headerRowIndices.length === 0) {
      setParseError('Kein Header mit "Klasse" oder "Lehrperson" gefunden.');
      return;
    }

    // Merge multiple header rows: for each column position, take the non-empty value
    // from the LAST header row (sub-headers override group headers)
    if (mergedHeader.length === 0) {
      // Determine max columns across header rows
      const maxCols = Math.max(...headerRowIndices.map(i => allRows[i].length));
      mergedHeader = new Array(maxCols).fill('');
      
      // Fill from first to last header row (later rows override)
      for (const idx of headerRowIndices) {
        const row = allRows[idx];
        for (let c = 0; c < row.length; c++) {
          if (row[c]) mergedHeader[c] = row[c];
        }
      }
    }

    // Detect status and teacher columns from merged header
    let statusIndex = -1;
    for (let i = 0; i < mergedHeader.length; i++) {
      const col = mergedHeader[i].toLowerCase();
      if (col === 'status' || col.startsWith('im ') || col.includes('halbjahr')) {
        statusIndex = i;
        break;
      }
    }

    const teacherColumns = detectTeacherColumns(mergedHeader);
    if (teacherColumns.length === 0) {
      setParseError(`Keine Lehrpersonen-Spalten erkannt. Header: ${mergedHeader.filter(h => h).slice(0, 10).join(', ')}...`);
      return;
    }

    // Data starts after the last header row
    const dataStartIndex = Math.max(...headerRowIndices) + 1;
    const results: ClassTeacherData[] = [];

    for (let r = dataStartIndex; r < allRows.length; r++) {
      const cols = allRows[r];
      if (cols.length < 3) continue;

      const klasse = cols[0];
      if (!klasse) continue;

      // Filter section headers (Kindergarten, Primarschule, etc.)
      if (SECTION_HEADERS.some(s => klasse.toLowerCase() === s || klasse.toLowerCase().startsWith(s + ' '))) {
        if (statusIndex < 0 || cols[statusIndex]?.toLowerCase() !== 'aktiv') continue;
      }

      // Filter non-active rows
      if (statusIndex >= 0 && cols[statusIndex]?.toLowerCase() !== 'aktiv') continue;

      const teachers: { name: string; rolle: string }[] = [];
      for (const tc of teacherColumns) {
        if (tc.index < cols.length && cols[tc.index]) {
          const name = cols[tc.index].trim();
          // Validate: must look like a person name
          if (name && looksLikePersonName(name)) {
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
          <LOInstructionGuide />

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
