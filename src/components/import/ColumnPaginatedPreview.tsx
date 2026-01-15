import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ParsedRow } from '@/types/importTypes';

interface ColumnPaginatedPreviewProps {
  headers: string[];
  rows: ParsedRow[];
  title?: string;
  columnsPerPage?: number;
  showRowNumbers?: boolean;
}

export function ColumnPaginatedPreview({
  headers,
  rows,
  title,
  columnsPerPage = 6,
  showRowNumbers = false,
}: ColumnPaginatedPreviewProps) {
  const [columnPage, setColumnPage] = useState(0);
  
  const totalColumnPages = Math.ceil(headers.length / columnsPerPage);
  const startCol = columnPage * columnsPerPage;
  const endCol = Math.min(startCol + columnsPerPage, headers.length);
  const visibleHeaders = headers.slice(startCol, endCol);

  const handlePrevColumns = () => {
    setColumnPage(prev => Math.max(0, prev - 1));
  };

  const handleNextColumns = () => {
    setColumnPage(prev => Math.min(totalColumnPages - 1, prev + 1));
  };

  return (
    <div>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">{title}</h3>
          {totalColumnPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrevColumns}
                disabled={columnPage === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                Spalten {startCol + 1}-{endCol} von {headers.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleNextColumns}
                disabled={columnPage >= totalColumnPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-pupil-teal">
                {showRowNumbers && (
                  <TableHead className="text-pupil-teal-foreground w-16">#</TableHead>
                )}
                {visibleHeaders.map((header) => (
                  <TableHead key={header} className="text-pupil-teal-foreground font-semibold whitespace-nowrap">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, rowIdx) => (
                <TableRow key={rowIdx}>
                  {showRowNumbers && (
                    <TableCell className="font-mono text-muted-foreground">{rowIdx + 1}</TableCell>
                  )}
                  {visibleHeaders.map((header) => (
                    <TableCell key={header} className="whitespace-nowrap max-w-[200px] truncate">
                      {String(row[header] ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
