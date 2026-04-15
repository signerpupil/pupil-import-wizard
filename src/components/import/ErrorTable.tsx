import { useState, useMemo } from 'react';
import { Edit2, Save, ChevronDown, ChevronUp, Languages, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VALID_BISTA_LANGUAGES, VALID_NATIONALITIES } from '@/lib/fileParser';
import type { ValidationError } from '@/types/importTypes';

interface ErrorTableProps {
  errors: ValidationError[];
  dedicatedSectionErrorKeys: Set<string>;
  onErrorCorrect: (rowIndex: number, column: string, value: string, correctionType?: 'manual' | 'bulk' | 'auto') => void;
  onStartStepByStep: (filterRows?: number[], filterColumn?: string) => void;
}

const LANGUAGE_COLUMNS = new Set(['S_Muttersprache', 'S_Umgangssprache']);
const NATIONALITY_COLUMNS = new Set(['S_Nationalitaet']);

export function ErrorTable({
  errors,
  dedicatedSectionErrorKeys,
  onErrorCorrect,
  onStartStepByStep,
}: ErrorTableProps) {
  const [editingCell, setEditingCell] = useState<{ row: number; column: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedErrorColumns, setExpandedErrorColumns] = useState<Set<string>>(new Set(['__first__']));
  const [showOnlyOpenErrors, setShowOnlyOpenErrors] = useState(true);
  const [languageDropdownCell, setLanguageDropdownCell] = useState<{ row: number; column: string } | null>(null);
  const [nationalityDropdownCell, setNationalityDropdownCell] = useState<{ row: number; column: string } | null>(null);

  const BISTA_LANGUAGES_SORTED = useMemo(() => [...VALID_BISTA_LANGUAGES].sort((a, b) => a.localeCompare(b, 'de')), []);
  const NATIONALITIES_SORTED = useMemo(() => [...VALID_NATIONALITIES].sort((a, b) => a.localeCompare(b, 'de')), []);

  const errorsByColumn = useMemo(() => {
    const map = new Map<string, ValidationError[]>();
    for (const e of errors) {
      if (dedicatedSectionErrorKeys.has(`${e.row}:${e.column}`)) continue;
      if (!map.has(e.column)) map.set(e.column, []);
      map.get(e.column)!.push(e);
    }
    return Array.from(map.entries()).sort((a, b) => {
      const aUncorrected = a[1].filter(e => !e.correctedValue).length;
      const bUncorrected = b[1].filter(e => !e.correctedValue).length;
      return bUncorrected - aUncorrected;
    });
  }, [errors, dedicatedSectionErrorKeys]);

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

  if (errors.length === 0) return null;

  return (
    <div className="space-y-2">
      {/* Filter toggle */}
      <div className="flex items-center justify-between px-1 pb-1">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-destructive/20 border border-destructive/40" />
            <span className="text-xs text-muted-foreground">Offen</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm bg-pupil-success/15 border border-pupil-success/30" />
            <span className="text-xs text-muted-foreground">Korrigiert</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {showOnlyOpenErrors ? 'Nur offene Fehler' : 'Alle anzeigen'}
          </span>
          <Switch
            checked={!showOnlyOpenErrors}
            onCheckedChange={(checked) => setShowOnlyOpenErrors(!checked)}
            id="show-corrected"
          />
          <label htmlFor="show-corrected" className="text-xs text-muted-foreground cursor-pointer">
            Korrigierte einblenden
          </label>
        </div>
      </div>

      {errorsByColumn
        .filter(([, colErrors]) => {
          if (showOnlyOpenErrors) {
            return colErrors.some(e => e.correctedValue === undefined);
          }
          return true;
        })
        .map(([column, colErrors], colIdx) => {
          const uncorrected = colErrors.filter(e => !e.correctedValue);
          const corrected = colErrors.filter(e => e.correctedValue !== undefined);
          const isOpen = colIdx === 0
            ? !expandedErrorColumns.has(`__closed__${column}`)
            : expandedErrorColumns.has(column);
          const toggleCol = () => {
            setExpandedErrorColumns(prev => {
              const s = new Set(prev);
              if (colIdx === 0) {
                s.has(`__closed__${column}`) ? s.delete(`__closed__${column}`) : s.add(`__closed__${column}`);
              } else {
                s.has(column) ? s.delete(column) : s.add(column);
              }
              return s;
            });
          };

          return (
            <div key={column} className="border rounded-lg overflow-hidden">
              <button
                onClick={toggleCol}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <code className="text-sm font-semibold font-mono">{column}</code>
                  <div className="flex items-center gap-1.5">
                    {uncorrected.length > 0 && (
                      <Badge variant="destructive" className="text-xs">{uncorrected.length} offen</Badge>
                    )}
                    {corrected.length > 0 && (
                      <Badge variant="secondary" className="text-xs text-pupil-success">{corrected.length} korrigiert</Badge>
                    )}
                  </div>
                </div>
                <div
                  role="button"
                  tabIndex={0}
                  className="inline-flex items-center gap-1.5 text-xs shrink-0 px-3 py-1.5 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                  onClick={(e) => { e.stopPropagation(); e.preventDefault(); onStartStepByStep(colErrors.filter(err => !err.correctedValue).map(err => err.row), column); }}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); e.preventDefault(); onStartStepByStep(colErrors.filter(err => !err.correctedValue).map(err => err.row), column); } }}
                >
                  <Edit2 className="h-3.5 w-3.5" />
                  Alle korrigieren
                </div>
              </button>

              {isOpen && (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-pupil-teal">
                      <TableHead className="text-pupil-teal-foreground w-20">Zeile</TableHead>
                      <TableHead className="text-pupil-teal-foreground">Wert</TableHead>
                      <TableHead className="text-pupil-teal-foreground">Fehler</TableHead>
                      <TableHead className="text-pupil-teal-foreground w-32">Aktion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {colErrors
                      .filter(error => showOnlyOpenErrors ? error.correctedValue === undefined : true)
                      .map((error, idx) => {
                        const isEditing = editingCell?.row === error.row && editingCell?.column === error.column;
                        const isCorrected = error.correctedValue !== undefined;
                        const isLanguageCol = LANGUAGE_COLUMNS.has(error.column);
                        const isNationalityCol = NATIONALITY_COLUMNS.has(error.column);
                        const isLanguageDropdownOpen = languageDropdownCell?.row === error.row && languageDropdownCell?.column === error.column;
                        const isNationalityDropdownOpen = nationalityDropdownCell?.row === error.row && nationalityDropdownCell?.column === error.column;
                        const shortMessage = error.message.length > 45 ? error.message.slice(0, 42) + '…' : error.message;

                        return (
                          <TableRow
                            key={idx}
                            data-row={error.row}
                            className={`transition-all ${isCorrected ? 'bg-pupil-success/5' : 'bg-destructive/5'}`}
                          >
                            <TableCell className="font-mono">{error.row}</TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-8" autoFocus />
                              ) : (
                                <span className={isCorrected ? 'line-through text-muted-foreground' : ''}>
                                  {error.value || '(leer)'}
                                </span>
                              )}
                              {isCorrected && !isEditing && (
                                <span className="ml-2 text-pupil-success font-medium">→ {error.correctedValue}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge variant={isCorrected ? 'secondary' : 'destructive'} className="cursor-help max-w-[180px] truncate inline-block">
                                      {shortMessage}
                                    </Badge>
                                  </TooltipTrigger>
                                  {error.message.length > 45 && (
                                    <TooltipContent side="top" className="max-w-sm text-xs">{error.message}</TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell>
                              {isLanguageCol && !isCorrected ? (
                                <div className="relative">
                                  <Button size="sm" variant="outline" className="gap-1.5 w-full"
                                    onClick={() => setLanguageDropdownCell(isLanguageDropdownOpen ? null : { row: error.row, column: error.column })}>
                                    <Languages className="h-3.5 w-3.5" />
                                    Sprache wählen
                                    <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${isLanguageDropdownOpen ? 'rotate-180' : ''}`} />
                                  </Button>
                                  {isLanguageDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-md shadow-lg w-56">
                                      <ScrollArea className="h-64">
                                        <div className="p-1">
                                          {BISTA_LANGUAGES_SORTED.map(lang => (
                                            <button key={lang} className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                                              onClick={() => { onErrorCorrect(error.row, error.column, lang, 'manual'); setLanguageDropdownCell(null); }}>
                                              {lang}
                                            </button>
                                          ))}
                                        </div>
                                      </ScrollArea>
                                    </div>
                                  )}
                                </div>
                              ) : isNationalityCol && !isCorrected ? (
                                <div className="relative">
                                  <Button size="sm" variant="outline" className="gap-1.5 w-full"
                                    onClick={() => setNationalityDropdownCell(isNationalityDropdownOpen ? null : { row: error.row, column: error.column })}>
                                    <Globe className="h-3.5 w-3.5" />
                                    Land wählen
                                    <ChevronDown className={`h-3.5 w-3.5 ml-auto transition-transform ${isNationalityDropdownOpen ? 'rotate-180' : ''}`} />
                                  </Button>
                                  {isNationalityDropdownOpen && (
                                    <div className="absolute right-0 top-full mt-1 z-50 bg-background border border-border rounded-md shadow-lg w-64">
                                      <ScrollArea className="h-72">
                                        <div className="p-1">
                                          {NATIONALITIES_SORTED.map(nat => (
                                            <button key={nat} className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted transition-colors"
                                              onClick={() => { onErrorCorrect(error.row, error.column, nat, 'manual'); setNationalityDropdownCell(null); }}>
                                              {nat}
                                            </button>
                                          ))}
                                        </div>
                                      </ScrollArea>
                                    </div>
                                  )}
                                </div>
                              ) : isEditing ? (
                                <Button size="sm" onClick={handleSaveEdit}>
                                  <Save className="h-4 w-4 mr-1" />
                                  Speichern
                                </Button>
                              ) : (
                                <Button size="sm" variant="outline"
                                  onClick={() => isLanguageCol
                                    ? setLanguageDropdownCell({ row: error.row, column: error.column })
                                    : isNationalityCol
                                    ? setNationalityDropdownCell({ row: error.row, column: error.column })
                                    : handleStartEdit(error.row, error.column, error.correctedValue ?? error.value)
                                  }>
                                  {isLanguageCol ? <Languages className="h-4 w-4 mr-1" /> : isNationalityCol ? <Globe className="h-4 w-4 mr-1" /> : <Edit2 className="h-4 w-4 mr-1" />}
                                  {isCorrected ? 'Ändern' : 'Korrigieren'}
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}
            </div>
          );
        })}
    </div>
  );
}
