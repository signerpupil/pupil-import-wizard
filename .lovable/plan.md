

# PUPIL-Klassen-Abgleich im LP-Zuweisungs-Wizard

## Kontext

Aktuell verwendet der LP-Export die Klassennamen direkt aus dem LehrerOffice-Paste (z.B. "KG 1 Br a"). Die PUPIL-Klassen-Datei enthaelt die vollstaendigen Klassennamen (z.B. "KG 1 Br a Primarschule Brunegg"). Der Export soll die PUPIL-Klassennamen verwenden, damit die Zuweisungen korrekt importiert werden koennen.

## PUPIL-Klassen-Datei Struktur

| Klassenname | Klassenbeschreibung | Klassenlehrpersonen |
|---|---|---|
| B 1 Wi a Bezirksschule | B 1 Wi a Bezirksschule | Simon Jenzer |
| KG 1 Br a Primarschule Brunegg | KG 1 Br a Primarschule Brunegg | Claudia Imholz, Sabine Brunner |

Der **Klassenname** ist der relevante Wert. Die LO-Klasse "KG 1 Br a" ist ein Prefix des PUPIL-Klassennamens "KG 1 Br a Primarschule Brunegg".

## Aenderungen

### 1. Neuer Typ `PupilClass` in `src/types/importTypes.ts`

```typescript
export interface PupilClass {
  klassenname: string;  // Voller PUPIL-Klassenname
}
```

### 2. `LPImportWizard.tsx` -- Neuer State fuer PUPIL-Klassen

- Neuer State `pupilClasses: PupilClass[]` hinzufuegen
- An Step 2 (oder als neuen Upload in Step 2) weitergeben

### 3. `LPStep2Teachers.tsx` -- Zweiter File-Upload fuer PUPIL-Klassen

- Zweite Upload-Card fuer die PUPIL-Klassen-Datei (xlsx) hinzufuegen
- Parsing: Spalte "Klassenname" auslesen
- Matching-Logik: Fuer jede LO-Klasse pruefen, ob ein PUPIL-Klassenname mit diesem Kuerzel beginnt (normalisiert, Leerzeichen-tolerant)
- Anzeige: Badge mit Anzahl gematchter / nicht gematchter Klassen
- Die gematchten PUPIL-Klassennamen in die Assignments uebernehmen (statt der LO-Kuerzel)

### 4. `LPStep3Export.tsx` -- Export mit PUPIL-Klassennamen

- Keine Code-Aenderung noetig, da die Assignments bereits den PUPIL-Klassennamen enthalten werden
- Die "Klasse"-Spalte im Export zeigt dann automatisch den vollen PUPIL-Namen

### Matching-Algorithmus

```text
LO-Klasse:    "KG 1 Br a"
PUPIL-Klasse: "KG 1 Br a Primarschule Brunegg"

Regel: PUPIL-Klassenname.startsWith(LO-Klasse)
       (case-insensitive, trimmed)
```

Falls kein Match gefunden wird, bleibt der LO-Klassenname erhalten und wird im Export orange markiert.

