import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { ParsedRow, ValidationError, FieldMapping } from '@/types/importTypes';

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  fileName: string;
}

// Parse CSV or Excel file
export async function parseFile(file: File): Promise<ParseResult> {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return parseCSV(file);
  } else if (['xlsx', 'xls'].includes(extension || '')) {
    return parseExcel(file);
  } else {
    throw new Error('Nicht unterstütztes Dateiformat. Bitte CSV oder Excel-Datei hochladen.');
  }
}

async function parseCSV(file: File): Promise<ParseResult> {
  const text = await file.text();
  const workbook = XLSX.read(text, { type: 'string', raw: true });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { header: 1 });
  
  if (data.length === 0) {
    throw new Error('Die Datei ist leer.');
  }

  const firstRow = data[0] as unknown as string[];
  const headers = firstRow.map(h => String(h).trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < data.length; i++) {
    const rowData = data[i] as unknown as (string | number | null)[];
    if (rowData && rowData.some && rowData.some(cell => cell !== null && cell !== undefined && cell !== '')) {
      const row: ParsedRow = {};
      headers.forEach((header, idx) => {
        row[header] = rowData[idx] ?? null;
      });
      rows.push(row);
    }
  }

  return { headers, rows, fileName: file.name };
}

async function parseExcel(file: File): Promise<ParseResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json<ParsedRow>(sheet, { header: 1 });

  if (data.length === 0) {
    throw new Error('Die Datei ist leer.');
  }

  const firstRow = data[0] as unknown as string[];
  const headers = firstRow.map(h => String(h).trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < data.length; i++) {
    const rowData = data[i] as unknown as (string | number | null)[];
    if (rowData && rowData.some && rowData.some(cell => cell !== null && cell !== undefined && cell !== '')) {
      const row: ParsedRow = {};
      headers.forEach((header, idx) => {
        row[header] = rowData[idx] ?? null;
      });
      rows.push(row);
    }
  }

  return { headers, rows, fileName: file.name };
}

// Auto-map source fields to target fields
export function autoMapFields(
  sourceHeaders: string[],
  fieldMappings: FieldMapping[]
): Record<string, string> {
  const mappings: Record<string, string> = {};

  sourceHeaders.forEach(sourceHeader => {
    const normalizedSource = sourceHeader.toLowerCase().replace(/[_\-\s]/g, '');
    
    // Try exact match first
    const exactMatch = fieldMappings.find(
      f => f.sourceField.toLowerCase().replace(/[_\-\s]/g, '') === normalizedSource
    );
    
    if (exactMatch) {
      mappings[sourceHeader] = exactMatch.targetField || '__skip__';
      return;
    }

    // Try partial match
    const partialMatch = fieldMappings.find(
      f => normalizedSource.includes(f.sourceField.toLowerCase().replace(/[_\-\s]/g, '')) ||
           f.sourceField.toLowerCase().replace(/[_\-\s]/g, '').includes(normalizedSource)
    );

    if (partialMatch) {
      mappings[sourceHeader] = partialMatch.targetField || '__skip__';
    } else {
      mappings[sourceHeader] = '__skip__';
    }
  });

  return mappings;
}

// Validate data
export function validateData(
  rows: ParsedRow[],
  mappings: Record<string, string>,
  fieldDefinitions: FieldMapping[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Get required fields from mappings
  const requiredFields = fieldDefinitions.filter(f => f.required);

  rows.forEach((row, rowIndex) => {
    // Check required fields
    requiredFields.forEach(field => {
      const sourceField = Object.keys(mappings).find(k => mappings[k] === field.targetField);
      if (sourceField) {
        const value = row[sourceField];
        if (value === null || value === undefined || String(value).trim() === '') {
          errors.push({
            row: rowIndex + 1,
            field: sourceField,
            value: String(value ?? ''),
            message: `Pflichtfeld "${field.targetField}" ist leer`,
          });
        }
      }
    });

    // Validate date formats
    Object.keys(mappings).forEach(sourceField => {
      const targetField = mappings[sourceField];
      if (targetField.toLowerCase().includes('datum') || 
          targetField.toLowerCase().includes('beginn') || 
          targetField.toLowerCase().includes('ende')) {
        const value = row[sourceField];
        if (value && !isValidDate(String(value))) {
          errors.push({
            row: rowIndex + 1,
            field: sourceField,
            value: String(value),
            message: 'Ungültiges Datumsformat. Erwartet: TT.MM.JJJJ',
          });
        }
      }
    });

    // Validate AHV number format
    Object.keys(mappings).forEach(sourceField => {
      if (sourceField.toLowerCase().includes('ahv')) {
        const value = row[sourceField];
        if (value && !isValidAHV(String(value))) {
          errors.push({
            row: rowIndex + 1,
            field: sourceField,
            value: String(value),
            message: 'Ungültiges AHV-Format. Erwartet: 756.XXXX.XXXX.XX',
          });
        }
      }
    });
  });

  return errors;
}

function isValidDate(value: string): boolean {
  // Accept various date formats
  const patterns = [
    /^\d{2}\.\d{2}\.\d{4}$/, // DD.MM.YYYY
    /^\d{4}-\d{2}-\d{2}$/,   // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // DD/MM/YYYY
  ];
  return patterns.some(p => p.test(value)) || !isNaN(Date.parse(value));
}

function isValidAHV(value: string): boolean {
  // Swiss AHV number format: 756.XXXX.XXXX.XX
  const pattern = /^756\.\d{4}\.\d{4}\.\d{2}$/;
  return pattern.test(value) || value.trim() === '';
}

// Apply corrections to rows
export function applyCorrectedValues(
  rows: ParsedRow[],
  errors: ValidationError[]
): ParsedRow[] {
  const correctedRows = rows.map(row => ({ ...row }));
  
  errors.forEach(error => {
    if (error.correctedValue !== undefined) {
      const rowIndex = error.row - 1;
      if (correctedRows[rowIndex]) {
        correctedRows[rowIndex][error.field] = error.correctedValue;
      }
    }
  });

  return correctedRows;
}

// Export to CSV
export function exportToCSV(
  rows: ParsedRow[],
  mappings: Record<string, string>,
  importType: string,
  options: {
    onlyErrorFree?: boolean;
    errors?: ValidationError[];
    usePupilHeaders?: boolean;
  } = {}
): void {
  const { onlyErrorFree = false, errors = [], usePupilHeaders = true } = options;

  // Filter rows if onlyErrorFree
  let exportRows = rows;
  if (onlyErrorFree && errors.length > 0) {
    const errorRows = new Set(errors.map(e => e.row));
    exportRows = rows.filter((_, idx) => !errorRows.has(idx + 1));
  }

  // Filter out skipped mappings
  const activeMappings = Object.entries(mappings).filter(
    ([_, target]) => target !== '__skip__' && target !== ''
  );

  // Create headers
  const headers = usePupilHeaders
    ? activeMappings.map(([_, target]) => target)
    : activeMappings.map(([source, _]) => source);

  // Create data rows
  const data = exportRows.map(row => {
    return activeMappings.map(([source, _]) => {
      const value = row[source];
      return value !== null && value !== undefined ? String(value) : '';
    });
  });

  // Create workbook
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daten');

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${importType}_${date}_bereinigt.csv`;

  // Export
  const csvContent = XLSX.utils.sheet_to_csv(ws, { FS: ';' });
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, fileName);
}

// Export to Excel
export function exportToExcel(
  rows: ParsedRow[],
  mappings: Record<string, string>,
  importType: string,
  options: {
    onlyErrorFree?: boolean;
    errors?: ValidationError[];
    usePupilHeaders?: boolean;
  } = {}
): void {
  const { onlyErrorFree = false, errors = [], usePupilHeaders = true } = options;

  // Filter rows if onlyErrorFree
  let exportRows = rows;
  if (onlyErrorFree && errors.length > 0) {
    const errorRows = new Set(errors.map(e => e.row));
    exportRows = rows.filter((_, idx) => !errorRows.has(idx + 1));
  }

  // Filter out skipped mappings
  const activeMappings = Object.entries(mappings).filter(
    ([_, target]) => target !== '__skip__' && target !== ''
  );

  // Create headers
  const headers = usePupilHeaders
    ? activeMappings.map(([_, target]) => target)
    : activeMappings.map(([source, _]) => source);

  // Create data rows
  const data = exportRows.map(row => {
    return activeMappings.map(([source, _]) => {
      const value = row[source];
      return value !== null && value !== undefined ? String(value) : '';
    });
  });

  // Create workbook
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daten');

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${importType}_${date}_bereinigt.xlsx`;

  // Export
  XLSX.writeFile(wb, fileName);
}
