import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ParsedRow, ValidationError, ColumnDefinition, ColumnStatus } from '@/types/importTypes';
import { isValidGender as checkGenderValid, ALL_VALID_GENDER_VALUES, isValidAHVChecksum } from '@/lib/formatters';
import { validatePlzOrt } from '@/lib/swissPlzData';

export interface SourceFileInfo {
  name: string;
  rowCount: number;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  fileName: string;
  sourceFiles?: SourceFileInfo[];
}

// Merge multiple ParseResults into one, adding a _source_file column
export function mergeParseResults(results: ParseResult[]): ParseResult {
  if (results.length === 0) {
    return { headers: [], rows: [], fileName: '' };
  }
  if (results.length === 1) {
    return {
      ...results[0],
      sourceFiles: [{ name: results[0].fileName, rowCount: results[0].rows.length }],
    };
  }

  // Use first file's headers as reference
  const referenceHeaders = results[0].headers;

  // Validate header compatibility: all files must have the same headers (order-independent)
  const refSet = new Set(referenceHeaders);
  for (let i = 1; i < results.length; i++) {
    const otherSet = new Set(results[i].headers);
    const missing = referenceHeaders.filter(h => !otherSet.has(h));
    const extra = results[i].headers.filter(h => !refSet.has(h));
    if (missing.length > 0) {
      throw new Error(
        `Datei "${results[i].fileName}" fehlen Spalten: ${missing.join(', ')}. Alle Dateien müssen dieselben Spalten haben.`
      );
    }
    // Extra columns in subsequent files are ignored (only reference headers used)
    if (extra.length > 0) {
      console.warn(`Datei "${results[i].fileName}" hat zusätzliche Spalten die ignoriert werden: ${extra.join(', ')}`);
    }
  }

  // Merge rows, adding _source_file
  const mergedRows: ParsedRow[] = [];
  const sourceFiles: SourceFileInfo[] = [];

  for (const result of results) {
    sourceFiles.push({ name: result.fileName, rowCount: result.rows.length });
    for (const row of result.rows) {
      const newRow: ParsedRow = { _source_file: result.fileName };
      for (const header of referenceHeaders) {
        newRow[header] = row[header] ?? null;
      }
      mergedRows.push(newRow);
    }
  }

  // Add _source_file to headers
  const mergedHeaders = ['_source_file', ...referenceHeaders];
  const fileNames = results.map(r => r.fileName).join(' + ');

  return {
    headers: mergedHeaders,
    rows: mergedRows,
    fileName: fileNames,
    sourceFiles,
  };
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
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  
  if (lines.length === 0) {
    throw new Error('Die Datei ist leer.');
  }

  // Detect delimiter (semicolon or comma)
  const firstLine = lines[0];
  const delimiter = firstLine.includes(';') ? ';' : ',';
  
  // Parse CSV with proper handling of quoted values
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseCSVLine(lines[0]).map(h => h.trim());
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowData = parseCSVLine(lines[i]);
    if (rowData.some(cell => cell !== null && cell !== undefined && cell !== '')) {
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
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    throw new Error('Die Datei ist leer.');
  }

  const headers: string[] = [];
  const rows: ParsedRow[] = [];
  
  // Get headers from first row
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = String(cell.value ?? '').trim();
  });

  // Filter out empty trailing headers
  while (headers.length > 0 && headers[headers.length - 1] === '') {
    headers.pop();
  }

  // Get data rows
  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex++) {
    const row = worksheet.getRow(rowIndex);
    const rowData: (string | number | null)[] = [];
    let hasData = false;
    
    for (let colIndex = 1; colIndex <= headers.length; colIndex++) {
      const cell = row.getCell(colIndex);
      let value: string | number | null = null;
      
      if (cell.value !== null && cell.value !== undefined) {
        // Handle different cell types
        if (cell.type === ExcelJS.ValueType.Date && cell.value instanceof Date) {
          // Format date as DD.MM.YYYY
          const date = cell.value;
          value = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
        } else if (typeof cell.value === 'object' && 'result' in cell.value) {
          // Formula cell - use the result
          value = cell.value.result as string | number;
        } else if (typeof cell.value === 'object' && 'richText' in cell.value) {
          // Rich text - concatenate text parts
          value = (cell.value.richText as Array<{text: string}>).map(rt => rt.text).join('');
        } else {
          value = typeof cell.value === 'number' ? cell.value : String(cell.value);
        }
        hasData = true;
      }
      rowData.push(value);
    }
    
    if (hasData) {
      const parsedRow: ParsedRow = {};
      headers.forEach((header, idx) => {
        parsedRow[header] = rowData[idx] ?? null;
      });
      rows.push(parsedRow);
    }
  }

  return { headers, rows, fileName: file.name };
}

// Check column status (found, missing, extra)
export function checkColumnStatus(
  sourceHeaders: string[],
  expectedColumns: ColumnDefinition[]
): ColumnStatus[] {
  const statuses: ColumnStatus[] = [];
  const sourceHeadersSet = new Set(sourceHeaders);

  // Check expected columns
  expectedColumns.forEach(col => {
    const found = sourceHeadersSet.has(col.name);
    statuses.push({
      name: col.name,
      status: found ? 'found' : 'missing',
      required: col.required,
      category: col.category,
    });
  });

  // Check for extra columns
  const expectedNames = new Set(expectedColumns.map(c => c.name));
  sourceHeaders.forEach(header => {
    if (!expectedNames.has(header)) {
      statuses.push({
        name: header,
        status: 'extra',
        required: false,
      });
    }
  });

  return statuses;
}

// BISTA-Sprachliste (51 gültige Werte gemäss BISTA-Codierung)
export const VALID_BISTA_LANGUAGES = new Set([
  'Afrikanische Sprachen', 'Albanisch', 'Andere nordeuropäische Sprachen',
  'Andere westeuropäische Sprachen', 'Arabisch', 'Armenisch', 'Bosnisch',
  'Bulgarisch', 'Chinesisch', 'Dänisch', 'Deutsch', 'Englisch', 'Finnisch',
  'Französisch', 'Griechisch', 'Indoarische und drawidische Sprachen',
  'Italienisch', 'Japanisch', 'Koreanisch', 'Kroatisch', 'Kurdisch',
  'Mazedonisch', 'Mongolisch', 'Montenegrinisch', 'nicht definiert',
  'Niederländisch', 'Norwegisch', 'Ostasiatische Sprachen', 'Polnisch',
  'Portugiesisch', 'Rätoromanisch', 'Rumänisch', 'Russisch', 'Schwedisch',
  'Serbisch', 'Serbo-Kroatisch', 'Slowakisch', 'Slowenisch', 'Spanisch',
  'Tamil', 'Thai', 'Tibetisch', 'Tschechisch', 'Türkisch',
  'Übrige osteuropäische Sprachen', 'Übrige slawische Sprachen',
  'Übrige süd- und südostasiatische Sprachen', 'Übrige westasiatische Sprachen',
  'Ukrainisch', 'Ungarisch', 'Vietnamesisch', 'Westasiatische Sprachen',
]);

// Normalisierte Lookup-Map für Ähnlichkeitssuche (Tippfehler-Erkennung)
const BISTA_NORMALIZED = new Map<string, string>(
  [...VALID_BISTA_LANGUAGES].map(lang => [lang.toLowerCase().trim(), lang])
);

// Auto-Korrekturen für bekannte nicht-BISTA Sprachen
export const LANGUAGE_AUTO_CORRECTIONS: Record<string, string> = {
  'Tigrinya': 'Afrikanische Sprachen',
  'Dari': 'Westasiatische Sprachen',
  'Bangala': 'Indoarische und drawidische Sprachen',
  'Detusch': 'Deutsch',
  'Hindi': 'Indoarische und drawidische Sprachen',
  'Kosovarisch': 'Albanisch',
  'Farsi': 'Westasiatische Sprachen',
  'Tagalog': 'Übrige süd- und südostasiatische Sprachen',
  'Malayalam': 'Indoarische und drawidische Sprachen',
  'Indische Sprachen': 'Indoarische und drawidische Sprachen',
  'Paschto': 'Westasiatische Sprachen',
  'Urdu': 'Indoarische und drawidische Sprachen',
  'Swahili': 'Afrikanische Sprachen',
  'Amharisch': 'Afrikanische Sprachen',
  'Nepalesisch': 'Indoarische und drawidische Sprachen',
  'Slovakisch': 'Slowakisch',
  'Bengalisch': 'Indoarische und drawidische Sprachen',
  'Uigurisch': 'Ostasiatische Sprachen',
  'Litauisch': 'Übrige osteuropäische Sprachen',
  'Paschtou': 'Westasiatische Sprachen',
  'Persisch': 'Westasiatische Sprachen',
  'Kantonesisch': 'Chinesisch',
  'Mandarin': 'Chinesisch',
  'Holländisch': 'Niederländisch',
  'Susu': 'Afrikanische Sprachen',
  'Indonesisch': 'Übrige süd- und südostasiatische Sprachen',
  'Flämisch': 'Niederländisch',
  'Singalesisch': 'Übrige süd- und südostasiatische Sprachen',
  'Singhalesisch': 'Übrige süd- und südostasiatische Sprachen',
  'Tigrigna': 'Afrikanische Sprachen',
  'Brasilianisch': 'Portugiesisch',
  'Usbekisch': 'Übrige westasiatische Sprachen',
  'Uzbekisch': 'Übrige westasiatische Sprachen',
  'Tunesisch': 'Arabisch',
  'Hebräisch': 'Übrige westasiatische Sprachen',
  // Phase 2 additions
  'Somalisch': 'Afrikanische Sprachen',
  'Eritreisch': 'Afrikanische Sprachen',
  'Tamilisch': 'Tamil',
  'Kurdisch (Kurmandschi)': 'Kurdisch',
  'Marokkanisch': 'Arabisch',
  'Philippinisch': 'Übrige süd- und südostasiatische Sprachen',
  'Georgisch': 'Westasiatische Sprachen',
  'Berberisch': 'Afrikanische Sprachen',
  'Panjabi': 'Indoarische und drawidische Sprachen',
  'Punjabi': 'Indoarische und drawidische Sprachen',
  'Oromo': 'Afrikanische Sprachen',
  'Haussa': 'Afrikanische Sprachen',
  'Hausa': 'Afrikanische Sprachen',
  'Wolof': 'Afrikanische Sprachen',
  'Yoruba': 'Afrikanische Sprachen',
  'Igbo': 'Afrikanische Sprachen',
  'Birmanisch': 'Übrige süd- und südostasiatische Sprachen',
  'Burmesisch': 'Übrige süd- und südostasiatische Sprachen',
  'Khmer': 'Übrige süd- und südostasiatische Sprachen',
  'Lettisch': 'Übrige osteuropäische Sprachen',
  'Estnisch': 'Andere nordeuropäische Sprachen',
  'Isländisch': 'Andere nordeuropäische Sprachen',
  // Phase 3: Fehlende Sprachen (CH-Schulen)
  'Romani': 'Indoarische und drawidische Sprachen',   // Indoarische Sprache (verwandt mit Hindi/Sanskrit)
  'Romanes': 'Indoarische und drawidische Sprachen', // Alternativbezeichnung für Romani
  'Telugu': 'Indoarische und drawidische Sprachen',
  'Kannada': 'Indoarische und drawidische Sprachen',
  'Gujarati': 'Indoarische und drawidische Sprachen',
  'Marathi': 'Indoarische und drawidische Sprachen',
  'Kinyarwanda': 'Afrikanische Sprachen',
  'Kirundi': 'Afrikanische Sprachen',
  'Lingala': 'Afrikanische Sprachen',
  'Bambara': 'Afrikanische Sprachen',
  'Fulfulde': 'Afrikanische Sprachen',
  'Fula': 'Afrikanische Sprachen',
  'Twi': 'Afrikanische Sprachen',
  'Akan': 'Afrikanische Sprachen',
  'Somali': 'Afrikanische Sprachen',
  'Lao': 'Übrige süd- und südostasiatische Sprachen',
  'Malaiisch': 'Übrige süd- und südostasiatische Sprachen',
  'Malay': 'Übrige süd- und südostasiatische Sprachen',
  'Katalanisch': 'Andere westeuropäische Sprachen',
  'Baskisch': 'Andere westeuropäische Sprachen',
  'Irisch': 'Andere westeuropäische Sprachen',
  'Gälisch': 'Andere westeuropäische Sprachen',
  // Phase 3: Tippfehler-Varianten
  'Arabish': 'Arabisch',
  'Türkish': 'Türkisch',
  'Portugisisch': 'Portugiesisch',
  'Albanish': 'Albanisch',
  'Kroatish': 'Kroatisch',
  'Serbish': 'Serbisch',
  'Bosniakisch': 'Bosnisch',
  'Mazedonish': 'Mazedonisch',

  // ============================================
  // Phase 4: Weltweite Sprachen → BISTA-Mapping
  // ============================================

  // --- Afrikanische Sprachen (erweitert) ---
  'Zulu': 'Afrikanische Sprachen',
  'Xhosa': 'Afrikanische Sprachen',
  'Shona': 'Afrikanische Sprachen',
  'Ndebele': 'Afrikanische Sprachen',
  'Sotho': 'Afrikanische Sprachen',
  'Tswana': 'Afrikanische Sprachen',
  'Malagasy': 'Afrikanische Sprachen',
  'Ewe': 'Afrikanische Sprachen',
  'Fon': 'Afrikanische Sprachen',
  'Mooré': 'Afrikanische Sprachen',
  'Mossi': 'Afrikanische Sprachen',
  'Mandinka': 'Afrikanische Sprachen',
  'Sango': 'Afrikanische Sprachen',
  'Luba': 'Afrikanische Sprachen',
  'Chichewa': 'Afrikanische Sprachen',
  'Luganda': 'Afrikanische Sprachen',
  'Ganda': 'Afrikanische Sprachen',
  'Acholi': 'Afrikanische Sprachen',
  'Dinka': 'Afrikanische Sprachen',
  'Nuer': 'Afrikanische Sprachen',
  'Afar': 'Afrikanische Sprachen',
  'Beja': 'Afrikanische Sprachen',
  'Serer': 'Afrikanische Sprachen',
  'Diola': 'Afrikanische Sprachen',
  'Jola': 'Afrikanische Sprachen',
  'Mende': 'Afrikanische Sprachen',
  'Krio': 'Afrikanische Sprachen',
  'Edo': 'Afrikanische Sprachen',
  'Kikuyu': 'Afrikanische Sprachen',
  'Luo': 'Afrikanische Sprachen',
  'Runyankole': 'Afrikanische Sprachen',
  'Teso': 'Afrikanische Sprachen',
  'Nyanja': 'Afrikanische Sprachen',
  'Chewa': 'Afrikanische Sprachen',
  'Bemba': 'Afrikanische Sprachen',
  'Zarma': 'Afrikanische Sprachen',
  'Kanuri': 'Afrikanische Sprachen',
  'Tiv': 'Afrikanische Sprachen',
  'Efik': 'Afrikanische Sprachen',
  'Nupe': 'Afrikanische Sprachen',
  'Bamileke': 'Afrikanische Sprachen',
  'Duala': 'Afrikanische Sprachen',
  'Fang': 'Afrikanische Sprachen',
  'Ewondo': 'Afrikanische Sprachen',
  'Soga': 'Afrikanische Sprachen',
  'Maninka': 'Afrikanische Sprachen',
  'Soninke': 'Afrikanische Sprachen',
  'Temne': 'Afrikanische Sprachen',
  'Kpelle': 'Afrikanische Sprachen',
  'Dioula': 'Afrikanische Sprachen',
  'Senufo': 'Afrikanische Sprachen',
  'Peul': 'Afrikanische Sprachen',
  'Malinke': 'Afrikanische Sprachen',
  'Suaheli': 'Afrikanische Sprachen',
  'Kiswahili': 'Afrikanische Sprachen',
  'Setswana': 'Afrikanische Sprachen',
  'Sesotho': 'Afrikanische Sprachen',
  'Sepedi': 'Afrikanische Sprachen',
  'Siswati': 'Afrikanische Sprachen',
  'Tsonga': 'Afrikanische Sprachen',
  'Venda': 'Afrikanische Sprachen',
  'Tshiluba': 'Afrikanische Sprachen',
  'Lingála': 'Afrikanische Sprachen',
  'Kikongo': 'Afrikanische Sprachen',
  'Makonde': 'Afrikanische Sprachen',
  'Sukuma': 'Afrikanische Sprachen',

  // --- Arabisch (Dialekte) ---
  'Ägyptisch-Arabisch': 'Arabisch',
  'Ägyptisch': 'Arabisch',
  'Levantinisch': 'Arabisch',
  'Irakisch-Arabisch': 'Arabisch',
  'Irakisch': 'Arabisch',
  'Maghrebinisch': 'Arabisch',
  'Sudanesisch-Arabisch': 'Arabisch',
  'Sudanesisch': 'Arabisch',
  'Jemenitisch': 'Arabisch',
  'Libysch': 'Arabisch',
  'Syrisch-Arabisch': 'Arabisch',
  'Palästinensisch': 'Arabisch',
  'Libanesisch': 'Arabisch',
  'Hassania': 'Arabisch',

  // --- Chinesisch (Varianten) ---
  'Hakka': 'Chinesisch',
  'Min': 'Chinesisch',
  'Wu': 'Chinesisch',
  'Shanghaiisch': 'Chinesisch',
  'Hokkien': 'Chinesisch',
  'Teochew': 'Chinesisch',
  'Fuzhou': 'Chinesisch',
  'Gan': 'Chinesisch',
  'Xiang': 'Chinesisch',

  // --- Indoarische und drawidische Sprachen (erweitert) ---
  'Sindhi': 'Indoarische und drawidische Sprachen',
  'Odia': 'Indoarische und drawidische Sprachen',
  'Oriya': 'Indoarische und drawidische Sprachen',
  'Assamesisch': 'Indoarische und drawidische Sprachen',
  'Konkani': 'Indoarische und drawidische Sprachen',
  'Maithili': 'Indoarische und drawidische Sprachen',
  'Bhojpuri': 'Indoarische und drawidische Sprachen',
  'Rajasthani': 'Indoarische und drawidische Sprachen',
  'Chhattisgarhi': 'Indoarische und drawidische Sprachen',
  'Dogri': 'Indoarische und drawidische Sprachen',
  'Kashmiri': 'Indoarische und drawidische Sprachen',
  'Santali': 'Indoarische und drawidische Sprachen',
  'Tulu': 'Indoarische und drawidische Sprachen',
  'Saraiki': 'Indoarische und drawidische Sprachen',
  'Balti': 'Indoarische und drawidische Sprachen',
  'Nepali': 'Indoarische und drawidische Sprachen',
  'Sinhala': 'Übrige süd- und südostasiatische Sprachen',
  'Dhivehi': 'Indoarische und drawidische Sprachen',
  'Maldivisch': 'Indoarische und drawidische Sprachen',

  // --- Ostasiatische Sprachen (erweitert) ---
  'Hmong': 'Ostasiatische Sprachen',
  'Miao': 'Ostasiatische Sprachen',
  'Zhuang': 'Ostasiatische Sprachen',
  'Yi': 'Ostasiatische Sprachen',
  'Mien': 'Ostasiatische Sprachen',
  'Yao': 'Ostasiatische Sprachen',
  'Dong': 'Ostasiatische Sprachen',
  // 'Mongolisch' und 'Tibetisch' entfernt — sind bereits gültige BISTA-Werte

  // --- Übrige süd- und südostasiatische Sprachen (erweitert) ---
  'Javanisch': 'Übrige süd- und südostasiatische Sprachen',
  'Sundanesisch': 'Übrige süd- und südostasiatische Sprachen',
  'Cebuano': 'Übrige süd- und südostasiatische Sprachen',
  'Ilocano': 'Übrige süd- und südostasiatische Sprachen',
  'Bisaya': 'Übrige süd- und südostasiatische Sprachen',
  'Visaya': 'Übrige süd- und südostasiatische Sprachen',
  'Shan': 'Übrige süd- und südostasiatische Sprachen',
  'Karen': 'Übrige süd- und südostasiatische Sprachen',
  'Mon': 'Übrige süd- und südostasiatische Sprachen',
  'Cham': 'Übrige süd- und südostasiatische Sprachen',
  'Tetum': 'Übrige süd- und südostasiatische Sprachen',
  'Balinesisch': 'Übrige süd- und südostasiatische Sprachen',
  'Minangkabau': 'Übrige süd- und südostasiatische Sprachen',
  'Acehnese': 'Übrige süd- und südostasiatische Sprachen',
  'Waray': 'Übrige süd- und südostasiatische Sprachen',
  'Pangasinan': 'Übrige süd- und südostasiatische Sprachen',
  'Hiligaynon': 'Übrige süd- und südostasiatische Sprachen',
  'Bikol': 'Übrige süd- und südostasiatische Sprachen',
  'Malaysisch': 'Übrige süd- und südostasiatische Sprachen',
  'Dzongkha': 'Übrige süd- und südostasiatische Sprachen',
  'Bhutanisch': 'Übrige süd- und südostasiatische Sprachen',

  // --- Westasiatische Sprachen (erweitert) ---
  'Aserbaidschanisch': 'Westasiatische Sprachen',
  'Tadschikisch': 'Westasiatische Sprachen',
  'Turkmenisch': 'Westasiatische Sprachen',
  'Belutschi': 'Westasiatische Sprachen',
  'Balochi': 'Westasiatische Sprachen',
  'Hazaragi': 'Westasiatische Sprachen',
  'Paschtunisch': 'Westasiatische Sprachen',
  'Zaza': 'Westasiatische Sprachen',
  'Zazaki': 'Westasiatische Sprachen',
  'Gilaki': 'Westasiatische Sprachen',
  'Mazandarani': 'Westasiatische Sprachen',
  'Luri': 'Westasiatische Sprachen',

  // --- Übrige westasiatische Sprachen (erweitert) ---
  'Kirgisisch': 'Übrige westasiatische Sprachen',
  'Kasachisch': 'Übrige westasiatische Sprachen',
  'Tschetschenisch': 'Übrige westasiatische Sprachen',
  'Awarisch': 'Übrige westasiatische Sprachen',
  'Ossetisch': 'Übrige westasiatische Sprachen',
  'Abchasisch': 'Übrige westasiatische Sprachen',
  'Tscherkessisch': 'Übrige westasiatische Sprachen',
  'Kabardinisch': 'Übrige westasiatische Sprachen',
  'Inguschisch': 'Übrige westasiatische Sprachen',
  'Dagestanisch': 'Übrige westasiatische Sprachen',
  'Tatarisch': 'Übrige westasiatische Sprachen',
  'Baschkirisch': 'Übrige westasiatische Sprachen',
  'Tschuwaschisch': 'Übrige westasiatische Sprachen',
  'Jakutisch': 'Übrige westasiatische Sprachen',

  // --- Andere westeuropäische Sprachen (erweitert) ---
  'Walisisch': 'Andere westeuropäische Sprachen',
  'Bretonisch': 'Andere westeuropäische Sprachen',
  'Okzitanisch': 'Andere westeuropäische Sprachen',
  'Galicisch': 'Andere westeuropäische Sprachen',
  'Korsisch': 'Andere westeuropäische Sprachen',
  'Sardisch': 'Andere westeuropäische Sprachen',
  'Maltesisch': 'Andere westeuropäische Sprachen',
  'Luxemburgisch': 'Andere westeuropäische Sprachen',
  'Friesisch': 'Andere westeuropäische Sprachen',
  'Asturisch': 'Andere westeuropäische Sprachen',
  'Aragonesisch': 'Andere westeuropäische Sprachen',
  'Ladinisch': 'Andere westeuropäische Sprachen',
  'Furlanisch': 'Andere westeuropäische Sprachen',

  // --- Andere nordeuropäische Sprachen (erweitert) ---
  'Samisch': 'Andere nordeuropäische Sprachen',
  'Sami': 'Andere nordeuropäische Sprachen',
  'Färöisch': 'Andere nordeuropäische Sprachen',
  'Faröisch': 'Andere nordeuropäische Sprachen',
  'Grönländisch': 'Andere nordeuropäische Sprachen',

  // --- Übrige osteuropäische Sprachen (erweitert) ---
  'Weissrussisch': 'Übrige osteuropäische Sprachen',
  'Belarussisch': 'Übrige osteuropäische Sprachen',
  'Moldawisch': 'Rumänisch', // Moldawisch ist linguistisch identisch mit Rumänisch

  // --- Übrige slawische Sprachen ---
  'Sorbisch': 'Übrige slawische Sprachen',
  'Ruthenisch': 'Übrige slawische Sprachen',
  'Kaschubisch': 'Übrige slawische Sprachen',
  'Russinisch': 'Übrige slawische Sprachen',

  // --- Portugiesisch (Varianten) ---
  'Kapverdisch': 'Portugiesisch',
  'Brasilianisches Portugiesisch': 'Portugiesisch',

  // --- Amerikanische indigene Sprachen / Sonstige ---
  'Quechua': 'nicht definiert',
  'Aymara': 'nicht definiert',
  'Guaraní': 'nicht definiert',
  'Guarani': 'nicht definiert',
  'Nahuatl': 'nicht definiert',
  'Maya': 'nicht definiert',
  'Kreolisch': 'nicht definiert',
  'Pidgin': 'nicht definiert',
  'Gebärdensprache': 'nicht definiert',
  'Zeichensprache': 'nicht definiert',

  // --- Zusätzliche Tippfehler-Varianten ---
  'Turkisch': 'Türkisch',
  'Englsh': 'Englisch',
  'Franzoesisch': 'Französisch',
  'Italianisch': 'Italienisch',
  'Spannisch': 'Spanisch',
  'Griechish': 'Griechisch',
  'Rusisch': 'Russisch',
  'Polnish': 'Polnisch',
  'Tschetschenish': 'Übrige westasiatische Sprachen',
  'Rumänish': 'Rumänisch',
  'Bulgarish': 'Bulgarisch',
  'Ungarish': 'Ungarisch',
  'Finnsh': 'Finnisch',
  'Schwedish': 'Schwedisch',
  'Norwegish': 'Norwegisch',
  'Dänish': 'Dänisch',
};

// Case-insensitive lookup for language auto-corrections
const LANGUAGE_CORRECTIONS_NORMALIZED = new Map<string, string>(
  Object.entries(LANGUAGE_AUTO_CORRECTIONS).map(([k, v]) => [k.toLowerCase().trim(), v])
);

function isValidLanguage(value: string): boolean {
  return VALID_BISTA_LANGUAGES.has(value.trim());
}

// Levenshtein distance for fuzzy matching
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const curr = Math.min(dp[j] + 1, prev + 1, dp[j - 1] + cost);
      dp[j - 1] = prev;
      prev = curr;
    }
    dp[n] = prev;
  }
  return dp[n];
}

// Max allowed Levenshtein distance based on string length
function maxDistance(len: number): number {
  if (len <= 4) return 1;
  if (len <= 8) return 2;
  return 3;
}

function findSimilarLanguage(value: string): string | null {
  const normalized = value.toLowerCase().trim();
  // 1. Check explicit auto-corrections first (highest priority)
  if (LANGUAGE_CORRECTIONS_NORMALIZED.has(normalized)) {
    return LANGUAGE_CORRECTIONS_NORMALIZED.get(normalized)!;
  }
  // 2. Exact match via normalized (case-insensitive)
  if (BISTA_NORMALIZED.has(normalized)) return BISTA_NORMALIZED.get(normalized)!;
  // 3. Prefix match (first 5 chars)
  if (normalized.length >= 5) {
    for (const [key, lang] of BISTA_NORMALIZED) {
      if (key.startsWith(normalized.slice(0, 5)) || normalized.startsWith(key.slice(0, 5))) {
        return lang;
      }
    }
  }
  // 4. Levenshtein fuzzy match against valid BISTA languages
  let bestMatch: string | null = null;
  let bestDist = Infinity;
  const maxDist = maxDistance(normalized.length);
  for (const [key, lang] of BISTA_NORMALIZED) {
    if (Math.abs(key.length - normalized.length) > maxDist) continue;
    const dist = levenshtein(normalized, key);
    if (dist < bestDist && dist <= maxDist) {
      bestDist = dist;
      bestMatch = lang;
    }
  }
  if (bestMatch) return bestMatch;
  // 5. Levenshtein fuzzy match against auto-correction keys
  for (const [key, target] of LANGUAGE_CORRECTIONS_NORMALIZED) {
    if (Math.abs(key.length - normalized.length) > maxDist) continue;
    const dist = levenshtein(normalized, key);
    if (dist < bestDist && dist <= maxDist) {
      bestDist = dist;
      bestMatch = target;
    }
  }
  return bestMatch;
}

// ==============================
// Nationalitäten-Validierung
// ==============================

// Offizielle Länderliste
export const VALID_NATIONALITIES = new Set([
  'Schweiz','Albanien','Andorra','Belgien','Bulgarien','Dänemark','Deutschland','Finnland',
  'Frankreich','Griechenland','Vereinigtes Königreich','Irland','Island','Italien','Liechtenstein',
  'Luxemburg','Malta','Monaco','Niederlande','Norwegen','Österreich','Polen','Portugal','Rumänien',
  'San Marino','Schweden','Spanien','Türkiye','Ungarn','Zypern','Slowakei','Tschechien','Kroatien',
  'Slowenien','Bosnien und Herzegowina','Nordmazedonien','Estland','Lettland','Litauen','Moldau',
  'Russland','Ukraine','Belarus (Weissrussland)',
  'Äquatorial-Guinea','Äthiopien','Dschibuti','Algerien','Angola','Botswana','Burundi','Benin',
  "Côte d'Ivoire",'Gabun','Gambia','Ghana','Guinea-Bissau','Guinea','Kamerun','Kap Verden','Kenia',
  'Komoren','Kongo (Republik)','Demokratische Republik Kongo','Lesotho','Liberia','Libyen',
  'Madagaskar','Malawi','Mali','Marokko','Mauretanien','Mauritius','Mosambik','Niger','Nigeria',
  'Burkina Faso','Zimbabwe','Rwanda','Sambia','Senegal','Seyschellen','Sierra Leone','Somalia',
  'Südafrika','Sudan','Namibia','Swasiland','Tansania','Togo','Tschad','Tunesien','Uganda','Ägypten',
  'Zentralafrikanische Republik','Eritrea',
  'Argentinien','Bahamas','Barbados','Bolivien','Brasilien','Chile','Costa Rica',
  'Dominikanische Republik','Ecuador','El Salvador','Guatemala','Guyana','Haiti','Belize','Honduras',
  'Jamaika','Kanada','Kolumbien','Kuba','Mexiko','Nicaragua','Panama','Paraguay','Peru','Suriname',
  'Trinidad und Tobago','Uruguay','Venezuela','Vereinigte Staaten von Amerika','Dominica','Grenada',
  'Antigua und Barbuda','St. Lucia','St. Vincent und Grenadines','St. Kitts und Nevis',
  'Afghanistan','Bahrain','Bhutan','Brunei','Myanmar','Sri Lanka','Taiwan (Chinesisches Taipei)',
  'China','Indien','Indonesien','Irak','Iran','Israel','Japan','Jemen','Jordanien','Kambodscha',
  'Katar','Kuwait','Laos','Libanon','Malaysia','Malediven','Oman','Mongolei','Nepal',
  'Korea (Dem. Volksrep.)','Vereinigte Arabische Emirate','Pakistan','Philippinen','Saudi-Arabien',
  'Singapur','Korea (Republik Korea)','Syrien','Thailand','Vietnam','Bangladesh','Armenien',
  'Aserbaidschan','Georgien','Kasachstan','Kirgisistan','Tadschikistan','Turkmenistan','Usbekistan',
  'Australien','Fidschi','Nauru','Vanuatu','Neuseeland','Papua-Neuguinea','Tonga','Samoa',
  'Salomon-Inseln','Tuvalu','Kiribati','Marshall-Inseln','Mikronesien',
  'Serbien','Kosovo','Montenegro','Palau','Timor-Leste','Südsudan','Cookinseln','Niue',
  'Vatikanstadt','Palästina',
]);

// Auto-Korrekturen für bekannte veraltete/falsche Bezeichnungen
export const NATIONALITY_AUTO_CORRECTIONS: Record<string, string> = {
  'Tibet': 'China',
  'Mazedonien': 'Nordmazedonien',
  'Türkei': 'Türkiye',
  'Slowakische Republik': 'Slowakei',
  'Tschechische Republik': 'Tschechien',
  'Bosnien-Herzegowina': 'Bosnien und Herzegowina',
  'Vereinigte Staaten': 'Vereinigte Staaten von Amerika',
  'Fidschi-Inseln': 'Fidschi',
  // Phase 2 additions
  'USA': 'Vereinigte Staaten von Amerika',
  'England': 'Vereinigtes Königreich',
  'Grossbritannien': 'Vereinigtes Königreich',
  'Großbritannien': 'Vereinigtes Königreich',
  'Holland': 'Niederlande',
  'Weissrussland': 'Belarus (Weissrussland)',
  'Weißrussland': 'Belarus (Weissrussland)',
  'Kongo': 'Kongo (Republik)',
  'Elfenbeinküste': "Côte d'Ivoire",
  'Burma': 'Myanmar',
  'Birma': 'Myanmar',
  'Persien': 'Iran',
  'Ceylon': 'Sri Lanka',
  'Siam': 'Thailand',
  'Bombay': 'Indien',
  'Czechoslovakia': 'Tschechien',
  'Yugoslavia': 'Serbien',
  'Jugoslavien': 'Serbien',
  'Jugoslawien': 'Serbien',
  'Sowjetunion': 'Russland',
  'UdSSR': 'Russland',
  'Swaziland': 'Swasiland',
  'Rhodesien': 'Zimbabwe',
  'Zaire': 'Demokratische Republik Kongo',
  'Ostindien': 'Indien',
  'Formosa': 'Taiwan (Chinesisches Taipei)',
  'Nordkorea': 'Korea (Dem. Volksrep.)',
  'Südkorea': 'Korea (Republik Korea)',
  'Kapverde': 'Kap Verden',
  'Kapverden': 'Kap Verden',
  // Phase 3: Erweiterte Korrekturen
  // Kurzformen & ISO-Codes
  'CH': 'Schweiz',
  'DE': 'Deutschland',
  'AT': 'Österreich',
  'IT': 'Italien',
  'FR': 'Frankreich',
  'ES': 'Spanien',
  'PT': 'Portugal',
  'UK': 'Vereinigtes Königreich',
  'GB': 'Vereinigtes Königreich',
  'US': 'Vereinigte Staaten von Amerika',
  'NL': 'Niederlande',
  'BE': 'Belgien',
  'TR': 'Türkiye',
  'XK': 'Kosovo',
  // Häufige Varianten in CH-Schulen
  'Schottland': 'Vereinigtes Königreich',
  'Wales': 'Vereinigtes Königreich',
  'Nordirland': 'Vereinigtes Königreich',
  'Vatikan': 'Vatikanstadt',
  'DR Kongo': 'Demokratische Republik Kongo',
  'Dem. Rep. Kongo': 'Demokratische Republik Kongo',
  'Rep. Kongo': 'Kongo (Republik)',
  'Kongo-Brazzaville': 'Kongo (Republik)',
  'Kongo-Kinshasa': 'Demokratische Republik Kongo',
  'UAE': 'Vereinigte Arabische Emirate',
  'VAE': 'Vereinigte Arabische Emirate',
  'Emirate': 'Vereinigte Arabische Emirate',
  'Amerika': 'Vereinigte Staaten von Amerika',
  'Palästinensische Gebiete': 'Palästina',
  'Eswatini': 'Swasiland',
  'Cabo Verde': 'Kap Verden',
  'Osttimor': 'Timor-Leste',
  'Ost-Timor': 'Timor-Leste',
  'Taiwan': 'Taiwan (Chinesisches Taipei)',
  'Republik China': 'Taiwan (Chinesisches Taipei)',
  'Moldawien': 'Moldau',
  'Moldavien': 'Moldau',
  'Republik Moldau': 'Moldau',
  'Weissrussisch': 'Belarus (Weissrussland)',
  'Belarus': 'Belarus (Weissrussland)',
  'Ivory Coast': "Côte d'Ivoire",
  'Côte dIvoire': "Côte d'Ivoire",
  // Veraltete historische Namen
  'Abessinien': 'Äthiopien',
  'Dahomey': 'Benin',
  'Obervolta': 'Burkina Faso',
  'Bechuanaland': 'Botswana',
  'Basutoland': 'Lesotho',
  'Nyassaland': 'Malawi',
  'Deutsch-Ostafrika': 'Tansania',
  'Tanganjika': 'Tansania',
  'Sansibar': 'Tansania',
  'Südrhodesien': 'Zimbabwe',
  'Nordrhodesien': 'Sambia',
  'Goldküste': 'Ghana',
  // Deutsche Tippfehler
  'Algerian': 'Algerien',
  'Portugall': 'Portugal',
  'Östereich': 'Österreich',
  'Oesterreich': 'Österreich',
  'Deuschland': 'Deutschland',
  'Deutschalnd': 'Deutschland',
  'Itallien': 'Italien',
  'Rumänian': 'Rumänien',
  'Kolumbian': 'Kolumbien',
  'Brazilien': 'Brasilien',
  'Phillippinen': 'Philippinen',
  'Phillipinen': 'Philippinen',
  'Afganistan': 'Afghanistan',
  'Afghanisan': 'Afghanistan',
  'Eriträa': 'Eritrea',
  'Äthopien': 'Äthiopien',
  'Ethopien': 'Äthiopien',
  'Ethiopien': 'Äthiopien',
  'Somala': 'Somalia',
  'Nigerien': 'Nigeria',
  'Kosova': 'Kosovo',
  'Kosowo': 'Kosovo',
  'Massedonia': 'Nordmazedonien',
  'Mazedonia': 'Nordmazedonien',
  'Makedonia': 'Nordmazedonien',
  'Makedonien': 'Nordmazedonien',
  'Bosnien': 'Bosnien und Herzegowina',
  'Herzegowina': 'Bosnien und Herzegowina',
  'BiH': 'Bosnien und Herzegowina',
  'Kroazien': 'Kroatien',
  'Serbien und Montenegro': 'Serbien',
  'Lithauen': 'Litauen',
  'Slovakei': 'Slowakei',
  'Slovenien': 'Slowenien',
  'Bangla Desh': 'Bangladesh',
  'Bangladesch': 'Bangladesh',

  // ============================================
  // Phase 4: Fehlende ISO-2-Codes (~40 neue)
  // ============================================
  'AL': 'Albanien',
  'BA': 'Bosnien und Herzegowina',
  'BG': 'Bulgarien',
  'BR': 'Brasilien',
  'CL': 'Chile',
  'CN': 'China',
  'CO': 'Kolumbien',
  'CZ': 'Tschechien',
  'DK': 'Dänemark',
  'DZ': 'Algerien',
  'EC': 'Ecuador',
  'EG': 'Ägypten',
  'ER': 'Eritrea',
  'ET': 'Äthiopien',
  'FI': 'Finnland',
  'GE': 'Georgien',
  'GR': 'Griechenland',
  'HR': 'Kroatien',
  'HU': 'Ungarn',
  'ID': 'Indonesien',
  'IE': 'Irland',
  'IL': 'Israel',
  'IN': 'Indien',
  'IQ': 'Irak',
  'IR': 'Iran',
  'JP': 'Japan',
  'KE': 'Kenia',
  'KR': 'Korea (Republik Korea)',
  'KW': 'Kuwait',
  'LB': 'Libanon',
  'LI': 'Liechtenstein',
  'LK': 'Sri Lanka',
  'MA': 'Marokko',
  'MX': 'Mexiko',
  'NG': 'Nigeria',
  'NO': 'Norwegen',
  'PE': 'Peru',
  'PH': 'Philippinen',
  'PK': 'Pakistan',
  'PL': 'Polen',
  'RO': 'Rumänien',
  'RS': 'Serbien',
  'RU': 'Russland',
  'SA': 'Saudi-Arabien',
  'SE': 'Schweden',
  'SK': 'Slowakei',
  'SI': 'Slowenien',
  'SY': 'Syrien',
  'TH': 'Thailand',
  'TN': 'Tunesien',
  'UA': 'Ukraine',
  'UZ': 'Usbekistan',
  'VN': 'Vietnam',
  'AF': 'Afghanistan',
  'AO': 'Angola',
  'AR': 'Argentinien',
  'AZ': 'Aserbaidschan',
  'BD': 'Bangladesh',
  'BY': 'Belarus (Weissrussland)',
  'CD': 'Demokratische Republik Kongo',
  'CG': 'Kongo (Republik)',
  'CI': "Côte d'Ivoire",
  'CM': 'Kamerun',
  'CU': 'Kuba',
  'DO': 'Dominikanische Republik',
  'GH': 'Ghana',
  'GT': 'Guatemala',
  'HN': 'Honduras',
  'KG': 'Kirgisistan',
  'KH': 'Kambodscha',
  'KP': 'Korea (Dem. Volksrep.)',
  'KZ': 'Kasachstan',
  'LA': 'Laos',
  'LR': 'Liberia',
  'LY': 'Libyen',
  'MD': 'Moldau',
  'MK': 'Nordmazedonien',
  'MM': 'Myanmar',
  'MN': 'Mongolei',
  'MZ': 'Mosambik',
  'MY': 'Malaysia',
  'NA': 'Namibia',
  'NE': 'Niger',
  'NI': 'Nicaragua',
  'NP': 'Nepal',
  'PA': 'Panama',
  'PY': 'Paraguay',
  'QA': 'Katar',
  'RW': 'Rwanda',
  'SD': 'Sudan',
  'SL': 'Sierra Leone',
  'SN': 'Senegal',
  'SO': 'Somalia',
  'SV': 'El Salvador',
  'TD': 'Tschad',
  'TJ': 'Tadschikistan',
  'TL': 'Timor-Leste',
  'TM': 'Turkmenistan',
  'TZ': 'Tansania',
  'UG': 'Uganda',
  'UY': 'Uruguay',
  'VE': 'Venezuela',
  'YE': 'Jemen',
  'ZA': 'Südafrika',
  'ZM': 'Sambia',
  'ZW': 'Zimbabwe',

  // ============================================
  // Phase 4: Historische/veraltete Namen (~20 neue)
  // ============================================
  'Niederländisch-Ostindien': 'Indonesien',
  'Niederländisch-Indien': 'Indonesien',
  'Französisch-Indochina': 'Vietnam', // Umfasste auch Laos und Kambodscha
  'Indochina': 'Vietnam',             // Umfasste Vietnam, Laos, Kambodscha
  'Belgisch-Kongo': 'Demokratische Republik Kongo',
  'Deutsch-Südwestafrika': 'Namibia',
  'Portugiesisch-Ostafrika': 'Mosambik',
  'Portugiesisch-Westafrika': 'Angola',
  'Britisch-Indien': 'Indien',
  'Mesopotamien': 'Irak',
  'Tschechoslowakei': 'Tschechien',
  'Nordjemen': 'Jemen',
  'Südjemen': 'Jemen',
  'Katalonien': 'Spanien',
  'Kurdistan': 'Irak',                        // Umfasst Teile von Irak, Türkei, Syrien, Iran
  'Ostpakistan': 'Bangladesh',
  'Südwestafrika': 'Namibia',
  'Französisch-Westafrika': 'Senegal',              // Umfasste 8 Länder, Senegal war Verwaltungssitz
  'Französisch-Äquatorialafrika': 'Kongo (Republik)', // Umfasste 4 Länder
  'Italienisch-Somaliland': 'Somalia',
  'Britisch-Somaliland': 'Somalia',
  'Französisch-Somaliland': 'Dschibuti',
  'Ruanda-Urundi': 'Rwanda',
  'Transkei': 'Südafrika',
  'Bophuthatswana': 'Südafrika',
  'Ciskei': 'Südafrika',
  'Venda': 'Südafrika',

  // ============================================
  // Phase 4: Alternative Bezeichnungen (~30 neue)
  // ============================================
  'Bosnien-Herzegovina': 'Bosnien und Herzegowina',
  'Bosnia': 'Bosnien und Herzegowina',
  'Nordmazedonia': 'Nordmazedonien',
  'Nord-Mazedonien': 'Nordmazedonien',
  'North Macedonia': 'Nordmazedonien',
  'Syria': 'Syrien',
  'Turkey': 'Türkiye',
  'Greece': 'Griechenland',
  'Serbia': 'Serbien',
  'Croatia': 'Kroatien',
  'Hungary': 'Ungarn',
  'Albania': 'Albanien',
  'Morocco': 'Marokko',
  'Tunisia': 'Tunesien',
  'Egypt': 'Ägypten',
  'Iraq': 'Irak',
  'Iran': 'Iran',
  'Lebanon': 'Libanon',
  'Libya': 'Libyen',
  'Algeria': 'Algerien',
  'Ethiopia': 'Äthiopien',
  'Sudan': 'Sudan',
  'Kenya': 'Kenia',
  'Ghana': 'Ghana',
  'Nigeria': 'Nigeria',
  'Cameroon': 'Kamerun',
  'Senegal': 'Senegal',
  'Congo': 'Kongo (Republik)',
  'South Africa': 'Südafrika',
  'Saudi Arabia': 'Saudi-Arabien',
  'Saudiarabien': 'Saudi-Arabien',
  'Saudis': 'Saudi-Arabien',
  'Palästinenser': 'Palästina',
  'Dominik. Rep.': 'Dominikanische Republik',
  'Dom. Rep.': 'Dominikanische Republik',
  'Dom Rep': 'Dominikanische Republik',
  'Tschechei': 'Tschechien',
  'Czech Republic': 'Tschechien',
  'Czechia': 'Tschechien',
  'Slovakia': 'Slowakei',
  'Slovenia': 'Slowenien',
  'Romania': 'Rumänien',
  'Bulgaria': 'Bulgarien',
  'Poland': 'Polen',
  'Ukraine': 'Ukraine',
  'Russia': 'Russland',
  'Georgia': 'Georgien',
  'Armenia': 'Armenien',
  'Azerbaijan': 'Aserbaidschan',
  'India': 'Indien',
  'China': 'China',
  'Japan': 'Japan',
  'Philippines': 'Philippinen',
  'Thailand': 'Thailand',
  'Indonesia': 'Indonesien',
  'Malaysia': 'Malaysia',
  'Singapore': 'Singapur',
  'Vietnam': 'Vietnam',
  'Cambodia': 'Kambodscha',
  'Myanmar': 'Myanmar',
  'Nepal': 'Nepal',
  'Sri Lanka': 'Sri Lanka',
  'Bangladesh': 'Bangladesh',
  'Pakistan': 'Pakistan',
  'Afghanistan': 'Afghanistan',
  'Mongolia': 'Mongolei',
  'North Korea': 'Korea (Dem. Volksrep.)',
  'South Korea': 'Korea (Republik Korea)',
  'Mexico': 'Mexiko',
  'Brazil': 'Brasilien',
  'Argentina': 'Argentinien',
  'Colombia': 'Kolumbien',
  'Chile': 'Chile',
  'Peru': 'Peru',
  'Cuba': 'Kuba',
  'Venezuela': 'Venezuela',
  'Ecuador': 'Ecuador',
  'Bolivia': 'Bolivien',
  'Paraguay': 'Paraguay',
  'Uruguay': 'Uruguay',
  'Honduras': 'Honduras',
  'Guatemala': 'Guatemala',
  'El Salvador': 'El Salvador',
  'Nicaragua': 'Nicaragua',
  'Panama': 'Panama',
  'Costa Rica': 'Costa Rica',
  'Dominican Republic': 'Dominikanische Republik',
  'Haiti': 'Haiti',
  'Jamaica': 'Jamaika',
  'Trinidad and Tobago': 'Trinidad und Tobago',
  'New Zealand': 'Neuseeland',
  'Australia': 'Australien',
  'United States': 'Vereinigte Staaten von Amerika',
  'United Kingdom': 'Vereinigtes Königreich',
  'Switzerland': 'Schweiz',
  'Germany': 'Deutschland',
  'Austria': 'Österreich',
  'France': 'Frankreich',
  'Italy': 'Italien',
  'Spain': 'Spanien',
  'Portugal': 'Portugal',
  'Netherlands': 'Niederlande',
  'Belgium': 'Belgien',
  'Denmark': 'Dänemark',
  'Sweden': 'Schweden',
  'Norway': 'Norwegen',
  'Finland': 'Finnland',
  'Ireland': 'Irland',
  'Scotland': 'Vereinigtes Königreich',
  'Luxembourg': 'Luxemburg',
  'Liechtenstein': 'Liechtenstein',

  // ============================================
  // Phase 4: Tippfehler-Varianten (~30 neue)
  // ============================================
  'Schweitz': 'Schweiz',
  'Schwiez': 'Schweiz',
  'Schwaiz': 'Schweiz',
  'Albanin': 'Albanien',
  'Albanein': 'Albanien',
  'Boglaren': 'Bulgarien',
  'Bulgarein': 'Bulgarien',
  'Kroatein': 'Kroatien',
  'Kroazein': 'Kroatien',
  'Serbin': 'Serbien',
  'Serbein': 'Serbien',
  'Makzedonien': 'Nordmazedonien',
  'Mazzedonien': 'Nordmazedonien',
  'Montenegero': 'Montenegro',
  'Montengro': 'Montenegro',
  'Frankrreich': 'Frankreich',
  'Frankeich': 'Frankreich',
  'Griechenand': 'Griechenland',
  'Griecheland': 'Griechenland',
  'Spanein': 'Spanien',
  'Spannien': 'Spanien',
  'Kolombien': 'Kolumbien',
  'Ekuador': 'Ecuador',
  'Equador': 'Ecuador',
  'Tansanien': 'Tansania',
  'Kammerun': 'Kamerun',
  'Kameruhn': 'Kamerun',
  'Simbabwe': 'Zimbabwe',
  'Simbabve': 'Zimbabwe',
  'Marroko': 'Marokko',
  'Marocko': 'Marokko',
  'Moroko': 'Marokko',
  'Tuniesien': 'Tunesien',
  'Tunesein': 'Tunesien',
  'Algierien': 'Algerien',
  'Algeiren': 'Algerien',
  'Liberein': 'Liberia',
  'Libyien': 'Libyen',
  'Ägipten': 'Ägypten',
  'Egypten': 'Ägypten',
  'Agypten': 'Ägypten',
  'Libanohn': 'Libanon',
  'Irack': 'Irak',
  'Irahn': 'Iran',
  'Sirien': 'Syrien',
  'Syrien ': 'Syrien',
  'Türkei ': 'Türkiye',
  'Türkay': 'Türkiye',
  'Tuerkei': 'Türkiye',
  'Thailland': 'Thailand',
  'Filipinen': 'Philippinen',
  'Filppinen': 'Philippinen',
  'Mexiko ': 'Mexiko',
  'Brasillien': 'Brasilien',
  'Argentienien': 'Argentinien',
  'Venazuela': 'Venezuela',
  'Venezüela': 'Venezuela',
  'Ukranie': 'Ukraine',
  'Ukranine': 'Ukraine',
  'Russlan': 'Russland',
  'Rusland': 'Russland',
  'Georgein': 'Georgien',
  'Armenein': 'Armenien',
  'Indein': 'Indien',
  'Pakistahn': 'Pakistan',
  'Afgahnistan': 'Afghanistan',
  'Afganistahn': 'Afghanistan',
};

// Case-insensitive lookup
const NATIONALITY_NORMALIZED = new Map<string, string>(
  [...VALID_NATIONALITIES].map(n => [n.toLowerCase().trim(), n])
);

const NATIONALITY_CORRECTIONS_NORMALIZED = new Map<string, string>(
  Object.entries(NATIONALITY_AUTO_CORRECTIONS).map(([k, v]) => [k.toLowerCase().trim(), v])
);

function isValidNationality(value: string): boolean {
  return NATIONALITY_NORMALIZED.has(value.trim().toLowerCase());
}

function findNationalityCorrection(value: string): string | null {
  const normalized = value.trim().toLowerCase();
  // 1. Check auto-corrections first
  if (NATIONALITY_CORRECTIONS_NORMALIZED.has(normalized)) {
    return NATIONALITY_CORRECTIONS_NORMALIZED.get(normalized)!;
  }
  // 2. Case-insensitive match against valid list
  if (NATIONALITY_NORMALIZED.has(normalized)) {
    return NATIONALITY_NORMALIZED.get(normalized)!;
  }
  // 3. Levenshtein fuzzy match against valid nationalities
  let bestMatch: string | null = null;
  let bestDist = Infinity;
  const maxDist = maxDistance(normalized.length);
  for (const [key, nat] of NATIONALITY_NORMALIZED) {
    if (Math.abs(key.length - normalized.length) > maxDist) continue;
    const dist = levenshtein(normalized, key);
    if (dist < bestDist && dist <= maxDist) {
      bestDist = dist;
      bestMatch = nat;
    }
  }
  if (bestMatch) return bestMatch;
  // 4. Levenshtein fuzzy match against auto-correction keys
  for (const [key, target] of NATIONALITY_CORRECTIONS_NORMALIZED) {
    if (Math.abs(key.length - normalized.length) > maxDist) continue;
    const dist = levenshtein(normalized, key);
    if (dist < bestDist && dist <= maxDist) {
      bestDist = dist;
      bestMatch = target;
    }
  }
  return bestMatch;
}

// Fields that should be checked for duplicates
const DUPLICATE_CHECK_FIELDS = ['S_AHV', 'S_ID', 'P_ERZ1_ID', 'P_ERZ2_ID', 'P_ERZ1_AHV', 'P_ERZ2_AHV'];

// Configuration for parent ID consistency checks (Eltern-ID Konsistenzprüfung)
const PARENT_CONSISTENCY_CHECKS = [
  {
    idField: 'P_ERZ1_ID',
    ahvField: 'P_ERZ1_AHV',
    nameField: 'P_ERZ1_Name',
    vornameField: 'P_ERZ1_Vorname',
    strasseField: 'P_ERZ1_Strasse',
    telefonPrivatField: 'P_ERZ1_TelefonPrivat',
    telefonGeschaeftField: 'P_ERZ1_TelefonGeschaeft',
    mobilField: 'P_ERZ1_Mobil',
    label: 'Erziehungsberechtigte/r 1'
  },
  {
    idField: 'P_ERZ2_ID',
    ahvField: 'P_ERZ2_AHV',
    nameField: 'P_ERZ2_Name',
    vornameField: 'P_ERZ2_Vorname',
    strasseField: 'P_ERZ2_Strasse',
    telefonPrivatField: 'P_ERZ2_TelefonPrivat',
    telefonGeschaeftField: 'P_ERZ2_TelefonGeschaeft',
    mobilField: 'P_ERZ2_Mobil',
    label: 'Erziehungsberechtigte/r 2'
  }
];

// Normalize string by removing diacritical marks for comparison
function normalizeForComparison(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

// Normalize phone number by removing all non-digit characters
function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

// Count diacritical marks in a string (more = "richer")
function countDiacritics(value: string): number {
  const nfd = value.normalize('NFD');
  const stripped = nfd.replace(/[\u0300-\u036f]/g, '');
  return nfd.length - stripped.length;
}

// Name fields to check for diacritic inconsistencies
const DIACRITIC_NAME_FIELDS = [
  'S_Name', 'S_Vorname',
  'P_ERZ1_Name', 'P_ERZ1_Vorname',
  'P_ERZ2_Name', 'P_ERZ2_Vorname',
  'L_KL1_Name', 'L_KL1_Vorname',
];

// Check for names that match when normalized but differ by diacritics,
// and auto-correct to the version with more diacritical marks
function checkDiacriticNameInconsistencies(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const field of DIACRITIC_NAME_FIELDS) {
    // Group values by their normalized form
    const normalizedGroups = new Map<string, { original: string; rows: number[] }[]>();

    for (let i = 0; i < rows.length; i++) {
      const raw = String(rows[i][field] ?? '').trim();
      if (!raw) continue;
      const normalized = normalizeForComparison(raw);
      
      const group = normalizedGroups.get(normalized);
      if (group) {
        // Check if this exact original form already exists
        const existing = group.find(g => g.original === raw);
        if (existing) {
          existing.rows.push(i);
        } else {
          group.push({ original: raw, rows: [i] });
        }
      } else {
        normalizedGroups.set(normalized, [{ original: raw, rows: [i] }]);
      }
    }

    // For groups with multiple different original forms, pick the richest
    normalizedGroups.forEach(variants => {
      if (variants.length <= 1) return; // All identical

      // Find the variant with the most diacritics
      let best = variants[0];
      for (const v of variants) {
        if (countDiacritics(v.original) > countDiacritics(best.original)) {
          best = v;
        }
      }

      // Create corrections for all rows that don't have the best version
      for (const variant of variants) {
        if (variant.original === best.original) continue;
        for (const rowIndex of variant.rows) {
          errors.push({
            row: rowIndex + 1,
            column: field,
            value: variant.original,
            message: `Diakritische Korrektur: "${variant.original}" → "${best.original}"`,
            correctedValue: best.original,
            severity: 'warning',
          });
        }
      }
    });
  }

  return errors;
}

// Optimized: Check parent ID consistency - same parent should have same ID across all rows
// Uses a UNIFIED pool across ERZ1 and ERZ2 so cross-slot inconsistencies are detected
type MatchStrategy = 'ahv' | 'name_strasse' | 'name_only';

const STRATEGY_LABELS: Record<MatchStrategy, { label: string; reliability: string; warning?: string }> = {
  ahv: {
    label: 'AHV-Nummer',
    reliability: 'Hohe Zuverlässigkeit',
  },
  name_strasse: {
    label: 'Name + Vorname + Strasse',
    reliability: 'Mittlere Zuverlässigkeit',
    warning: '⚠ Namensgleichheit an derselben Adresse kann auf verschiedene Personen zutreffen (z.B. Vater und Sohn).',
  },
  name_only: {
    label: 'Name + Vorname',
    reliability: 'Tiefe Zuverlässigkeit',
    warning: '⚠ Nur Name und Vorname stimmen überein – gleichnamige, aber verschiedene Personen sind möglich. Bitte manuell prüfen!',
  },
};

function checkParentIdConsistency(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const errorSet = new Set<string>(); // Avoid duplicate error messages
  // Track which row+field combos were already matched by a higher-reliability strategy
  const resolvedByHigherStrategy = new Set<string>();

  // Single unified pool across all ERZ slots
  type ParentEntry = { id: string; firstRow: number; identifier: string; slotLabel: string; vorname: string; name: string };
  const parentMapByAhv = new Map<string, ParentEntry>();
  const parentMapByNameStrasse = new Map<string, ParentEntry>();

  const addError = (
    map: Map<string, ParentEntry>,
    key: string,
    displayIdentifier: string,
    strategy: MatchStrategy,
    id: string,
    rowIndex: number,
    idField: string,
    label: string,
    parentVorname: string,
    parentName: string
  ) => {
    const existing = map.get(key);
    
    if (existing) {
      if (existing.id !== id) {
        const errorKey = `${rowIndex + 1}:${idField}:${displayIdentifier}`;
        const rowFieldKey = `${rowIndex + 1}:${idField}`;
        
        // Skip if already reported by a more reliable strategy
        if (resolvedByHigherStrategy.has(rowFieldKey)) return;
        
        if (!errorSet.has(errorKey)) {
          errorSet.add(errorKey);
          
          // AHV and Name+Strasse both block lower-priority strategies (name-only)
          if (strategy === 'ahv' || strategy === 'name_strasse') {
            resolvedByHigherStrategy.add(rowFieldKey);
          }
          
          const strategyInfo = STRATEGY_LABELS[strategy];
          const warningPart = strategyInfo.warning ? `\n${strategyInfo.warning}` : '';
          
          errors.push({
            row: rowIndex + 1,
            column: idField,
            value: id,
            message: `Inkonsistente ID: Elternteil (${displayIdentifier}) hat in Zeile ${existing.firstRow} (${existing.slotLabel}) die ID '${existing.id}', aber hier (${label}) die ID '${id}' [Erkannt via: ${strategyInfo.label} – ${strategyInfo.reliability}]${warningPart}`,
            severity: strategy === 'name_only' ? 'warning' : undefined,
          });
        }
      }
    } else {
      map.set(key, { id, firstRow: rowIndex + 1, identifier: displayIdentifier, slotLabel: label, vorname: parentVorname, name: parentName });
    }
  };

  // Pass 1: AHV and Name+Strasse strategies (per ERZ slot)
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    for (const check of PARENT_CONSISTENCY_CHECKS) {
      const id = String(row[check.idField] ?? '').trim();
      const ahv = String(row[check.ahvField] ?? '').trim();
      const name = String(row[check.nameField] ?? '').trim();
      const vorname = String(row[check.vornameField] ?? '').trim();
      const strasse = String(row[check.strasseField] ?? '').trim();

      if (!id) continue;
      if (!ahv && (!name || !vorname)) continue;

      // Strategy 1: AHV (most reliable)
      if (ahv) {
        addError(parentMapByAhv, `AHV:${ahv}`, `AHV: ${ahv}`, 'ahv', id, rowIndex, check.idField, check.label, vorname, name);
      }

      // Strategy 2: Name + Vorname + Strasse (with diacritic normalization)
      if (name && vorname && strasse) {
        const key = `NAME_STRASSE:${normalizeForComparison(name)}|${normalizeForComparison(vorname)}|${normalizeForComparison(strasse)}`;
        addError(parentMapByNameStrasse, key, `${vorname} ${name}, ${strasse}`, 'name_strasse', id, rowIndex, check.idField, check.label, vorname, name);
      }
    }
  }

  // Pass 2: Name-only strategy – requires BOTH ERZ1 and ERZ2 names to match between rows
  // This reduces false positives from common names by requiring the full parent pair to match.
  type NameOnlyEntry = {
    erz1Id: string; erz2Id: string;
    firstRow: number;
    erz1Name: string; erz2Name: string;
    erz1SlotLabel: string; erz2SlotLabel: string;
  };
  const parentPairMap = new Map<string, NameOnlyEntry>();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];
    const erz1 = PARENT_CONSISTENCY_CHECKS[0];
    const erz2 = PARENT_CONSISTENCY_CHECKS[1];

    const erz1Id = String(row[erz1.idField] ?? '').trim();
    const erz1Name = String(row[erz1.nameField] ?? '').trim();
    const erz1Vorname = String(row[erz1.vornameField] ?? '').trim();
    const erz2Id = String(row[erz2.idField] ?? '').trim();
    const erz2Name = String(row[erz2.nameField] ?? '').trim();
    const erz2Vorname = String(row[erz2.vornameField] ?? '').trim();

    // Both ERZ slots must have name+vorname and an ID
    if (!erz1Id || !erz1Name || !erz1Vorname) continue;
    if (!erz2Id || !erz2Name || !erz2Vorname) continue;

    // Build composite key from both parents' names (sorted to handle ERZ1/ERZ2 swaps)
    const pairA = `${normalizeForComparison(erz1Name)}|${normalizeForComparison(erz1Vorname)}`;
    const pairB = `${normalizeForComparison(erz2Name)}|${normalizeForComparison(erz2Vorname)}`;
    const sortedPairs = [pairA, pairB].sort();
    const compositeKey = `PAIR:${sortedPairs[0]}||${sortedPairs[1]}`;

    const displayName = `${erz1Vorname} ${erz1Name} & ${erz2Vorname} ${erz2Name}`;
    const existing = parentPairMap.get(compositeKey);

    if (existing) {
      // Check ERZ1 ID consistency
      for (const [currentId, field, label, existingId] of [
        [erz1Id, erz1.idField, erz1.label, existing.erz1Id],
        [erz2Id, erz2.idField, erz2.label, existing.erz2Id],
      ] as [string, string, string, string][]) {
        // Match IDs considering ERZ1/ERZ2 swap
        const matchesErz1 = currentId === existing.erz1Id;
        const matchesErz2 = currentId === existing.erz2Id;
        if (!matchesErz1 && !matchesErz2 && currentId !== existingId) {
          const rowFieldKey = `${rowIndex + 1}:${field}`;
          if (resolvedByHigherStrategy.has(rowFieldKey)) continue;

          const errorKey = `${rowIndex + 1}:${field}:${displayName}`;
          if (!errorSet.has(errorKey)) {
            errorSet.add(errorKey);
            const strategyInfo = STRATEGY_LABELS['name_only'];
            const warningPart = strategyInfo.warning ? `\n${strategyInfo.warning}` : '';
            errors.push({
              row: rowIndex + 1,
              column: field,
              value: currentId,
              message: `Inkonsistente ID: Elternpaar (${displayName}) hat in Zeile ${existing.firstRow} die ID '${existingId}', aber hier (${label}) die ID '${currentId}' [Erkannt via: ${strategyInfo.label} – ${strategyInfo.reliability}]${warningPart}`,
              severity: 'warning',
            });
          }
        }
      }
    } else {
      parentPairMap.set(compositeKey, {
        erz1Id, erz2Id,
        firstRow: rowIndex + 1,
        erz1Name: `${erz1Vorname} ${erz1Name}`,
        erz2Name: `${erz2Vorname} ${erz2Name}`,
        erz1SlotLabel: erz1.label,
        erz2SlotLabel: erz2.label,
      });
    }
  }

  // Pass 3: Single-parent name-only with address disambiguation
  // For parents where only ONE parent name matches (not the pair), check phone or other EB
  type SingleParentEntry = {
    id: string;
    firstRow: number;
    strasse: string;
    phoneNumbers: string[]; // normalized phone numbers
    otherErzNameKey: string; // normalized name|vorname of the OTHER parent in that row
    slotLabel: string;
    slotIndex: number; // 0 for ERZ1, 1 for ERZ2
  };
  const singleParentMap = new Map<string, SingleParentEntry[]>();

  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex];

    for (let slotIndex = 0; slotIndex < PARENT_CONSISTENCY_CHECKS.length; slotIndex++) {
      const check = PARENT_CONSISTENCY_CHECKS[slotIndex];
      const otherCheck = PARENT_CONSISTENCY_CHECKS[1 - slotIndex];

      const id = String(row[check.idField] ?? '').trim();
      const name = String(row[check.nameField] ?? '').trim();
      const vorname = String(row[check.vornameField] ?? '').trim();
      const strasse = String(row[check.strasseField] ?? '').trim();

      if (!id || !name || !vorname) continue;

      // Skip if already resolved by higher strategy
      const rowFieldKey = `${rowIndex + 1}:${check.idField}`;
      if (resolvedByHigherStrategy.has(rowFieldKey)) continue;

      // Collect phone numbers for this parent
      const phones: string[] = [];
      for (const phoneField of [check.telefonPrivatField, check.telefonGeschaeftField, check.mobilField]) {
        const raw = normalizePhone(String(row[phoneField] ?? ''));
        if (raw.length >= 5) phones.push(raw); // only meaningful numbers
      }

      // Other parent's name key
      const otherName = String(row[otherCheck.nameField] ?? '').trim();
      const otherVorname = String(row[otherCheck.vornameField] ?? '').trim();
      const otherErzNameKey = (otherName && otherVorname)
        ? `${normalizeForComparison(otherName)}|${normalizeForComparison(otherVorname)}`
        : '';

      const nameKey = `${normalizeForComparison(name)}|${normalizeForComparison(vorname)}`;
      const entry: SingleParentEntry = {
        id, firstRow: rowIndex + 1, strasse,
        phoneNumbers: phones, otherErzNameKey,
        slotLabel: check.label, slotIndex,
      };

      const existing = singleParentMap.get(nameKey);
      if (existing) {
        // Compare against all previously seen entries with the same name
        for (const prev of existing) {
          if (prev.id === id) continue; // same ID, no inconsistency

          const rowFieldKeyCheck = `${rowIndex + 1}:${check.idField}`;
          if (resolvedByHigherStrategy.has(rowFieldKeyCheck)) continue;

          // Same address → already handled by Pass 1 (name+strasse strategy)
          if (strasse && prev.strasse && normalizeForComparison(strasse) === normalizeForComparison(prev.strasse)) continue;

          // Different address → disambiguate
          let isSamePerson = false;

          // Check 1: Any phone number matches?
          if (!isSamePerson && phones.length > 0 && prev.phoneNumbers.length > 0) {
            for (const p of phones) {
              if (prev.phoneNumbers.includes(p)) {
                isSamePerson = true;
                break;
              }
            }
          }

          // Check 2: Other EB matches?
          if (!isSamePerson && otherErzNameKey && prev.otherErzNameKey && otherErzNameKey === prev.otherErzNameKey) {
            isSamePerson = true;
          }

          if (isSamePerson) {
            const displayName = `${vorname} ${name}`;
            const errorKey = `${rowIndex + 1}:${check.idField}:${displayName}`;
            if (!errorSet.has(errorKey)) {
              errorSet.add(errorKey);
              const strategyInfo = STRATEGY_LABELS['name_only'];
              const warningPart = strategyInfo.warning ? `\n${strategyInfo.warning}` : '';
              errors.push({
                row: rowIndex + 1,
                column: check.idField,
                value: id,
                message: `Inkonsistente ID: Elternteil (${displayName}) hat in Zeile ${prev.firstRow} (${prev.slotLabel}) die ID '${prev.id}', aber hier (${check.label}) die ID '${id}' [Erkannt via: ${strategyInfo.label} – ${strategyInfo.reliability}]${warningPart}`,
                severity: 'warning',
              });
            }
          }
        }
        existing.push(entry);
      } else {
        singleParentMap.set(nameKey, [entry]);
      }
    }
  }

  return errors;
}

// ============================================================
// NAMENSWECHSEL-ERKENNUNG (Name Change Detection)
// ============================================================
// Detects potential name changes for parents (e.g., marriage, double names)
// WITHOUT relying on AHV numbers. Groups by student association + first name.
//
// Strategy (combined):
//   1. Group by student name (same Schüler → same household context)
//   2. Within a household group, find parents with same Vorname but different Nachname
//   3. Apply detectNameChange() to determine if it's a plausible name change
//
// Patterns detected by detectNameChange():
//   - Substring (Marina Ianuzi → Marina Ianuzi-Tadic)
//   - Reverse hyphenated (Doris Brunner → Doris Fliege-Brunner)
//   - Complete name change same first name (Heidi Müller → Heidi Meier) via fuzzy
//   - Fuzzy matching (Levenshtein distance) for similar names

// (levenshtein function defined above, near line 375)

// Determine if two last names represent a plausible name change
// Returns the type of match or null
function detectNameChange(
  nameA: string,
  nameB: string
): 'hyphen_addition' | 'reverse_hyphen' | 'complete_change' | 'fuzzy' | null {
  const normA = normalizeForComparison(nameA);
  const normB = normalizeForComparison(nameB);

  if (normA === normB) return null; // identical → no change

  const partsA = normA.split('-');
  const partsB = normB.split('-');

  // Pattern 1: Substring (Marina Ianuzi → Marina Ianuzi-Tadic)
  if (normB.includes(normA) || normA.includes(normB)) return 'hyphen_addition';

  // Pattern 2: Shared hyphen component (Doris Brunner → Doris Fliege-Brunner)
  for (const pa of partsA) {
    for (const pb of partsB) {
      if (pa.length >= 3 && pa === pb) return 'reverse_hyphen';
    }
  }

  // Pattern 3 + 4: Complete name change or fuzzy match (same first name guaranteed by caller)
  // Use Levenshtein on the longest base part of each name
  const baseA = partsA[partsA.length - 1]; // last hyphen-segment
  const baseB = partsB[partsB.length - 1];
  const maxLen = Math.max(baseA.length, baseB.length);
  if (maxLen > 0) {
    const dist = levenshtein(baseA, baseB);
    const similarity = 1 - dist / maxLen;
    // Require ≥65% similarity to avoid false positives between common names
    // (e.g. Müller vs Brunner → ~28% → no match; Meier vs Maier → 80% → match)
    if (similarity >= 0.65) return 'complete_change';
    // Borderline fuzzy: only for very short names where 1-char diff is significant
    if (similarity >= 0.55 && maxLen <= 5) return 'fuzzy';
  }

  return null;
}

// Fields describing a student (used to build household context)
const STUDENT_NAME_FIELDS = { name: 'S_Name', vorname: 'S_Vorname' };

// Fields for each ERZ slot used in name change detection
const ERZ_NAME_CHANGE_FIELDS = [
  { nameField: 'P_ERZ1_Name', vornameField: 'P_ERZ1_Vorname', label: 'Erziehungsberechtigte/r 1' },
  { nameField: 'P_ERZ2_Name', vornameField: 'P_ERZ2_Vorname', label: 'Erziehungsberechtigte/r 2' },
];

type NameChangeType = 'hyphen_addition' | 'reverse_hyphen' | 'complete_change' | 'fuzzy';

const NAME_CHANGE_LABELS: Record<NameChangeType, string> = {
  hyphen_addition: 'Bindestrich-Ergänzung',
  reverse_hyphen: 'Umgekehrter Doppelname',
  complete_change: 'Möglicher Namenswechsel',
  fuzzy: 'Ähnlicher Name (unsicher)',
};

// Check for name changes in parents, grouped by student + first name (no AHV required)
function checkParentNameChanges(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const errorSet = new Set<string>();

  // Step 1: Group rows by student (S_Name + S_Vorname key)
  // Each student defines a "household context"
  const studentGroups = new Map<string, number[]>(); // studentKey → rowIndices

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sName = String(row[STUDENT_NAME_FIELDS.name] ?? '').trim();
    const sVorname = String(row[STUDENT_NAME_FIELDS.vorname] ?? '').trim();
    if (!sName || !sVorname) continue;
    const studentKey = `${normalizeForComparison(sName)}|${normalizeForComparison(sVorname)}`;
    const group = studentGroups.get(studentKey);
    if (group) {
      group.push(i);
    } else {
      studentGroups.set(studentKey, [i]);
    }
  }

  // Step 2: For each student group, check ERZ name changes across rows in that group
  // Then also do a cross-student pass: same Vorname across different students
  // Build a global map: erzVorname → [{rowIndex, nachname, label, studentKey}]
  type ErzEntry = { rowIndex: number; nachname: string; label: string; studentKey: string };
  const erzByVorname = new Map<string, ErzEntry[]>();

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sName = String(row[STUDENT_NAME_FIELDS.name] ?? '').trim();
    const sVorname = String(row[STUDENT_NAME_FIELDS.vorname] ?? '').trim();
    const studentKey = (sName && sVorname)
      ? `${normalizeForComparison(sName)}|${normalizeForComparison(sVorname)}`
      : `__noStudent_${i}`;

    for (const slot of ERZ_NAME_CHANGE_FIELDS) {
      const name = String(row[slot.nameField] ?? '').trim();
      const vorname = String(row[slot.vornameField] ?? '').trim();
      if (!name || !vorname) continue;

      const vornameKey = normalizeForComparison(vorname);
      const existing = erzByVorname.get(vornameKey);
      const entry: ErzEntry = { rowIndex: i, nachname: name, label: slot.label, studentKey };
      if (existing) {
        existing.push(entry);
      } else {
        erzByVorname.set(vornameKey, [entry]);
      }
    }
  }

  // Step 3: For each Vorname group, compare all pairs
  erzByVorname.forEach((entries) => {
    if (entries.length < 2) return;

    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];

        // Skip comparing two entries from the exact same row (different ERZ slots same row)
        if (a.rowIndex === b.rowIndex) continue;

        // Skip if the students have different last names — this is likely
        // two different families, not a name change (e.g., parent remarried
        // and each child kept their original surname)
        if (a.studentKey !== b.studentKey) {
          const aStudentName = a.studentKey.split('|')[0];
          const bStudentName = b.studentKey.split('|')[0];
          if (aStudentName !== bStudentName) continue;
        }

        const changeType = detectNameChange(a.nachname, b.nachname);
        if (!changeType) continue;

        // Emit warning for the LATER row (higher index)
        const laterEntry = a.rowIndex > b.rowIndex ? a : b;
        const earlierEntry = a.rowIndex > b.rowIndex ? b : a;

        const errorKey = `namechange:${laterEntry.rowIndex}:${laterEntry.label}:${normalizeForComparison(laterEntry.nachname)}:${normalizeForComparison(earlierEntry.nachname)}`;
        if (errorSet.has(errorKey)) continue;
        errorSet.add(errorKey);

        const changeLabel = NAME_CHANGE_LABELS[changeType];
        const row = rows[laterEntry.rowIndex];
        const sName = String(row[STUDENT_NAME_FIELDS.name] ?? '').trim();
        const sVorname = String(row[STUDENT_NAME_FIELDS.vorname] ?? '').trim();

        // Find the Vorname for the display (get the original from row)
        let displayVorname = '';
        for (const slot of ERZ_NAME_CHANGE_FIELDS) {
          if (slot.label === laterEntry.label) {
            displayVorname = String(row[slot.vornameField] ?? '').trim();
            break;
          }
        }

        // Find the column name for the name field
        let nameColumn = 'P_ERZ1_Name';
        for (const slot of ERZ_NAME_CHANGE_FIELDS) {
          if (slot.label === laterEntry.label) {
            nameColumn = slot.nameField;
            break;
          }
        }

        errors.push({
          row: laterEntry.rowIndex + 1,
          column: nameColumn,
          value: laterEntry.nachname,
          message: `Möglicher Namenswechsel (${changeLabel}): "${displayVorname} ${earlierEntry.nachname}" (Zeile ${earlierEntry.rowIndex + 1}) → "${displayVorname} ${laterEntry.nachname}" (${laterEntry.label}${sName ? `, Schüler/in: ${sVorname} ${sName}` : ''})\n⚠ Bitte manuell prüfen – automatische Korrektur nicht möglich (mögliche Heirat, Scheidung oder Doppelname).`,
          severity: 'warning',
        });
      }
    }
  });

  return errors;
}

// Check if rows with the same ID belong to different persons
function checkSameIdDifferentPerson(rows: ParsedRow[], field: string, rowNumbers: number[]): boolean {
  // Determine which identity fields to compare based on the ID field
  let nameField: string;
  let vornameField: string;
  let ahvField: string | null;
  let geburtsdatumField: string | null;

  if (field === 'S_ID' || field === 'S_AHV') {
    nameField = 'S_Name';
    vornameField = 'S_Vorname';
    ahvField = field === 'S_ID' ? 'S_AHV' : 'S_ID';
    geburtsdatumField = 'S_Geburtsdatum';
  } else if (field.startsWith('P_ERZ1_')) {
    nameField = 'P_ERZ1_Name';
    vornameField = 'P_ERZ1_Vorname';
    ahvField = field === 'P_ERZ1_ID' ? 'P_ERZ1_AHV' : 'P_ERZ1_ID';
    geburtsdatumField = null;
  } else if (field.startsWith('P_ERZ2_')) {
    nameField = 'P_ERZ2_Name';
    vornameField = 'P_ERZ2_Vorname';
    ahvField = field === 'P_ERZ2_ID' ? 'P_ERZ2_AHV' : 'P_ERZ2_ID';
    geburtsdatumField = null;
  } else {
    return false;
  }

  // Get identity data from the first row as reference
  const refRow = rows[rowNumbers[0] - 1];
  if (!refRow) return false;

  const refName = String(refRow[nameField] ?? '').trim().toLowerCase();
  const refVorname = String(refRow[vornameField] ?? '').trim().toLowerCase();
  const refAhv = ahvField ? String(refRow[ahvField] ?? '').trim() : '';
  const refGeb = geburtsdatumField ? String(refRow[geburtsdatumField] ?? '').trim() : '';

  // Compare each other row against the reference
  for (let i = 1; i < rowNumbers.length; i++) {
    const row = rows[rowNumbers[i] - 1];
    if (!row) continue;

    const name = String(row[nameField] ?? '').trim().toLowerCase();
    const vorname = String(row[vornameField] ?? '').trim().toLowerCase();
    const ahv = ahvField ? String(row[ahvField] ?? '').trim() : '';
    const geb = geburtsdatumField ? String(row[geburtsdatumField] ?? '').trim() : '';

    // If names are empty, we can't determine conflict
    if (!refName && !name) continue;

    // Check for differences: name+vorname differ, OR AHV differs (when both present), OR DOB differs (when both present)
    const namesDiffer = (refName && name && (refName !== name || refVorname !== vorname));
    const ahvDiffers = (refAhv && ahv && refAhv !== ahv);
    const gebDiffers = (refGeb && geb && refGeb !== geb);

    if (namesDiffer || ahvDiffers || gebDiffers) {
      return true;
    }
  }

  return false;
}

// Check if ERZ1 and ERZ2 are the same person (same AHV or same Name+Vorname)
function checkErz1EqualsErz2(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const erz1Ahv = String(row['P_ERZ1_AHV'] ?? '').trim();
    const erz2Ahv = String(row['P_ERZ2_AHV'] ?? '').trim();
    const erz1Name = String(row['P_ERZ1_Name'] ?? '').trim().toLowerCase();
    const erz1Vorname = String(row['P_ERZ1_Vorname'] ?? '').trim().toLowerCase();
    const erz2Name = String(row['P_ERZ2_Name'] ?? '').trim().toLowerCase();
    const erz2Vorname = String(row['P_ERZ2_Vorname'] ?? '').trim().toLowerCase();
    
    // Check AHV match (most reliable)
    if (erz1Ahv && erz2Ahv && erz1Ahv === erz2Ahv) {
      errors.push({
        row: i + 1,
        column: 'P_ERZ2_AHV',
        value: erz2Ahv,
        message: `ERZ1 und ERZ2 haben die gleiche AHV-Nummer "${erz1Ahv}" – vermutlich dieselbe Person doppelt erfasst`,
        type: 'business',
        severity: 'warning',
      });
      continue;
    }
    
    // Check Name+Vorname match
    if (erz1Name && erz1Vorname && erz2Name && erz2Vorname &&
        erz1Name === erz2Name && erz1Vorname === erz2Vorname) {
      errors.push({
        row: i + 1,
        column: 'P_ERZ2_Name',
        value: `${row['P_ERZ2_Vorname']} ${row['P_ERZ2_Name']}`,
        message: `ERZ1 und ERZ2 haben den gleichen Namen "${erz1Vorname} ${erz1Name}" – vermutlich dieselbe Person doppelt erfasst`,
        type: 'business',
        severity: 'warning',
      });
    }
  }
  
  return errors;
}

// Check for S_ID = 0 placeholder values
function checkPlaceholderIds(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const placeholderValues = new Set(['0', '00', '000', '0000', '-1', 'NULL', 'null', 'N/A', 'n/a', 'TBD', 'tbd', 'XXX', 'xxx']);
  
  for (let i = 0; i < rows.length; i++) {
    const sId = String(rows[i]['S_ID'] ?? '').trim();
    if (sId && placeholderValues.has(sId)) {
      errors.push({
        row: i + 1,
        column: 'S_ID',
        value: sId,
        message: `S_ID "${sId}" ist ein Platzhalter-Wert – muss vor dem Import ersetzt werden`,
        type: 'business',
        severity: 'warning',
      });
    }
  }
  
  return errors;
}

// Check if a student is listed as their own parent (S_AHV == P_ERZ_AHV)
function checkStudentIsParent(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const sAhv = String(row['S_AHV'] ?? '').trim();
    if (!sAhv) continue;
    
    for (const [erzAhvField, label] of [
      ['P_ERZ1_AHV', 'ERZ1'],
      ['P_ERZ2_AHV', 'ERZ2'],
    ] as const) {
      const erzAhv = String(row[erzAhvField] ?? '').trim();
      if (erzAhv && sAhv === erzAhv) {
        errors.push({
          row: i + 1,
          column: erzAhvField,
          value: erzAhv,
          message: `Schüler-AHV und ${label}-AHV sind identisch ("${sAhv}") – Schüler/in kann nicht eigene/r Erziehungsberechtigte/r sein`,
          type: 'business',
          severity: 'error',
        });
      }
    }
  }
  
  return errors;
}

// Validate data - Optimized for large datasets (4000+ rows)
export function validateData(
  rows: ParsedRow[],
  columnDefinitions: ColumnDefinition[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const rowCount = rows.length;

  // Build column lookup maps for O(1) access
  const columnDefMap = new Map<string, ColumnDefinition>();
  for (const col of columnDefinitions) {
    columnDefMap.set(col.name, col);
  }

  // First pass: collect values for duplicate detection using Maps
  const valueOccurrences = new Map<string, Map<string, number[]>>();
  for (const field of DUPLICATE_CHECK_FIELDS) {
    valueOccurrences.set(field, new Map());
  }

  // Single pass for both duplicate collection and field validation
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const row = rows[rowIndex];
    const rowNum = rowIndex + 1;

    // Collect duplicates for specified fields
    for (const field of DUPLICATE_CHECK_FIELDS) {
      const value = row[field];
      const strValue = String(value ?? '').trim();
      if (strValue !== '') {
        const fieldMap = valueOccurrences.get(field)!;
        const existing = fieldMap.get(strValue);
        if (existing) {
          existing.push(rowNum);
        } else {
          fieldMap.set(strValue, [rowNum]);
        }
      }
    }

    // Field-level validation
    for (const col of columnDefinitions) {
      const value = row[col.name];
      const strValue = String(value ?? '').trim();

      // Check required fields
      if (col.required && (value === null || value === undefined || strValue === '')) {
        errors.push({
          row: rowNum,
          column: col.name,
          value: '',
          message: `Pflichtfeld "${col.name}" ist leer`,
        });
        continue;
      }

      // Skip validation if empty and not required
      if (strValue === '') continue;

      // Type-specific validation
      const validationError = validateFieldType(col.validationType, strValue, rowNum, col.name);
      if (validationError) {
        errors.push(validationError);
      }
    }
  }

  // Fields where duplicates are expected (parent fields repeat across siblings)
  const PARENT_FIELDS = new Set(['P_ERZ1_ID', 'P_ERZ2_ID', 'P_ERZ1_AHV', 'P_ERZ2_AHV']);

  // Process duplicates with ID conflict detection
  for (const field of DUPLICATE_CHECK_FIELDS) {
    const fieldMap = valueOccurrences.get(field)!;
    const isParentField = PARENT_FIELDS.has(field);

    fieldMap.forEach((rowNumbers, value) => {
      if (rowNumbers.length > 1) {
        // Check if this is an ID conflict (same ID, different person)
        const isIdConflict = checkSameIdDifferentPerson(rows, field, rowNumbers);
        
        if (isIdConflict) {
          // ID Conflict: different persons with same ID - serious error
          for (let i = 1; i < rowNumbers.length; i++) {
            errors.push({
              row: rowNumbers[i],
              column: field,
              value: value,
              message: `ID-Konflikt: "${value}" wird in Zeile ${rowNumbers[0]} von einer anderen Person verwendet`,
              type: 'id_conflict',
              severity: 'error',
            });
          }
        } else if (!isParentField) {
          // Normal duplicate: same person, duplicate entry
          // Skip for parent fields – parents naturally appear in multiple rows (one per child)
          for (let i = 1; i < rowNumbers.length; i++) {
            errors.push({
              row: rowNumbers[i],
              column: field,
              value: value,
              message: `Duplikat: "${value}" kommt auch in Zeile ${rowNumbers[0]} vor`,
              type: 'duplicate',
              severity: 'warning',
            });
          }
        }
      }
    });
  }

  // Check parent ID consistency
  const parentIdErrors = checkParentIdConsistency(rows);
  errors.push(...parentIdErrors);

  // Check diacritic name inconsistencies and auto-correct
  const diacriticErrors = checkDiacriticNameInconsistencies(rows);
  errors.push(...diacriticErrors);

  // Check for parent name changes (marriage, double names, etc.) – no AHV required
  const nameChangeErrors = checkParentNameChanges(rows);
  errors.push(...nameChangeErrors);

  // Check sibling consistency (same parent ID but different PLZ/Ort)
  const siblingErrors = checkSiblingConsistency(rows);
  errors.push(...siblingErrors);

  // Check PLZ↔Ort consistency
  const plzOrtErrors = checkPlzOrtConsistency(rows);
  errors.push(...plzOrtErrors);

  // Check ERZ1 = ERZ2 (same person listed as both parents)
  const erz1Erz2Errors = checkErz1EqualsErz2(rows);
  errors.push(...erz1Erz2Errors);

  // Check S_ID = 0 placeholder
  const placeholderErrors = checkPlaceholderIds(rows);
  errors.push(...placeholderErrors);

  // Check student = parent (S_AHV == P_ERZ_AHV)
  const selfParentErrors = checkStudentIsParent(rows);
  errors.push(...selfParentErrors);

  return errors;
}

// Sibling consistency check: children sharing a parent ID must have the same PLZ/Ort
function checkSiblingConsistency(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  const parentIdFields = ['P_ERZ1_ID', 'P_ERZ2_ID'];
  const checkFields = ['S_PLZ', 'S_Ort'];

  for (const idField of parentIdFields) {
    // Group row indices by parent ID
    const groups = new Map<string, number[]>();
    for (let i = 0; i < rows.length; i++) {
      const id = String(rows[i][idField] ?? '').trim();
      if (id === '') continue;
      const existing = groups.get(id);
      if (existing) existing.push(i);
      else groups.set(id, [i]);
    }

    // Check each group with 2+ children
    groups.forEach((indices, parentId) => {
      if (indices.length < 2) return;

      for (const field of checkFields) {
        // Collect distinct non-empty values
        const valueMap = new Map<string, number[]>();
        for (const idx of indices) {
          const val = String(rows[idx][field] ?? '').trim();
          if (val === '') continue;
          const existing = valueMap.get(val);
          if (existing) existing.push(idx);
          else valueMap.set(val, [idx]);
        }

        if (valueMap.size > 1) {
          // Inconsistency found – warn on all rows except the most common value
          let maxCount = 0;
          let majorityValue = '';
          valueMap.forEach((idxs, val) => {
            if (idxs.length > maxCount) { maxCount = idxs.length; majorityValue = val; }
          });

          valueMap.forEach((idxs, val) => {
            if (val === majorityValue) return;
            for (const idx of idxs) {
              const studentName = `${rows[idx]['S_Vorname'] ?? ''} ${rows[idx]['S_Name'] ?? ''}`.trim();
              errors.push({
                row: idx + 1,
                column: field,
                value: val,
                message: `Geschwister-Inkonsistenz: ${field} ist "${val}", aber andere Kinder von ${idField}="${parentId}" haben "${majorityValue}"${studentName ? ` (${studentName})` : ''}`,
                type: 'business',
                severity: 'warning',
              });
            }
          });
        }
      }
    });
  }

  return errors;
}

// PLZ↔Ort consistency check using Swiss PLZ database
function checkPlzOrtConsistency(rows: ParsedRow[]): ValidationError[] {
  const errors: ValidationError[] = [];
  // Pairs of PLZ and Ort columns to cross-check
  const plzOrtPairs: [string, string][] = [
    ['S_PLZ', 'S_Ort'],
    ['P_ERZ1_PLZ', 'P_ERZ1_Ort'],
    ['P_ERZ2_PLZ', 'P_ERZ2_Ort'],
  ];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    for (const [plzCol, ortCol] of plzOrtPairs) {
      const plz = String(row[plzCol] ?? '').trim();
      const ort = String(row[ortCol] ?? '').trim();

      if (plz === '' || ort === '') continue;

      const result = validatePlzOrt(plz, ort);

      if (result !== null && result !== true) {
        // Mismatch found
        const expected = result.slice(0, 3).join(', ');
        errors.push({
          row: rowNum,
          column: ortCol,
          value: ort,
          message: `PLZ ${plz} gehört zu "${expected}", nicht zu "${ort}"`,
          type: 'business',
          severity: 'warning',
        });
      }
    }
  }

  return errors;
}

// Optimized field type validation
function validateFieldType(
  validationType: string | undefined,
  value: string,
  rowNum: number,
  columnName: string
): ValidationError | null {
  switch (validationType) {
    case 'date':
      if (!isValidDate(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültiges Datumsformat' };
      }
      // Future date warning for birth dates
      if (columnName === 'S_Geburtsdatum') {
        const dateMatch = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
        if (dateMatch) {
          const birthDate = new Date(parseInt(dateMatch[3]), parseInt(dateMatch[2]) - 1, parseInt(dateMatch[1]));
          if (birthDate > new Date()) {
            return { row: rowNum, column: columnName, value, message: 'Geburtsdatum liegt in der Zukunft', severity: 'warning' };
          }
        }
      }
      break;
    case 'ahv':
      if (!isValidAHV(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültiges AHV-Format (756.XXXX.XXXX.XX)' };
      }
      // Format is correct — now check checksum
      if (!isValidAHVChecksum(value)) {
        return { row: rowNum, column: columnName, value, message: 'AHV-Prüfziffer ungültig – Manuelle Prüfung erforderlich', severity: 'warning' };
      }
      break;
    case 'email':
      if (!isValidEmail(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültige E-Mail-Adresse' };
      }
      break;
    case 'number':
      if (isNaN(Number(value))) {
        return { row: rowNum, column: columnName, value, message: 'Ungültige Zahl' };
      }
      break;
    case 'plz':
      if (!isValidPLZ(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültige PLZ (4-5 Ziffern erwartet)' };
      }
      break;
    case 'gender':
      if (!isValidGender(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültiges Geschlecht (M, W oder D erwartet)' };
      }
      break;
    case 'phone':
      if (!isValidPhone(value)) {
        return { row: rowNum, column: columnName, value, message: 'Ungültiges Telefonformat' };
      }
      break;
    case 'language':
      if (!isValidLanguage(value)) {
        const similar = findSimilarLanguage(value);
        return {
          row: rowNum,
          column: columnName,
          value,
          message: similar
            ? `"${value}" ist keine gültige BISTA-Sprache. Meinten Sie "${similar}"?`
            : `"${value}" ist keine gültige BISTA-Sprache (kein BISTA-Code vorhanden)`,
          type: 'format',
          severity: similar ? 'warning' : 'error',
          correctedValue: similar ?? undefined,
        };
      }
      break;
    case 'nationality':
      if (!isValidNationality(value)) {
        const correction = findNationalityCorrection(value);
        return {
          row: rowNum,
          column: columnName,
          value,
          message: correction
            ? `"${value}" → "${correction}" (veraltete Bezeichnung)`
            : `"${value}" ist keine gültige Nationalität`,
          type: 'format',
          severity: correction ? 'warning' : 'error',
          correctedValue: correction ?? undefined,
        };
      }
      break;
  }
  return null;
}

function isValidDate(value: string): boolean {
  // Only accept DD.MM.YYYY as the valid Swiss date format.
  const match = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (!match) return false;
  
  const day = parseInt(match[1]);
  const month = parseInt(match[2]);
  const year = parseInt(match[3]);
  
  // Basic range checks
  if (month < 1 || month > 12) return false;
  if (day < 1) return false;
  
  // Days per month (with leap year support)
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (month === 2 && ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0)) {
    daysInMonth[2] = 29;
  }
  if (day > daysInMonth[month]) return false;
  
  // Year plausibility: 1900-2100
  if (year < 1900 || year > 2100) return false;
  
  return true;
}

function isValidAHV(value: string): boolean {
  // Swiss AHV number format: 756.XXXX.XXXX.XX
  const pattern = /^756\.\d{4}\.\d{4}\.\d{2}$/;
  return pattern.test(value);
}

function isValidEmail(value: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(value);
}

function isValidPLZ(value: string): boolean {
  // Accept 4-5 digit postal codes (CH: 4 digits, DE/AT: 5 digits)
  const pattern = /^\d{4,5}$/;
  return pattern.test(value.replace(/\s/g, ''));
}

function isValidGender(value: string): boolean {
  // Uses shared formatter — accepts all values formatGender can normalize (M, W, D, MÄNNLICH, etc.)
  return checkGenderValid(value);
}

function isValidPhone(value: string): boolean {
  // Remove all whitespace, dashes, parentheses for validation
  const cleaned = value.replace(/[\s\-\(\)\.\/]/g, '');
  
  // International format patterns (E.164 and common variations)
  const patterns = [
    /^\+\d{7,15}$/,           // +41791234567 (E.164)
    /^00\d{7,15}$/,           // 0041791234567
    /^0\d{8,10}$/,            // 0791234567 (national format)
    /^\d{10,11}$/,            // 0791234567 without leading 0 check
  ];
  
  return patterns.some(p => p.test(cleaned));
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
        correctedRows[rowIndex][error.column] = error.correctedValue;
      }
    }
  });

  return correctedRows;
}

// Build a lookup map for corrections from validation errors
function buildCorrectionMap(errors: ValidationError[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const e of errors) {
    if (e.correctedValue !== undefined) {
      map.set(`${e.row}:${e.column}`, String(e.correctedValue));
    }
  }
  return map;
}

// Export to CSV - keeps original column names
export function exportToCSV(
  rows: ParsedRow[],
  headers: string[],
  importType: string,
  options: {
    onlyErrorFree?: boolean;
    errors?: ValidationError[];
    removeExtraColumns?: boolean;
    expectedColumns?: string[];
  } = {}
): void {
  const { onlyErrorFree = false, errors = [], removeExtraColumns = false, expectedColumns = [] } = options;
  const correctionMap = buildCorrectionMap(errors);

  // Filter rows if onlyErrorFree, keeping track of original row numbers
  let exportRowsWithIndex: { row: ParsedRow; rowNum: number }[] = rows.map((r, i) => ({ row: r, rowNum: i + 1 }));
  if (onlyErrorFree && errors.length > 0) {
    const errorRows = new Set(errors.filter(e => !e.correctedValue).map(e => e.row));
    exportRowsWithIndex = exportRowsWithIndex.filter(({ rowNum }) => !errorRows.has(rowNum));
  }

  // Determine which headers to use
  let exportHeaders = headers;
  if (removeExtraColumns && expectedColumns.length > 0) {
    const expectedSet = new Set(expectedColumns);
    exportHeaders = headers.filter(h => expectedSet.has(h));
  }

  // Build CSV content with semicolon delimiter for Excel compatibility
  const escapeCSVValue = (val: string): string => {
    if (val.includes('"') || val.includes(';') || val.includes('\n')) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  };

  const csvLines: string[] = [];
  csvLines.push(exportHeaders.map(escapeCSVValue).join(';'));
  
  exportRowsWithIndex.forEach(({ row, rowNum }) => {
    const values = exportHeaders.map(header => {
      // Apply correction if available
      const corrected = correctionMap.get(`${rowNum}:${header}`);
      if (corrected !== undefined) return escapeCSVValue(corrected);
      const value = row[header];
      return escapeCSVValue(value !== null && value !== undefined ? String(value) : '');
    });
    csvLines.push(values.join(';'));
  });

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${importType}_${date}_bereinigt.csv`;

  // Export with UTF-8 BOM for Excel compatibility
  const csvContent = csvLines.join('\r\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, fileName);
}

// Export to Excel - keeps original column names
export async function exportToExcel(
  rows: ParsedRow[],
  headers: string[],
  importType: string,
  options: {
    onlyErrorFree?: boolean;
    errors?: ValidationError[];
    removeExtraColumns?: boolean;
    expectedColumns?: string[];
  } = {}
): Promise<void> {
  const { onlyErrorFree = false, errors = [], removeExtraColumns = false, expectedColumns = [] } = options;
  const correctionMap = buildCorrectionMap(errors);

  // Filter rows if onlyErrorFree, keeping track of original row numbers
  let exportRowsWithIndex: { row: ParsedRow; rowNum: number }[] = rows.map((r, i) => ({ row: r, rowNum: i + 1 }));
  if (onlyErrorFree && errors.length > 0) {
    const errorRows = new Set(errors.filter(e => !e.correctedValue).map(e => e.row));
    exportRowsWithIndex = exportRowsWithIndex.filter(({ rowNum }) => !errorRows.has(rowNum));
  }

  // Determine which headers to use
  let exportHeaders = headers;
  if (removeExtraColumns && expectedColumns.length > 0) {
    const expectedSet = new Set(expectedColumns);
    exportHeaders = headers.filter(h => expectedSet.has(h));
  }

  // Create workbook
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Daten');

  // Add header row
  worksheet.addRow(exportHeaders);

  // Set all columns to text format to prevent Excel from auto-converting dates
  worksheet.columns.forEach(col => {
    col.numFmt = '@'; // Text format
  });

  // Add data rows with corrections applied
  exportRowsWithIndex.forEach(({ row, rowNum }) => {
    const values = exportHeaders.map(header => {
      const corrected = correctionMap.get(`${rowNum}:${header}`);
      if (corrected !== undefined) return corrected;
      const value = row[header];
      return value !== null && value !== undefined ? String(value) : '';
    });
    const addedRow = worksheet.addRow(values);
    // Ensure each cell is explicitly typed as string to prevent date auto-detection
    addedRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.numFmt = '@';
      if (cell.value !== null && cell.value !== undefined) {
        cell.value = String(cell.value);
      }
    });
  });

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${importType}_${date}_bereinigt.xlsx`;

  // Export
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, fileName);
}
