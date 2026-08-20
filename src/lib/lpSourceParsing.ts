/**
 * Pure Parsing-Helfer für die LP-Klassenzuweisung.
 *
 * Erkennt sowohl die klassischen PUPIL-Exporte (Nachname/Vorname/Schlüssel
 * bzw. Klassenname) als auch die bereinigten Exporte aus den Stammdaten-
 * Importen (LID/Name/Vorname bzw. K_Name + K_Schulhaus_Name).
 */
import type { ParsedRow, PupilPerson, PupilClass } from '@/types/importTypes';

function norm(h: string): string {
  return h.toLowerCase().trim();
}

function val(row: ParsedRow, header: string | undefined): string {
  if (!header) return '';
  const v = row[header];
  return v === null || v === undefined ? '' : String(v).trim();
}

function findHeader(headers: string[], predicate: (h: string) => boolean): string | undefined {
  return headers.find(h => predicate(norm(h)));
}

/** Lehrpersonen aus einer hochgeladenen Datei extrahieren. */
export function extractPersons(headers: string[], rows: ParsedRow[]): PupilPerson[] | null {
  const nachnameH =
    findHeader(headers, h => h.includes('nachname')) ??
    findHeader(headers, h => h === 'name' || h === 'l_name');
  const vornameH = findHeader(headers, h => h.includes('vorname'));
  const schluesselH =
    findHeader(headers, h => h.includes('schlüssel') || h.includes('schluessel')) ??
    findHeader(headers, h => h === 'lid' || h === 'l_id');

  if (!nachnameH || !vornameH || !schluesselH) return null;

  const seen = new Set<string>();
  const persons: PupilPerson[] = [];
  for (const row of rows) {
    const nachname = val(row, nachnameH);
    const schluessel = val(row, schluesselH);
    if (!nachname || !schluessel || seen.has(schluessel)) continue;
    seen.add(schluessel);
    persons.push({ nachname, vorname: val(row, vornameH), schluessel });
  }
  return persons;
}

/** PUPIL-Klassenname aus K_Name und K_Schulhaus_Name zusammensetzen. */
export function buildPupilClassName(kName: string, kSchulhaus: string): string {
  return [kName.trim(), kSchulhaus.trim()].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
}

/** Klassen aus einer hochgeladenen Datei extrahieren. */
export function extractClasses(headers: string[], rows: ParsedRow[]): PupilClass[] | null {
  const klassennameH = findHeader(headers, h => h.includes('klassenname'));
  const klpH = findHeader(headers, h => h.includes('klassenlehrpersonen'));

  if (klassennameH) {
    const seen = new Set<string>();
    const out: PupilClass[] = [];
    for (const row of rows) {
      const klassenname = val(row, klassennameH);
      if (!klassenname || seen.has(klassenname)) continue;
      seen.add(klassenname);
      const klpRaw = val(row, klpH);
      out.push({
        klassenname,
        klassenlehrpersonen: klpRaw ? klpRaw.split(',').map(s => s.trim()).filter(Boolean) : [],
      });
    }
    return out;
  }

  // Bereinigter SuS-Export: K_Name (+ K_Schulhaus_Name)
  const kNameH = findHeader(headers, h => h === 'k_name');
  if (!kNameH) return null;
  const kSchulhausH = findHeader(headers, h => h === 'k_schulhaus_name');
  return extractClassesFromStammdaten(rows, kNameH, kSchulhausH);
}

/** Klassenliste aus den bereinigten SuS-Zeilen ableiten. */
export function extractClassesFromStammdaten(
  rows: ParsedRow[],
  kNameHeader = 'K_Name',
  kSchulhausHeader: string | undefined = 'K_Schulhaus_Name',
): PupilClass[] {
  const seen = new Set<string>();
  const out: PupilClass[] = [];
  for (const row of rows) {
    const klassenname = buildPupilClassName(val(row, kNameHeader), val(row, kSchulhausHeader));
    if (!klassenname || seen.has(klassenname)) continue;
    seen.add(klassenname);
    out.push({ klassenname, klassenlehrpersonen: [] });
  }
  return out.sort((a, b) => a.klassenname.localeCompare(b.klassenname, 'de-CH'));
}
