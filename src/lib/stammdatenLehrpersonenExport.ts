import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ParsedRow } from '@/types/importTypes';
import { sanitizeCellValue } from '@/lib/utils';

// Total output columns (per Musterdatei "Bereinigter Export Lehrpersonen")
export const STAMMDATEN_LP_TOTAL_COLS = 52;

// Positional header mapping: 1-based column index → output header.
// Empty string ('') means no header but data is preserved.
// Positions 49-52 are appended empty columns (no header, no data).
const HEADER_BY_POSITION: Record<number, string> = {
  1: 'IDVRSG',
  4: 'AHV-V-Nr',
  5: 'LID',
  7: 'Name',
  8: 'Vorname',
  13: 'Ges',
  14: 'Geb',
  16: 'Beruf',
  18: 'Nationalitaet',
  19: 'Natel',
  24: 'Eintritt',
  26: 'Anrede',
  28: 'Strasse',
  30: 'Plz',
  31: 'Ort',
  32: 'Land',
  33: 'EMail_P',
  34: 'Tel_P',
  41: 'EMail_G',
  42: 'Tel_G',
};

// 1-based column index for L_Funktion (Beruf) in the original LO export
const BERUF_COL_INDEX = 16;
export const BERUF_FIXED_VALUE = 'Spezial - Deaktiviert';

// Standard user values keyed by 1-based output column index.
// Values mirror Musterdatei "Bereinigter Export Lehrpersonen" Zeile 3.
const STANDARD_USER: Record<number, string> = {
  5: 'PUP6546654679797',
  7: 'Testuser',
  8: 'Pupil',
  13: 'm ',
  14: '01.01.1990',
  16: BERUF_FIXED_VALUE,
  41: 'lp@einfach.schule',
};

export function buildOutputHeaders(): string[] {
  return Array.from({ length: STAMMDATEN_LP_TOTAL_COLS }, (_, i) => HEADER_BY_POSITION[i + 1] ?? '');
}

function formatCellValue(val: unknown): string {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) {
    const dd = String(val.getDate()).padStart(2, '0');
    const mm = String(val.getMonth() + 1).padStart(2, '0');
    const yyyy = val.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }
  return String(val);
}

/**
 * Build the output rows in the exact order they will appear in the file:
 * - Row 1 (Excel): headers
 * - Row 2 (Excel): Standard user
 * - Row 3+ (Excel): transformed LO data (Beruf forced to fixed value)
 */
export function buildOutputRows(
  originalHeaders: string[],
  rows: ParsedRow[],
): { headers: string[]; standardUser: string[]; data: string[][] } {
  const headers = buildOutputHeaders();

  const standardUser: string[] = Array.from({ length: STAMMDATEN_LP_TOTAL_COLS }, (_, i) =>
    sanitizeCellValue(STANDARD_USER[i + 1] ?? '')
  );

  const data: string[][] = rows.map(row => {
    const out: string[] = Array.from({ length: STAMMDATEN_LP_TOTAL_COLS }, () => '');
    originalHeaders.forEach((h, idx) => {
      if (idx >= STAMMDATEN_LP_TOTAL_COLS) return;
      let raw = formatCellValue(row[h]);
      // Beruf column: overwrite when the source cell is populated
      if (idx + 1 === BERUF_COL_INDEX && raw.trim() !== '') {
        raw = BERUF_FIXED_VALUE;
      }
      out[idx] = sanitizeCellValue(raw);
    });
    return out;
  });

  return { headers, standardUser, data };
}

export async function exportStammdatenLehrpersonenToXlsx(
  originalHeaders: string[],
  rows: ParsedRow[],
  fileName?: string,
) {
  const { headers, standardUser, data } = buildOutputRows(originalHeaders, rows);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PUPIL Import Wizard';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Lehrpersonen');

  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
  headerRow.alignment = { vertical: 'middle' };

  // Set column widths and force text format to preserve values like dates / leading zeros
  headers.forEach((h, i) => {
    const col = sheet.getColumn(i + 1);
    col.width = h ? Math.max(h.length + 4, 12) : 3;
    col.numFmt = '@';
  });

  sheet.addRow(standardUser);
  data.forEach(r => sheet.addRow(r));

  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const exportName = fileName
    ? fileName.replace(/\.(csv|xlsx?)$/i, '') + '_Bereinigt.xlsx'
    : `Stammdaten_Lehrpersonen_Bereinigt_${new Date().toISOString().slice(0, 10)}.xlsx`;
  saveAs(blob, exportName);
}