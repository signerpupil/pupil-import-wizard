// Import Types & Field Definitions for PUPIL Import Wizard

export type ImportType = 'schueler' | 'journal' | 'foerderplaner';
export type FoerderplanerSubType = 'diagnostik' | 'foerderplanung' | 'lernberichte';

export interface FieldMapping {
  sourceField: string;
  targetField: string;
  required: boolean;
  category?: string;
  notInPupil?: boolean;
}

export interface ImportConfig {
  type: ImportType;
  subType?: FoerderplanerSubType;
  name: string;
  description: string;
  icon: string;
  fields: FieldMapping[];
}

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ValidationError {
  row: number;
  field: string;
  value: string;
  message: string;
  correctedValue?: string;
}

export interface ImportData {
  headers: string[];
  rows: ParsedRow[];
  mappings: Record<string, string>;
  errors: ValidationError[];
  correctedRows: ParsedRow[];
}

// Schülerdaten Field Definitions
export const schuelerFields: FieldMapping[] = [
  // Schüler (S_)
  { sourceField: 'S_AHV', targetField: 'Sozialversicherungsnummer', required: true, category: 'Schüler' },
  { sourceField: 'S_ID', targetField: 'ID', required: false, category: 'Schüler' },
  { sourceField: 'S_Name', targetField: 'Familienname', required: true, category: 'Schüler' },
  { sourceField: 'S_Vorname', targetField: 'Vorname', required: true, category: 'Schüler' },
  { sourceField: 'S_Geschlecht', targetField: 'Geschlecht', required: true, category: 'Schüler' },
  { sourceField: 'S_Geburtsdatum', targetField: 'Geburtsdatum', required: true, category: 'Schüler' },
  { sourceField: 'S_OffiziellerName', targetField: 'Offizieller Name', required: false, category: 'Schüler' },
  { sourceField: 'S_OffiziellerVorname', targetField: 'Offizieller Vorname', required: false, category: 'Schüler' },
  { sourceField: 'S_Heimatort', targetField: 'Heimatort', required: false, category: 'Schüler' },
  { sourceField: 'S_Heimatkanton', targetField: 'Heimatkanton', required: false, category: 'Schüler' },
  { sourceField: 'S_Nationalitaet', targetField: 'Nationalität', required: false, category: 'Schüler' },
  { sourceField: 'S_Konfession', targetField: 'Konfession', required: false, category: 'Schüler' },
  { sourceField: 'S_Muttersprache', targetField: 'Muttersprache', required: false, category: 'Schüler' },
  { sourceField: 'S_Umgangssprache', targetField: 'Korrespondenzsprache', required: false, category: 'Schüler' },
  { sourceField: 'S_Strasse', targetField: 'Strasse', required: false, category: 'Schüler' },
  { sourceField: 'S_PLZ', targetField: 'PLZ', required: false, category: 'Schüler' },
  { sourceField: 'S_Ort', targetField: 'Ort', required: false, category: 'Schüler' },
  { sourceField: 'S_Land', targetField: 'Land', required: false, category: 'Schüler' },
  { sourceField: 'S_PolitischeGemeinde', targetField: 'Politische Gemeinde', required: false, category: 'Schüler' },
  { sourceField: 'S_Email', targetField: 'E-Mail', required: false, category: 'Schüler' },
  { sourceField: 'S_Telefon', targetField: 'Telefon', required: false, category: 'Schüler' },
  { sourceField: 'S_Mobil', targetField: 'Mobile', required: false, category: 'Schüler' },
  { sourceField: 'S_Eintrittsdatum', targetField: 'Klassenzugehörigkeit Beginn', required: false, category: 'Schüler' },
  { sourceField: 'S_Austrittsdatum', targetField: 'Klassenzugehörigkeit Ende', required: false, category: 'Schüler' },
  { sourceField: 'S_Mediendarstellung', targetField: 'Mediendarstellung', required: false, category: 'Schüler' },
  
  // Klasse (K_)
  { sourceField: 'K_ID', targetField: 'Klassen-ID', required: false, category: 'Klasse' },
  { sourceField: 'K_Schluessel', targetField: 'Klassen-Schlüssel', required: false, category: 'Klasse' },
  { sourceField: 'K_Name', targetField: 'Klassenname', required: true, category: 'Klasse' },
  { sourceField: 'K_Schulstufe', targetField: 'Schulstufe', required: false, category: 'Klasse' },
  { sourceField: 'K_Schulform', targetField: 'Schulform', required: false, category: 'Klasse' },
  { sourceField: 'K_Jahrgang', targetField: 'Schuljahr', required: false, category: 'Klasse' },
  { sourceField: 'K_Zusatz', targetField: 'Klassenzusatz', required: false, category: 'Klasse' },
  { sourceField: 'K_Schulhaus', targetField: 'Schulhaus', required: false, category: 'Klasse' },
  
  // Klassenlehrperson (L_KL1_)
  { sourceField: 'L_KL1_AHV', targetField: 'Lehrperson AHV', required: false, category: 'Klassenlehrperson' },
  { sourceField: 'L_KL1_ID', targetField: 'Lehrperson ID', required: false, category: 'Klassenlehrperson' },
  { sourceField: 'L_KL1_Name', targetField: 'Lehrperson Name', required: false, category: 'Klassenlehrperson' },
  { sourceField: 'L_KL1_Vorname', targetField: 'Lehrperson Vorname', required: false, category: 'Klassenlehrperson' },
  
  // Erziehungsberechtigte 1 (P_ERZ1_)
  { sourceField: 'P_ERZ1_ID', targetField: 'ERZ1 ID', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_AHV', targetField: 'ERZ1 AHV', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Name', targetField: 'ERZ1 Name', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Vorname', targetField: 'ERZ1 Vorname', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Geschlecht', targetField: 'ERZ1 Geschlecht', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Beruf', targetField: 'ERZ1 Beruf', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Rolle', targetField: 'ERZ1 Beziehungsart', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Anrede', targetField: 'ERZ1 Anrede', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Nationalitaet', targetField: 'ERZ1 Nationalität', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Muttersprache', targetField: 'ERZ1 Muttersprache', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Umgangssprache', targetField: 'ERZ1 Korrespondenzsprache', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Strasse', targetField: 'ERZ1 Strasse', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_PLZ', targetField: 'ERZ1 PLZ', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Ort', targetField: 'ERZ1 Ort', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Land', targetField: 'ERZ1 Land', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Email', targetField: 'ERZ1 E-Mail', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_TelefonPrivat', targetField: 'ERZ1 Telefon Privat', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_TelefonGeschaeft', targetField: 'ERZ1 Telefon Geschäft', required: false, category: 'Erziehungsberechtigte/r 1' },
  { sourceField: 'P_ERZ1_Mobil', targetField: 'ERZ1 Mobile', required: false, category: 'Erziehungsberechtigte/r 1' },
  
  // Erziehungsberechtigte 2 (P_ERZ2_)
  { sourceField: 'P_ERZ2_ID', targetField: 'ERZ2 ID', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_AHV', targetField: 'ERZ2 AHV', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Name', targetField: 'ERZ2 Name', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Vorname', targetField: 'ERZ2 Vorname', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Geschlecht', targetField: 'ERZ2 Geschlecht', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Beruf', targetField: 'ERZ2 Beruf', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Rolle', targetField: 'ERZ2 Beziehungsart', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Anrede', targetField: 'ERZ2 Anrede', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Nationalitaet', targetField: 'ERZ2 Nationalität', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Muttersprache', targetField: 'ERZ2 Muttersprache', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Umgangssprache', targetField: 'ERZ2 Korrespondenzsprache', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Strasse', targetField: 'ERZ2 Strasse', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_PLZ', targetField: 'ERZ2 PLZ', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Ort', targetField: 'ERZ2 Ort', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Land', targetField: 'ERZ2 Land', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Email', targetField: 'ERZ2 E-Mail', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_TelefonPrivat', targetField: 'ERZ2 Telefon Privat', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_TelefonGeschaeft', targetField: 'ERZ2 Telefon Geschäft', required: false, category: 'Erziehungsberechtigte/r 2' },
  { sourceField: 'P_ERZ2_Mobil', targetField: 'ERZ2 Mobile', required: false, category: 'Erziehungsberechtigte/r 2' },
];

// Journaldaten Field Definitions
export const journalFields: FieldMapping[] = [
  { sourceField: 'Klasse', targetField: 'Klasse/Gruppe', required: true, category: 'Journal' },
  { sourceField: 'Eintrag für', targetField: 'Schüler/in', required: true, category: 'Journal' },
  { sourceField: 'Datum', targetField: 'Datum', required: true, category: 'Journal' },
  { sourceField: 'Beobachtung / Gespräch / usw.', targetField: 'Kategorie', required: true, category: 'Journal' },
  { sourceField: 'Beobachtung / Gespräch / usw.', targetField: 'Unterkategorie', required: false, category: 'Journal' },
  { sourceField: 'Fach', targetField: 'Fach', required: false, category: 'Journal' },
  { sourceField: 'Erledigt', targetField: 'Status (Erledigt/nicht Erledigt)', required: false, category: 'Journal' },
  { sourceField: 'Versäumnis', targetField: 'Öffentliche Notiz', required: false, category: 'Journal' },
  { sourceField: 'Massnahme', targetField: 'Interne Notiz', required: false, category: 'Journal' },
  { sourceField: 'Datum.', targetField: 'Absenz von', required: false, category: 'Absenz' },
  { sourceField: 'Bis (bei Kategorie Absenz)', targetField: 'Absenz bis', required: false, category: 'Absenz' },
  { sourceField: 'Dauer', targetField: 'Anzahl Halbtage', required: false, category: 'Absenz' },
  { sourceField: 'Entschuldigung Datum', targetField: 'Status', required: false, category: 'Absenz' },
  { sourceField: 'Entschuldigungsgrund', targetField: '', required: false, category: 'Absenz', notInPupil: true },
  { sourceField: 'Anmerkung', targetField: 'Kommentar Absenz', required: false, category: 'Absenz' },
  { sourceField: 'Einheit', targetField: 'Lektionen / Halbtage', required: false, category: 'Absenz' },
  { sourceField: 'Uhrzeit und Ort', targetField: 'Zeit Elterngespräch', required: false, category: 'Gespräch' },
];

// Förderplaner - Diagnostik Field Definitions
export const diagnostikFields: FieldMapping[] = [
  { sourceField: 'Diagnostik – Fragestellungen', targetField: 'Art der Förderung: Diagnostik', required: true, category: 'Diagnostik' },
  { sourceField: 'Eintrag für', targetField: 'Schüler/in', required: true, category: 'Diagnostik' },
  { sourceField: 'Schwerpunkt gemäss ICF-Aktivitätsbereich', targetField: 'Bereich', required: true, category: 'Diagnostik' },
  { sourceField: 'Titel', targetField: 'Förderziel - Förderziel', required: true, category: 'Diagnostik' },
  { sourceField: 'Status', targetField: '', required: false, category: 'Diagnostik', notInPupil: true },
  { sourceField: 'Ausgangslage', targetField: 'Förderziel - Förderziel', required: false, category: 'Diagnostik' },
  { sourceField: 'Beschreibung', targetField: 'Förderziel - Förderziel', required: false, category: 'Diagnostik' },
  { sourceField: 'Erklärungsansätze', targetField: 'Förderziel - Förderziel', required: false, category: 'Diagnostik' },
  { sourceField: 'Zeitraum von', targetField: 'Förderziel - Beginn', required: false, category: 'Diagnostik' },
  { sourceField: 'Zeitraum bis', targetField: 'Förderziel - Ende', required: false, category: 'Diagnostik' },
  { sourceField: 'Priorität', targetField: '', required: false, category: 'Diagnostik', notInPupil: true },
];

// Förderplaner - Förderplanung Field Definitions
export const foerderplanungFields: FieldMapping[] = [
  { sourceField: 'Förderplanung', targetField: 'Art der Förderung: Förderplanung', required: true, category: 'Förderplanung' },
  { sourceField: 'Eintrag für', targetField: 'Schüler/in', required: true, category: 'Förderplanung' },
  { sourceField: 'Fragestellung', targetField: '', required: false, category: 'Förderplanung', notInPupil: true },
  { sourceField: 'Fach-/Kompetenzbereich', targetField: 'Förderziel – ICF- oder LP21-Bereich', required: true, category: 'Förderplanung' },
  { sourceField: 'Förderziel', targetField: 'Förderziel - Förderziel', required: true, category: 'Förderplanung' },
  { sourceField: 'Förderung ist abgeschlossen', targetField: '', required: false, category: 'Förderplanung', notInPupil: true },
  { sourceField: 'Fördermassnahmen', targetField: 'Förderziel - Massnahme', required: false, category: 'Förderplanung' },
  { sourceField: 'Verantwortliche Person', targetField: 'Förderziel - Massnahme', required: false, category: 'Förderplanung' },
  { sourceField: 'Förderverlauf: Datum', targetField: 'Förderziel - Förderverlauf - Datum', required: false, category: 'Förderplanung' },
  { sourceField: 'Förderverlauf: Geplanter Lernschritt', targetField: 'Förderziel - Förderverlauf - Beschreibung', required: false, category: 'Förderplanung' },
  { sourceField: 'Förderverlauf: Beobachtung', targetField: 'Förderziel - Förderverlauf - Beschreibung', required: false, category: 'Förderplanung' },
  { sourceField: 'Lernfortschritt', targetField: 'Förderziel - Fortschritte', required: false, category: 'Förderplanung' },
  { sourceField: 'Förderziel erfasst', targetField: '', required: false, category: 'Förderplanung', notInPupil: true },
  { sourceField: 'Zuletzt geändert', targetField: '', required: false, category: 'Förderplanung', notInPupil: true },
  { sourceField: 'Bezug auf LP 21', targetField: '', required: false, category: 'Förderplanung', notInPupil: true },
  { sourceField: 'Datum Beginn der Förderung', targetField: 'Förderziel - Beginn', required: false, category: 'Förderplanung' },
  { sourceField: 'Datum Abschluss der Förderung', targetField: 'Förderziele - Ende', required: false, category: 'Förderplanung' },
];

// Förderplaner - Lernberichte Field Definitions
export const lernberichteFields: FieldMapping[] = [
  { sourceField: 'Lernbericht', targetField: '', required: true, category: 'Lernbericht' },
  { sourceField: 'Eintrag für', targetField: 'Schüler/in', required: true, category: 'Lernbericht' },
  { sourceField: 'Halbjahr', targetField: '', required: false, category: 'Lernbericht' },
  { sourceField: 'Lehrperson', targetField: 'Lehrperson (Bericht verwalten)', required: false, category: 'Lernbericht' },
  { sourceField: 'Datum', targetField: 'Datum Bericht', required: false, category: 'Lernbericht' },
  { sourceField: 'Titel Lernbericht', targetField: 'Name Bericht', required: true, category: 'Lernbericht' },
  { sourceField: 'Lernbericht abgeschlossen', targetField: '', required: false, category: 'Lernbericht', notInPupil: true },
  { sourceField: 'Für Zwischenzeugnis / Jahreszeugnis', targetField: 'Bericht verwalten – Bericht fürs Zeugnis', required: false, category: 'Lernbericht' },
  { sourceField: 'Fach/Kompetenzbereich', targetField: 'Fachbereich', required: false, category: 'Lernbericht' },
  { sourceField: 'Förderziel', targetField: 'Förderziel', required: false, category: 'Lernbericht' },
  { sourceField: 'Beurteilung', targetField: 'Zielerreichung setzen', required: false, category: 'Lernbericht' },
  { sourceField: 'Zusammenfassung der Lernfortschritte', targetField: 'Würdigung', required: false, category: 'Lernbericht' },
];

// Get fields by import type
export function getFieldsByType(type: ImportType, subType?: FoerderplanerSubType): FieldMapping[] {
  switch (type) {
    case 'schueler':
      return schuelerFields;
    case 'journal':
      return journalFields;
    case 'foerderplaner':
      switch (subType) {
        case 'diagnostik':
          return diagnostikFields;
        case 'foerderplanung':
          return foerderplanungFields;
        case 'lernberichte':
          return lernberichteFields;
        default:
          return [];
      }
    default:
      return [];
  }
}

// Import configurations
export const importConfigs: ImportConfig[] = [
  {
    type: 'schueler',
    name: 'Schülerdaten',
    description: 'Schüler, Klassen, Lehrpersonen und Erziehungsberechtigte importieren',
    icon: 'Users',
    fields: schuelerFields,
  },
  {
    type: 'journal',
    name: 'Journaldaten',
    description: 'Beobachtungen, Gespräche, Absenzen und mehr importieren',
    icon: 'BookOpen',
    fields: journalFields,
  },
  {
    type: 'foerderplaner',
    name: 'Förderplaner',
    description: 'Diagnostik, Förderplanung und Lernberichte importieren',
    icon: 'GraduationCap',
    fields: [],
  },
];

export const foerderplanerSubTypes = [
  {
    subType: 'diagnostik' as FoerderplanerSubType,
    name: 'Diagnostik',
    description: 'Diagnostische Fragestellungen und ICF-Bereiche',
    icon: 'Search',
    fields: diagnostikFields,
  },
  {
    subType: 'foerderplanung' as FoerderplanerSubType,
    name: 'Förderplanung',
    description: 'Förderziele, Massnahmen und Förderverlauf',
    icon: 'Target',
    fields: foerderplanungFields,
  },
  {
    subType: 'lernberichte' as FoerderplanerSubType,
    name: 'Lernberichte',
    description: 'Lernberichte und Beurteilungen',
    icon: 'FileText',
    fields: lernberichteFields,
  },
];
