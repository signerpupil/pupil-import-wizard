/**
 * Inline-Fehlererklärungen für Step 3 Validierung.
 *
 * Liefert für eine Spalte und/oder eine konkrete Fehlermeldung:
 * - was der Fehler bedeutet (in einfacher Sprache)
 * - wie ein gültiger Wert aussieht
 * - optional, was typische Ursachen sind
 *
 * Ziel: Sekretariate verstehen, was sie korrigieren müssen, ohne externe Doku.
 */

import type { ValidationError } from '@/types/importTypes';

export interface ErrorExplanation {
  /** Kurzer Titel, z.B. "AHV-Nummer ungültig" */
  title: string;
  /** Erklärung in 1–3 Sätzen, einfache Sprache */
  description: string;
  /** Beispiel eines korrekten Wertes (optional) */
  example?: string;
  /** Typische Ursachen / Hinweise (optional) */
  hint?: string;
}

/** Erklärungen pro Spalten-Pattern (häufigste PUPIL-Felder) */
const COLUMN_EXPLANATIONS: Record<string, ErrorExplanation> = {
  S_AHV: {
    title: 'AHV-Nummer (Sozialversicherungsnummer)',
    description:
      'Die 13-stellige Schweizer Sozialversicherungsnummer mit Punkt-Trennung. Beginnt immer mit 756 und enthält eine Prüfziffer am Ende.',
    example: '756.1234.5678.97',
    hint: 'Nur Ziffern und Punkte. Bindestriche oder Leerzeichen werden nicht akzeptiert.',
  },
  S_Geburtsdatum: {
    title: 'Geburtsdatum',
    description: 'Datum im Format TT.MM.JJJJ. Schüler:innen sollten zwischen 4 und 20 Jahre alt sein.',
    example: '15.03.2014',
    hint: 'Bei Excel-Import wird ein Datum manchmal als Zahl gespeichert — bitte als Text formatieren.',
  },
  S_Geschlecht: {
    title: 'Geschlecht',
    description: 'Erlaubt sind die Werte "m" (männlich), "w" (weiblich) oder "d" (divers).',
    example: 'm',
  },
  S_PLZ: {
    title: 'Postleitzahl',
    description: '4-stellige Schweizer Postleitzahl. Muss zur angegebenen Ortschaft passen.',
    example: '8000',
    hint: 'Wenn PLZ und Ort nicht zusammenpassen, prüfe beide Felder gegen die offizielle Post-Liste.',
  },
  S_Nationalitaet: {
    title: 'Nationalität',
    description: 'Land in deutscher Schreibweise. Doppelbürger:innen bitte mit "/" trennen.',
    example: 'Schweiz oder Schweiz/Italien',
    hint: 'Verwende den Auswahl-Button "Land wählen" für eine Liste aller akzeptierten Werte.',
  },
  S_Muttersprache: {
    title: 'Muttersprache (BISTA)',
    description: 'Sprache nach BISTA-Standard. Dialekte werden auf die Hauptsprache gemappt (z.B. "Schweizerdeutsch" → "Deutsch").',
    example: 'Deutsch, Italienisch, Albanisch',
    hint: 'Verwende den Auswahl-Button "Sprache wählen" für die offizielle BISTA-Liste.',
  },
  S_Umgangssprache: {
    title: 'Umgangssprache (BISTA)',
    description: 'Im Alltag gesprochene Sprache nach BISTA-Standard.',
    example: 'Deutsch',
    hint: 'Bei mehrsprachigen Familien die im Schulkontext meistgenutzte Sprache angeben.',
  },
};

/** Erklärungen pro Spalten-Suffix (z.B. _Email, _Telefon, _PLZ in Eltern-Feldern) */
const SUFFIX_EXPLANATIONS: { suffix: string; explanation: ErrorExplanation }[] = [
  {
    suffix: '_Email',
    explanation: {
      title: 'E-Mail-Adresse',
      description: 'Gültige E-Mail im Format name@domain.ch. Platzhalter wie "Keine", "-" oder "n/a" werden als leer behandelt.',
      example: 'familie.muster@example.ch',
      hint: 'Bei verstorbenen Personen "verstorben" eintragen — das wird als Warnung, nicht als Fehler markiert.',
    },
  },
  {
    suffix: '_Telefon',
    explanation: {
      title: 'Telefonnummer',
      description: 'Schweizer Telefonnummer im internationalen Format. Wird automatisch normalisiert.',
      example: '+41 44 123 45 67',
      hint: 'Auch 044 123 45 67 wird akzeptiert und in das +41-Format umgewandelt.',
    },
  },
  {
    suffix: '_Mobile',
    explanation: {
      title: 'Mobiltelefon',
      description: 'Schweizer Mobilnummer im internationalen Format.',
      example: '+41 79 123 45 67',
    },
  },
  {
    suffix: '_PLZ',
    explanation: {
      title: 'Postleitzahl (Eltern)',
      description: '4-stellige Schweizer PLZ. Muss zur Ortschaft passen.',
      example: '8000',
    },
  },
  {
    suffix: '_AHV',
    explanation: {
      title: 'AHV-Nummer (Eltern)',
      description: '13-stellige Sozialversicherungsnummer mit Punkten, beginnend mit 756.',
      example: '756.1234.5678.97',
    },
  },
  {
    suffix: '_ID',
    explanation: {
      title: 'Eindeutige ID',
      description: 'Eindeutiger Identifikator. Bei Geschwistern muss derselbe Elternteil dieselbe ID haben.',
      hint: 'Bei "Inkonsistente ID" wird die ID einer früheren Zeile als Referenz verwendet.',
    },
  },
];

/** Erklärungen pro Fehler-Pattern (Message enthält ein Schlüsselwort) */
const MESSAGE_EXPLANATIONS: { match: (msg: string) => boolean; explanation: ErrorExplanation }[] = [
  {
    match: (m) => m.includes('Inkonsistente ID'),
    explanation: {
      title: 'Inkonsistente Eltern-ID',
      description:
        'Derselbe Elternteil (erkannt über AHV oder Name+Adresse) hat in unterschiedlichen Geschwister-Datensätzen verschiedene IDs. Diese werden in der Karte "Eltern-ID Konsolidierung" zusammengeführt.',
      hint: 'Empfehlung: Die ID der zuerst genannten Zeile übernehmen, damit Geschwister korrekt verknüpft werden.',
    },
  },
  {
    match: (m) => m.includes('Geschwister-Inkonsistenz'),
    explanation: {
      title: 'Geschwister-Inkonsistenz',
      description:
        'Geschwister mit denselben Eltern haben unterschiedliche Werte (z.B. PLZ, Ort, E-Mail). In der Regel sollte hier der Mehrheitswert gelten.',
      hint: 'Wird in der eigenen Karte "Geschwister-Inkonsistenz" gruppiert behoben.',
    },
  },
  {
    match: (m) => m.includes('PLZ') && m.includes('Ort'),
    explanation: {
      title: 'PLZ und Ort passen nicht zusammen',
      description: 'Die angegebene Postleitzahl gehört nicht zur eingetragenen Ortschaft (oder umgekehrt).',
      hint: 'Prüfe beide Felder gegen die offizielle PLZ-Liste der Schweizer Post.',
    },
  },
  {
    match: (m) => m.includes('Pflichtfeld') || m.toLowerCase().includes('darf nicht leer'),
    explanation: {
      title: 'Pflichtfeld leer',
      description: 'Dieses Feld muss zwingend ausgefüllt sein, damit der Import in PUPIL gelingt.',
    },
  },
  {
    match: (m) => m.includes('Duplikat') || m.includes('mehrfach'),
    explanation: {
      title: 'Doppelter Eintrag',
      description:
        'Dieser Wert kommt in mehreren Zeilen vor, sollte aber eindeutig sein. Häufig handelt es sich um denselben Schüler / dieselbe Schülerin in zwei Datensätzen.',
      hint: 'Wird in der Karte "Duplikate auflösen" gebündelt behoben.',
    },
  },
  {
    match: (m) => m.includes('Alter') || m.includes('Jahre'),
    explanation: {
      title: 'Alter ausserhalb Plausibilitätsbereich',
      description: 'Schüler:innen sollten zwischen 4 und 20 Jahre alt sein, Eltern älter als 18.',
      hint: 'Häufig liegt ein Tippfehler im Geburtsjahr vor (z.B. 1024 statt 2014).',
    },
  },
  {
    match: (m) => m.includes('Format') || m.includes('Muster'),
    explanation: {
      title: 'Formatfehler',
      description: 'Der Wert entspricht nicht dem erwarteten Muster für diese Spalte.',
    },
  },
];

/**
 * Liefert die beste verfügbare Erklärung für eine Spalte + optionale Fehlermeldung.
 * Reihenfolge der Auflösung:
 * 1. Spezifische Fehler-Message (z.B. "Inkonsistente ID")
 * 2. Exakte Spalte (z.B. "S_AHV")
 * 3. Spalten-Suffix (z.B. "_Email")
 * 4. Generischer Fallback
 */
export function getErrorExplanation(
  column: string,
  message?: string
): ErrorExplanation | null {
  // 1. Message-basierte Erklärung
  if (message) {
    const match = MESSAGE_EXPLANATIONS.find((m) => m.match(message));
    if (match) return match.explanation;
  }

  // 2. Exakte Spalte
  if (COLUMN_EXPLANATIONS[column]) {
    return COLUMN_EXPLANATIONS[column];
  }

  // 3. Suffix-Match (z.B. P_ERZ1_Email → _Email)
  const suffixMatch = SUFFIX_EXPLANATIONS.find((s) => column.endsWith(s.suffix));
  if (suffixMatch) return suffixMatch.explanation;

  return null;
}

/** Convenience-Wrapper für eine ValidationError */
export function explainError(error: ValidationError): ErrorExplanation | null {
  return getErrorExplanation(error.column, error.message);
}
