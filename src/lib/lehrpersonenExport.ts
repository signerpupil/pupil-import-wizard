import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import type { ParsedRow } from '@/types/importTypes';

// Positional column mapping: original LO header → PUPIL header
// Empty string means the header is cleared but data is kept
export const LEHRPERSONEN_COLUMN_MAP: Record<string, string> = {
  'Q_System': 'IDVRSG',
  'Q_Schuljahr': '',
  'Q_Semester': '',
  'L_AHV': 'AHV-V-Nr',
  'L_ID': 'LID',
  'L_Personal-Nr': '',
  'L_Name': 'Name',
  'L_Vorname': 'Vorname',
  'L_NameOffiziell': '',
  'L_NameAlias': '',
  'L_VornameOffiziell': '',
  'L_VornameAlias': '',
  'L_Geschlecht': 'Ges',
  'L_Geburtsdatum': 'Geb',
  'L_Kuerzel': '',
  'L_Funktion': 'Beruf',
  'L_Muttersprache': '',
  'L_Nationalitaet': '',
  'L_Mobil': 'Natel',
  'L_Website': '',
  'L_Mediendarstellung': '',
  'L_Schuleinheiten': '',
  'L_Schulzimmer': '',
  'L_Eintritt': '',
  'L_Austritt': '',
  'L_Anrede': '',
  'L_Privat_AdressenZusatz': '',
  'L_Privat_Strasse': 'Strasse',
  'L_Privat_Postfach': '',
  'L_Privat_PLZ': 'Plz',
  'L_Privat_Ort': 'Ort',
  'L_Privat_Land': 'Land',
  'L_Privat_EMail': 'EMail_P',
  'L_Privat_Telefon': 'Tel_P',
  'L_Schule': '',
  'L_Schule_Zusatz': '',
  'L_Schule_AdressenZusatz': '',
  'L_Schule_Strasse': '',
  'L_Schule_PLZ': '',
  'L_Schule_Ort': '',
  'L_Schule_EMail': 'EMail_G',
  'L_Schule_Telefon': 'Tel_G',
  'L_Schule_Mobil': '',
  'L_Schule_TelefonKurzwahl': '',
  'L_Schule_Fax': '',
  'L_Schule_Homepage': '',
  'L_Login_Name': '',
  'L_Login_Kennwort': '',
};

export const BERUF_PRESETS = ['Lehrperson', 'MA', 'Deaktiviert-Spezial'];

export function mapHeaders(originalHeaders: string[]): string[] {
  return originalHeaders.map(h => {
    if (h in LEHRPERSONEN_COLUMN_MAP) {
      return LEHRPERSONEN_COLUMN_MAP[h];
    }
    return '';
  });
}

export async function exportLehrpersonenToXlsx(
  originalHeaders: string[],
  rows: ParsedRow[],
  berufValues: Record<number, string>, // row index → beruf value
  defaultBeruf: string,
  fileName?: string,
) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PUPIL Import Wizard';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Lehrpersonen');

  const mappedHeaders = mapHeaders(originalHeaders);

  // Add header row
  const headerRow = sheet.addRow(mappedHeaders);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  headerRow.alignment = { vertical: 'middle' };

  // Set column widths for mapped columns
  mappedHeaders.forEach((h, i) => {
    if (h) {
      sheet.getColumn(i + 1).width = Math.max(h.length + 4, 12);
    } else {
      sheet.getColumn(i + 1).width = 3;
    }
  });

  // Find the Beruf column index (L_Funktion position)
  const berufColIndex = originalHeaders.indexOf('L_Funktion');

  // Add data rows
  rows.forEach((row, rowIdx) => {
    const values = originalHeaders.map((h, colIdx) => {
      if (colIdx === berufColIndex) {
        return berufValues[rowIdx] ?? defaultBeruf;
      }
      return row[h] ?? '';
    });
    sheet.addRow(values);
  });

  // Freeze header
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const exportName = fileName
    ? fileName.replace(/\.(csv|xlsx?)$/i, '') + '_PUPIL.xlsx'
    : `Lehrpersonen_PUPIL_${new Date().toISOString().slice(0, 10)}.xlsx`;
  saveAs(blob, exportName);
}
