import { useState } from 'react';
import { FileText, Download, Clock, User, ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import type { ChangeLogEntry } from '@/types/importTypes';

interface ChangeLogProps {
  entries: ChangeLogEntry[];
  fileName?: string;
  importTypeName?: string;
}

export function ChangeLog({ entries, fileName, importTypeName }: ChangeLogProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('de-CH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(date);
  };

  const getTypeLabel = (type: ChangeLogEntry['type']) => {
    switch (type) {
      case 'manual':
        return 'Manuell';
      case 'ai-bulk':
        return 'KI-Bulk';
      case 'ai-auto':
        return 'KI-Auto';
      default:
        return type;
    }
  };

  const getTypeBadgeVariant = (type: ChangeLogEntry['type']) => {
    switch (type) {
      case 'manual':
        return 'outline';
      case 'ai-bulk':
        return 'default';
      case 'ai-auto':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  const exportLog = () => {
    const now = new Date();
    const dateStr = new Intl.DateTimeFormat('de-CH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(now).replace(/[/:]/g, '-').replace(', ', '_');

    let content = `# Änderungsprotokoll\n`;
    content += `# Erstellt: ${now.toLocaleString('de-CH')}\n`;
    if (fileName) content += `# Quelldatei: ${fileName}\n`;
    if (importTypeName) content += `# Import-Typ: ${importTypeName}\n`;
    content += `# Anzahl Änderungen: ${entries.length}\n`;
    content += `\n`;
    content += `Zeitstempel;Typ;Zeile;Spalte;Originalwert;Neuer Wert;Schüler/Eintrag\n`;

    entries.forEach(entry => {
      const timestamp = new Intl.DateTimeFormat('de-CH', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(entry.timestamp);

      content += `${timestamp};${getTypeLabel(entry.type)};${entry.row};${entry.column};"${entry.originalValue}";"${entry.newValue}";"${entry.studentName || ''}"\n`;
    });

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `aenderungsprotokoll_${dateStr}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  if (entries.length === 0) {
    return null;
  }

  // Group entries by column for summary
  const byColumn = entries.reduce((acc, entry) => {
    acc[entry.column] = (acc[entry.column] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const manualCount = entries.filter(e => e.type === 'manual').length;
  const aiCount = entries.filter(e => e.type !== 'manual').length;

  return (
    <Card className="border-pupil-teal/30 bg-pupil-teal/5">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-pupil-teal" />
              <CardTitle className="text-lg">Änderungsprotokoll</CardTitle>
              <Badge variant="secondary" className="ml-2">
                {entries.length} Änderung{entries.length !== 1 ? 'en' : ''}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={exportLog}
                className="gap-1"
              >
                <Download className="h-4 w-4" />
                Exportieren
              </Button>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {isOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          <CardDescription className="flex flex-wrap gap-4 mt-2">
            <span className="flex items-center gap-1">
              <Badge variant="outline">{manualCount}</Badge> Manuell
            </span>
            <span className="flex items-center gap-1">
              <Badge>{aiCount}</Badge> KI-unterstützt
            </span>
            {Object.entries(byColumn).slice(0, 3).map(([col, count]) => (
              <span key={col} className="text-muted-foreground">
                {col}: {count}×
              </span>
            ))}
            {Object.keys(byColumn).length > 3 && (
              <span className="text-muted-foreground">
                +{Object.keys(byColumn).length - 3} weitere Spalten
              </span>
            )}
          </CardDescription>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="border rounded-lg overflow-hidden max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-24">Zeit</TableHead>
                    <TableHead className="w-20">Typ</TableHead>
                    <TableHead className="w-16">Zeile</TableHead>
                    <TableHead>Spalte</TableHead>
                    <TableHead>Änderung</TableHead>
                    <TableHead>Schüler/Eintrag</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.slice().reverse().map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 inline mr-1" />
                        {formatTimestamp(entry.timestamp)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(entry.type) as "outline" | "default" | "secondary"}>
                          {getTypeLabel(entry.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{entry.row}</TableCell>
                      <TableCell className="font-mono text-sm">{entry.column}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-destructive line-through max-w-[100px] truncate" title={entry.originalValue}>
                            {entry.originalValue || '(leer)'}
                          </span>
                          <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                          <span className="text-pupil-success font-medium max-w-[100px] truncate" title={entry.newValue}>
                            {entry.newValue}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.studentName && (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {entry.studentName}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
