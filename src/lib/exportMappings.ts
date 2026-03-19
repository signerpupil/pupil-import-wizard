import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { VALID_BISTA_LANGUAGES, LANGUAGE_AUTO_CORRECTIONS, VALID_NATIONALITIES, NATIONALITY_AUTO_CORRECTIONS } from './fileParser';

export async function exportMappingsToExcel() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'PUPIL Import Wizard';
  workbook.created = new Date();

  // ===== Sheet 1: BISTA Sprachen (gültige Liste) =====
  const langSheet = workbook.addWorksheet('BISTA Sprachen (gültig)');
  langSheet.columns = [
    { header: '#', key: 'nr', width: 6 },
    { header: 'Gültige BISTA-Sprache', key: 'sprache', width: 45 },
  ];
  const sortedLangs = [...VALID_BISTA_LANGUAGES].sort((a, b) => a.localeCompare(b, 'de'));
  sortedLangs.forEach((lang, i) => {
    langSheet.addRow({ nr: i + 1, sprache: lang });
  });
  styleHeader(langSheet);

  // ===== Sheet 2: Sprach-Mappings =====
  const langMapSheet = workbook.addWorksheet('Sprach-Mappings');
  langMapSheet.columns = [
    { header: '#', key: 'nr', width: 6 },
    { header: 'Eingabe (wird erkannt)', key: 'eingabe', width: 40 },
    { header: 'Korrektur → BISTA-Wert', key: 'ziel', width: 50 },
  ];
  const sortedLangMappings = Object.entries(LANGUAGE_AUTO_CORRECTIONS)
    .sort((a, b) => a[1].localeCompare(b[1], 'de') || a[0].localeCompare(b[0], 'de'));
  sortedLangMappings.forEach(([input, target], i) => {
    langMapSheet.addRow({ nr: i + 1, eingabe: input, ziel: target });
  });
  styleHeader(langMapSheet);

  // ===== Sheet 3: Nationalitäten (gültige Liste) =====
  const natSheet = workbook.addWorksheet('Nationalitäten (gültig)');
  natSheet.columns = [
    { header: '#', key: 'nr', width: 6 },
    { header: 'Gültiger Ländername', key: 'land', width: 45 },
  ];
  const sortedNats = [...VALID_NATIONALITIES].sort((a, b) => a.localeCompare(b, 'de'));
  sortedNats.forEach((nat, i) => {
    natSheet.addRow({ nr: i + 1, land: nat });
  });
  styleHeader(natSheet);

  // ===== Sheet 4: Nationalitäts-Mappings =====
  const natMapSheet = workbook.addWorksheet('Nationalitäts-Mappings');
  natMapSheet.columns = [
    { header: '#', key: 'nr', width: 6 },
    { header: 'Eingabe (wird erkannt)', key: 'eingabe', width: 40 },
    { header: 'Korrektur → Offizieller Name', key: 'ziel', width: 50 },
    { header: 'Kategorie', key: 'kategorie', width: 25 },
  ];
  const sortedNatMappings = Object.entries(NATIONALITY_AUTO_CORRECTIONS)
    .sort((a, b) => a[1].localeCompare(b[1], 'de') || a[0].localeCompare(b[0], 'de'));
  sortedNatMappings.forEach(([input, target], i) => {
    const kategorie = categorizeNatMapping(input);
    natMapSheet.addRow({ nr: i + 1, eingabe: input, ziel: target, kategorie });
  });
  styleHeader(natMapSheet);

  // ===== Sheet 5: Zusammenfassung =====
  const summarySheet = workbook.addWorksheet('Zusammenfassung');
  summarySheet.columns = [
    { header: 'Bereich', key: 'bereich', width: 35 },
    { header: 'Anzahl', key: 'anzahl', width: 12 },
  ];
  summarySheet.addRow({ bereich: 'Gültige BISTA-Sprachen', anzahl: VALID_BISTA_LANGUAGES.size });
  summarySheet.addRow({ bereich: 'Sprach-Auto-Korrekturen', anzahl: Object.keys(LANGUAGE_AUTO_CORRECTIONS).length });
  summarySheet.addRow({ bereich: 'Gültige Nationalitäten', anzahl: VALID_NATIONALITIES.size });
  summarySheet.addRow({ bereich: 'Nationalitäts-Auto-Korrekturen', anzahl: Object.keys(NATIONALITY_AUTO_CORRECTIONS).length });
  summarySheet.addRow({ bereich: '', anzahl: '' });
  summarySheet.addRow({ bereich: 'Stand', anzahl: new Date().toLocaleDateString('de-CH') });
  styleHeader(summarySheet);

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `BISTA-Mappings_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

function styleHeader(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
  headerRow.alignment = { vertical: 'middle' };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function categorizeNatMapping(input: string): string {
  if (/^[A-Z]{2}$/.test(input)) return 'ISO-Code';
  const historical = ['Tibet', 'Abessinien', 'Dahomey', 'Obervolta', 'Bechuanaland', 'Basutoland', 'Nyassaland', 'Rhodesien', 'Südrhodesien', 'Nordrhodesien', 'Goldküste', 'Zaire', 'Ceylon', 'Siam', 'Bombay', 'Ostindien', 'Formosa', 'Burma', 'Birma', 'Persien', 'Deutsch-Ostafrika', 'Tanganjika', 'Sansibar', 'Czechoslovakia', 'Yugoslavia', 'Jugoslavien', 'Jugoslawien', 'Sowjetunion', 'UdSSR'];
  if (historical.includes(input)) return 'Historisch';
  const typos = ['Algerian', 'Portugall', 'Östereich', 'Oesterreich', 'Deuschland', 'Deutschalnd', 'Itallien', 'Rumänian', 'Kolumbian', 'Brazilien', 'Phillippinen', 'Phillipinen', 'Afganistan', 'Afghanisan', 'Eriträa', 'Äthopien', 'Ethopien', 'Ethiopien', 'Somala', 'Nigerien', 'Kosova', 'Kosowo', 'Massedonia', 'Mazedonia', 'Makedonia', 'Kroazien', 'Lithauen', 'Slovakei', 'Slovenien'];
  if (typos.includes(input)) return 'Tippfehler';
  return 'Variante';
}
