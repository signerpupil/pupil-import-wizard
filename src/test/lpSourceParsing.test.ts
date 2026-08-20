import { describe, it, expect } from 'vitest';
import { extractPersons, extractClasses, extractClassesFromStammdaten, buildPupilClassName } from '@/lib/lpSourceParsing';

describe('extractPersons', () => {
  it('erkennt den PUPIL-Personenexport', () => {
    const res = extractPersons(['Nachname', 'Vorname', 'Schlüssel'], [
      { Nachname: 'Weber', Vorname: 'Marco', 'Schlüssel': 'PUP1' },
    ]);
    expect(res).toEqual([{ nachname: 'Weber', vorname: 'Marco', schluessel: 'PUP1' }]);
  });

  it('erkennt den bereinigten LP-Export (Name/LID)', () => {
    const res = extractPersons(['LID', 'Name', 'Vorname'], [
      { LID: 'PUP2', Name: 'Muster', Vorname: 'Anna' },
      { LID: 'PUP2', Name: 'Muster', Vorname: 'Anna' },
      { LID: '', Name: 'Leer', Vorname: 'X' },
    ]);
    expect(res).toEqual([{ nachname: 'Muster', vorname: 'Anna', schluessel: 'PUP2' }]);
  });

  it('gibt null zurück bei unbekanntem Format', () => {
    expect(extractPersons(['Foo', 'Bar'], [])).toBeNull();
  });
});

describe('Klassen', () => {
  it('setzt Klassennamen aus K_Name und K_Schulhaus_Name zusammen', () => {
    expect(buildPupilClassName('B1a', 'Oberstufenzentrum Test')).toBe('B1a Oberstufenzentrum Test');
    expect(buildPupilClassName('B1a', '')).toBe('B1a');
  });

  it('leitet eindeutige Klassen aus dem SuS-Export ab', () => {
    const res = extractClassesFromStammdaten([
      { K_Name: 'B1a', K_Schulhaus_Name: 'OSZ Test' },
      { K_Name: 'B1a', K_Schulhaus_Name: 'OSZ Test' },
      { K_Name: 'A2b', K_Schulhaus_Name: 'OSZ Test' },
    ]);
    expect(res.map(c => c.klassenname)).toEqual(['A2b OSZ Test', 'B1a OSZ Test']);
  });

  it('erkennt den PUPIL-Klassenexport', () => {
    const res = extractClasses(['Klassenname', 'Klassenlehrpersonen'], [
      { Klassenname: 'KG 1 Br a Primarschule Brunegg', Klassenlehrpersonen: 'Meier, Huber' },
    ]);
    expect(res?.[0].klassenlehrpersonen).toEqual(['Meier', 'Huber']);
  });

  it('erkennt den bereinigten SuS-Export', () => {
    const res = extractClasses(['S_ID', 'K_Name', 'K_Schulhaus_Name'], [
      { S_ID: '1', K_Name: 'B1a', K_Schulhaus_Name: 'OSZ Test' },
    ]);
    expect(res?.[0].klassenname).toBe('B1a OSZ Test');
  });
});
