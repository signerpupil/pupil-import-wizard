// Import Types & Field Definitions for PUPIL Import Wizard
// Spalten werden NICHT umbenannt - nur validiert

export type ImportType = 'schueler' | 'journal' | 'foerderplaner';
export type FoerderplanerSubType = 'diagnostik' | 'foerderplanung' | 'lernberichte';

export interface ColumnDefinition {
  name: string;
  required: boolean;
  category: string;
  description?: string;
  validationType?: 'date' | 'ahv' | 'email' | 'number' | 'text' | 'plz' | 'gender' | 'phone';
}

export interface ImportConfig {
  type: ImportType;
  subType?: FoerderplanerSubType;
  name: string;
  description: string;
  icon: string;
  columns: ColumnDefinition[];
}

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ValidationError {
  row: number;
  column: string;
  value: string;
  message: string;
  correctedValue?: string;
}

export interface ColumnStatus {
  name: string;
  status: 'found' | 'missing' | 'extra';
  required: boolean;
  category?: string;
}

export interface ChangeLogEntry {
  timestamp: Date;
  type: 'manual' | 'ai-bulk' | 'ai-auto';
  row: number;
  column: string;
  originalValue: string;
  newValue: string;
  studentName?: string;
}

export interface ImportData {
  headers: string[];
  rows: ParsedRow[];
  columnStatuses: ColumnStatus[];
  errors: ValidationError[];
  extraColumnsAction: 'keep' | 'remove';
}

// Schülerdaten Spalten-Definitionen (basierend auf echtem LO-Export)
export const schuelerColumns: ColumnDefinition[] = [
  // System-Spalten
  { name: 'Q_System', required: false, category: 'System' },
  { name: 'Q_Schuljahr', required: false, category: 'System' },
  { name: 'Q_Semester', required: false, category: 'System' },
  
  // Schüler (S_)
  { name: 'S_AHV', required: true, category: 'Schüler', validationType: 'ahv' },
  { name: 'S_ID', required: true, category: 'Schüler' },
  { name: 'S_Name', required: true, category: 'Schüler' },
  { name: 'S_Vorname', required: true, category: 'Schüler' },
  { name: 'S_Geschlecht', required: true, category: 'Schüler', validationType: 'gender' },
  { name: 'S_Geburtsdatum', required: true, category: 'Schüler', validationType: 'date' },
  { name: 'S_Heimatort', required: false, category: 'Schüler' },
  { name: 'S_Konfession', required: false, category: 'Schüler' },
  { name: 'S_Muttersprache', required: false, category: 'Schüler' },
  { name: 'S_Umgangssprache', required: false, category: 'Schüler' },
  { name: 'S_Nationalitaet', required: false, category: 'Schüler' },
  { name: 'S_Strasse', required: false, category: 'Schüler' },
  { name: 'S_PLZ', required: false, category: 'Schüler', validationType: 'plz' },
  { name: 'S_Ort', required: false, category: 'Schüler' },
  { name: 'S_EMail', required: false, category: 'Schüler', validationType: 'email' },
  { name: 'S_Telefon', required: false, category: 'Schüler', validationType: 'phone' },
  { name: 'S_Mobil', required: false, category: 'Schüler', validationType: 'phone' },
  { name: 'S_Eintritt_Kiga_Datum', required: false, category: 'Schüler', validationType: 'date' },
  { name: 'S_Eintritt_Primar_Datum', required: false, category: 'Schüler', validationType: 'date' },
  { name: 'S_Eintritt_Sek_Datum', required: false, category: 'Schüler', validationType: 'date' },
  { name: 'S_Eintritt_Datum', required: false, category: 'Schüler', validationType: 'date' },
  { name: 'S_Austritt_Datum', required: false, category: 'Schüler', validationType: 'date' },
  { name: 'S_Hausarzt_ID', required: false, category: 'Schüler' },
  { name: 'S_Zahnarzt_ID', required: false, category: 'Schüler' },
  
  // Erziehungsberechtigte 1 (P_ERZ1_)
  { name: 'P_ERZ1_ID', required: false, category: 'Erziehungsberechtigte/r 1' },
  { name: 'P_ERZ1_AHV', required: false, category: 'Erziehungsberechtigte/r 1', validationType: 'ahv' },
  { name: 'P_ERZ1_Name', required: false, category: 'Erziehungsberechtigte/r 1' },
  { name: 'P_ERZ1_Vorname', required: false, category: 'Erziehungsberechtigte/r 1' },
  { name: 'P_ERZ1_Beruf', required: false, category: 'Erziehungsberechtigte/r 1' },
  { name: 'P_ERZ1_Geschl', required: false, category: 'Erziehungsberechtigte/r 1', validationType: 'gender' },
  { name: 'P_ERZ1_Rolle', required: false, category: 'Erziehungsberechtigte/r 1' },
  { name: 'P_ERZ1_Strasse', required: false, category: 'Erziehungsberechtigte/r 1' },
  { name: 'P_ERZ1_PLZ', required: false, category: 'Erziehungsberechtigte/r 1', validationType: 'plz' },
  { name: 'P_ERZ1_Ort', required: false, category: 'Erziehungsberechtigte/r 1' },
  { name: 'P_ERZ1_EMail', required: false, category: 'Erziehungsberechtigte/r 1', validationType: 'email' },
  { name: 'P_ERZ1_TelefonPrivat', required: false, category: 'Erziehungsberechtigte/r 1', validationType: 'phone' },
  { name: 'P_ERZ1_TelefonGeschaeft', required: false, category: 'Erziehungsberechtigte/r 1', validationType: 'phone' },
  { name: 'P_ERZ1_Mobil', required: false, category: 'Erziehungsberechtigte/r 1', validationType: 'phone' },
  
  // Erziehungsberechtigte 2 (P_ERZ2_)
  { name: 'P_ERZ2_ID', required: false, category: 'Erziehungsberechtigte/r 2' },
  { name: 'P_ERZ2_AHV', required: false, category: 'Erziehungsberechtigte/r 2', validationType: 'ahv' },
  { name: 'P_ERZ2_Name', required: false, category: 'Erziehungsberechtigte/r 2' },
  { name: 'P_ERZ2_Vorname', required: false, category: 'Erziehungsberechtigte/r 2' },
  { name: 'P_ERZ2_Beruf', required: false, category: 'Erziehungsberechtigte/r 2' },
  { name: 'P_ERZ2_Geschl', required: false, category: 'Erziehungsberechtigte/r 2', validationType: 'gender' },
  { name: 'P_ERZ2_Rolle', required: false, category: 'Erziehungsberechtigte/r 2' },
  { name: 'P_ERZ2_Strasse', required: false, category: 'Erziehungsberechtigte/r 2' },
  { name: 'P_ERZ2_PLZ', required: false, category: 'Erziehungsberechtigte/r 2', validationType: 'plz' },
  { name: 'P_ERZ2_Ort', required: false, category: 'Erziehungsberechtigte/r 2' },
  { name: 'P_ERZ2_EMail', required: false, category: 'Erziehungsberechtigte/r 2', validationType: 'email' },
  { name: 'P_ERZ2_TelefonPrivat', required: false, category: 'Erziehungsberechtigte/r 2', validationType: 'phone' },
  { name: 'P_ERZ2_TelefonGeschaeft', required: false, category: 'Erziehungsberechtigte/r 2', validationType: 'phone' },
  { name: 'P_ERZ2_Mobil', required: false, category: 'Erziehungsberechtigte/r 2', validationType: 'phone' },
  
  // Klasse (K_)
  { name: 'K_Schluessel', required: false, category: 'Klasse' },
  { name: 'K_Name', required: true, category: 'Klasse' },
  { name: 'K_Schulhaus_Name', required: false, category: 'Klasse' },
  
  // Klassenlehrperson (L_KL1_)
  { name: 'L_KL1_AHV', required: false, category: 'Klassenlehrperson', validationType: 'ahv' },
  { name: 'L_KL1_ID', required: false, category: 'Klassenlehrperson' },
  { name: 'L_KL1_Name', required: false, category: 'Klassenlehrperson' },
  { name: 'L_KL1_Vorname', required: false, category: 'Klassenlehrperson' },
];

// Journaldaten Spalten-Definitionen
export const journalColumns: ColumnDefinition[] = [
  { name: 'Klasse', required: true, category: 'Journal' },
  { name: 'Eintrag_fuer', required: true, category: 'Journal', description: 'Schüler-Referenz' },
  { name: 'Datum', required: true, category: 'Journal', validationType: 'date' },
  { name: 'Kategorie', required: true, category: 'Journal' },
  { name: 'Unterkategorie', required: false, category: 'Journal' },
  { name: 'Fach', required: false, category: 'Journal' },
  { name: 'Erledigt', required: false, category: 'Journal' },
  { name: 'Versaeumnis', required: false, category: 'Journal' },
  { name: 'Massnahme', required: false, category: 'Journal' },
  { name: 'Absenz_von', required: false, category: 'Absenz', validationType: 'date' },
  { name: 'Absenz_bis', required: false, category: 'Absenz', validationType: 'date' },
  { name: 'Dauer', required: false, category: 'Absenz' },
  { name: 'Entschuldigung_Datum', required: false, category: 'Absenz', validationType: 'date' },
  { name: 'Entschuldigungsgrund', required: false, category: 'Absenz' },
  { name: 'Anmerkung', required: false, category: 'Absenz' },
  { name: 'Einheit', required: false, category: 'Absenz' },
  { name: 'Uhrzeit_Ort', required: false, category: 'Gespräch' },
];

// Förderplaner - Diagnostik Spalten
export const diagnostikColumns: ColumnDefinition[] = [
  { name: 'Eintrag_fuer', required: true, category: 'Diagnostik' },
  { name: 'ICF_Bereich', required: true, category: 'Diagnostik' },
  { name: 'Titel', required: true, category: 'Diagnostik' },
  { name: 'Status', required: false, category: 'Diagnostik' },
  { name: 'Ausgangslage', required: false, category: 'Diagnostik' },
  { name: 'Beschreibung', required: false, category: 'Diagnostik' },
  { name: 'Erklaerungsansaetze', required: false, category: 'Diagnostik' },
  { name: 'Zeitraum_von', required: false, category: 'Diagnostik', validationType: 'date' },
  { name: 'Zeitraum_bis', required: false, category: 'Diagnostik', validationType: 'date' },
  { name: 'Prioritaet', required: false, category: 'Diagnostik' },
];

// Förderplaner - Förderplanung Spalten
export const foerderplanungColumns: ColumnDefinition[] = [
  { name: 'Eintrag_fuer', required: true, category: 'Förderplanung' },
  { name: 'Fragestellung', required: false, category: 'Förderplanung' },
  { name: 'Fach_Kompetenzbereich', required: true, category: 'Förderplanung' },
  { name: 'Foerderziel', required: true, category: 'Förderplanung' },
  { name: 'Foerderung_abgeschlossen', required: false, category: 'Förderplanung' },
  { name: 'Foerdermassnahmen', required: false, category: 'Förderplanung' },
  { name: 'Verantwortliche_Person', required: false, category: 'Förderplanung' },
  { name: 'Foerderverlauf_Datum', required: false, category: 'Förderplanung', validationType: 'date' },
  { name: 'Foerderverlauf_Lernschritt', required: false, category: 'Förderplanung' },
  { name: 'Foerderverlauf_Beobachtung', required: false, category: 'Förderplanung' },
  { name: 'Lernfortschritt', required: false, category: 'Förderplanung' },
  { name: 'Datum_Beginn', required: false, category: 'Förderplanung', validationType: 'date' },
  { name: 'Datum_Abschluss', required: false, category: 'Förderplanung', validationType: 'date' },
];

// Förderplaner - Lernberichte Spalten
export const lernberichteColumns: ColumnDefinition[] = [
  { name: 'Eintrag_fuer', required: true, category: 'Lernbericht' },
  { name: 'Halbjahr', required: false, category: 'Lernbericht' },
  { name: 'Lehrperson', required: false, category: 'Lernbericht' },
  { name: 'Datum', required: false, category: 'Lernbericht', validationType: 'date' },
  { name: 'Titel_Lernbericht', required: true, category: 'Lernbericht' },
  { name: 'Lernbericht_abgeschlossen', required: false, category: 'Lernbericht' },
  { name: 'Fuer_Zeugnis', required: false, category: 'Lernbericht' },
  { name: 'Fach_Kompetenzbereich', required: false, category: 'Lernbericht' },
  { name: 'Foerderziel', required: false, category: 'Lernbericht' },
  { name: 'Beurteilung', required: false, category: 'Lernbericht' },
  { name: 'Lernfortschritte', required: false, category: 'Lernbericht' },
];

// Get columns by import type
export function getColumnsByType(type: ImportType, subType?: FoerderplanerSubType): ColumnDefinition[] {
  switch (type) {
    case 'schueler':
      return schuelerColumns;
    case 'journal':
      return journalColumns;
    case 'foerderplaner':
      switch (subType) {
        case 'diagnostik':
          return diagnostikColumns;
        case 'foerderplanung':
          return foerderplanungColumns;
        case 'lernberichte':
          return lernberichteColumns;
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
    columns: schuelerColumns,
  },
  {
    type: 'journal',
    name: 'Journaldaten',
    description: 'Beobachtungen, Gespräche, Absenzen und mehr importieren',
    icon: 'BookOpen',
    columns: journalColumns,
  },
  {
    type: 'foerderplaner',
    name: 'Förderplaner',
    description: 'Diagnostik, Förderplanung und Lernberichte importieren',
    icon: 'GraduationCap',
    columns: [],
  },
];

export const foerderplanerSubTypes = [
  {
    subType: 'diagnostik' as FoerderplanerSubType,
    name: 'Diagnostik',
    description: 'Diagnostische Fragestellungen und ICF-Bereiche',
    icon: 'Search',
    columns: diagnostikColumns,
  },
  {
    subType: 'foerderplanung' as FoerderplanerSubType,
    name: 'Förderplanung',
    description: 'Förderziele, Massnahmen und Förderverlauf',
    icon: 'Target',
    columns: foerderplanungColumns,
  },
  {
    subType: 'lernberichte' as FoerderplanerSubType,
    name: 'Lernberichte',
    description: 'Lernberichte und Beurteilungen',
    icon: 'FileText',
    columns: lernberichteColumns,
  },
];
