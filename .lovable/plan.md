
## Analyse: Was fehlt – neue Szenarien und Mustererkennung

### Ist-Zustand der Testdatei (124 Zeilen)

Die bestehenden Testblöcke decken ab:
- Grunddaten (50 Schüler)
- Schüler-Duplikate (S_AHV, S_ID)
- Eltern-ID-Inkonsistenz via AHV / Name+Adresse / Elternpaar
- Adress-/Umzugsszenarien
- Namenswechsel (ERZ1/ERZ2)
- Diakritik-Normalisierung (Muller/Müller, Schutz/Schütz, Bjorn/Björn)
- Formatfehler (AHV, Datum, Geschlecht, E-Mail, Telefon, PLZ, Pflichtfelder)
- Geschwister-Blöcke A-D (neu hinzugefügt)

### Was fehlt – neue realistische Szenarien

---

#### Block E – Telefonnummern in verschiedenen Rohformaten (Auto-Fix via Muster)

**Szenario:** Schulsoftware exportiert Telefonnummern uneinheitlich. Realistische Formate die in der Praxis vorkommen:
- `0791234567` (ohne Leerzeichen, ohne +)
- `+41791234567` (kein Leerzeichen)
- `004179 123 45 67` (0041-Präfix)
- `079 123 4567` (falsche Gruppierung)
- `41791234567` (ohne +, 11 Ziffern)

Erwartetes Ergebnis: `phone_format` Muster erkannt, Auto-Fix auf `079 123 45 67` oder `+41 79 123 45 67`

**Neue Zeilen:** 3–4 Kinder mit Eltern die verschiedene Telefon-Rohformate haben

---

#### Block F – Namen und Adressen in GROSSBUCHSTABEN (Auto-Fix via Muster)

**Szenario:** Ältere Schulsoftware-Exporte schreiben alle Namen und Adressen in Grossbuchstaben (z.B. aus Datenbank-Exporten aus AS/400-Systemen). Der Name-Format-Fix soll diese in korrekte Schreibweise umwandeln.

Beispiele:
- `MÜLLER` → `Müller`
- `HAUPTSTRASSE 12` → `Hauptstrasse 12`
- `VON DER MÜHLE` → `Von Der Mühle` (mehrteilige Namen)
- `MARIA-THERESA` → `Maria-Theresa` (Bindestrich-Namen)

Erwartetes Ergebnis: `name_format` und `street_format` Muster erkannt, Auto-Fix verfügbar

**Neue Zeilen:** 2–3 Kinder mit Elternnamen und Adressen komplett in Grossbuchstaben

---

#### Block G – E-Mail-Adressen mit typischen Tippfehlern (Auto-Fix via Muster)

**Szenario:** Eltern geben E-Mail-Adressen mit häufigen Fehlern an:
- `mueller@gmial.com` → `@gmail.com` (gmial-Tippfehler)
- `anna,weber@bluewin.ch` → Komma statt Punkt
- `info @schulhaus.ch` → Leerzeichen im E-Mail
- `HANS.MUSTER@GMAIL.COM` → Grossbuchstaben

Erwartetes Ergebnis: `email_format` Muster erkannt, Auto-Fix verfügbar

---

#### Block H – Excel-Seriennummern als Datum (Auto-Fix via Muster)

**Szenario:** Excel exportiert Datumsfelder als Seriennummern wenn die Zelle als Zahl formatiert ist. Dies passiert regelmässig bei Copy-Paste aus Excel-Tabellen.

Beispiele (Excel-Seriennummer für das jeweilige Datum):
- `45291` → `06.01.2024` (Januar 2024)
- `44927` → `08.01.2023` 
- `42005` → `15.01.2015`

Erwartetes Ergebnis: `date_format` / `excel_date` Muster erkannt, Auto-Fix verfügbar

---

#### Block I – Getrennt lebende Eltern: Kind bei ERZ1, dasselbe Elternteil auch ERZ2 eines anderen Kindes

**Szenario:** Scheidung/Trennung – Vater ist bei Kind A der ERZ1, bei Kind B (anderem Kind aus neuer Partnerschaft) ebenfalls der ERZ1, aber mit einer anderen ID. Gleichzeitig hat er keine AHV hinterlegt, aber Name+Strasse stimmt überein. Realistisches Problem: nach Scheidung zieht der Vater aus → Adresse unterscheidet sich.

Dieses Szenario testet: **Name-only-Matching** + **ID-Diskrepanz ohne Adressübereinstimmung** = mittlere/tiefe Zuverlässigkeit

---

#### Block J – Klassenwechsel: Gleicher Schüler wird in zwei Halbjahren importiert (neue Klasse)

**Szenario:** Am Schuljahresende wechseln Schüler die Klasse. Eine Schule importiert die Stammdaten zweimal: einmal mit `K_Name = 4A` und einmal mit `K_Name = 5A`. Der Schüler hat dieselbe `S_AHV` und `S_ID`. Das ist kein Fehler (kein Duplikat), aber er testet ob die Duplikat-Erkennung zwischen Klassen-Zeilen korrekt differenziert (echte Duplikate vs. Klassenwechsel-Duplikate).

---

#### Block K – Schüler ohne Erziehungsberechtigte (alleinerziehend, externe Betreuung)

**Szenario:** Kein ERZ2, ERZ1 ist Beistand/Behörde. Fehlende Pflichtfelder bei ERZ1 die optional sind aber in der Praxis oft fehlen:
- `P_ERZ1_Strasse` leer
- `P_ERZ1_PLZ` leer  
- `P_ERZ1_TelefonPrivat` leer

Testet: Keine falschen Pflichtfeld-Fehler bei optionalen Feldern die leer sind

---

### Neue Mustererkennung

Folgende Erkennungen existieren noch **nicht** und sollten ergänzt werden:

#### Neue Muster im `validationWorker.ts` / `localBulkCorrections.ts`

| Muster | Beschreibung | Erkennung |
|---|---|---|
| **Leerzeichen-Trimming** | Werte mit führenden/nachfolgenden Leerzeichen (` Meier` statt `Meier`) | Auto-Fix: `trim()` |
| **Doppelte Leerzeichen** | `Hans  Muster` statt `Hans Muster` | Auto-Fix: normalisieren |
| **Datumsformat DD-MM-YYYY** | Bindestriche statt Punkte (`15-03-2014` → `15.03.2014`) | Auto-Fix: Ersetzen |
| **Datumsformat YYYY-MM-DD** | ISO-Format (`2014-03-15` → `15.03.2014`) | Auto-Fix: Umkehren |
| **Telefon mit 0041-Prefix** | `0041791234567` → `+41 79 123 45 67` | Auto-Fix |
| **Name in Kleinbuchstaben** | `müller` → `Müller` (isAllLower) | Auto-Fix (bereits partial) |

Die fehlenden Muster sind vor allem **Datum-Format-Varianten** (Bindestriche, ISO-Format) und **Leerzeichen-Bereinigung** – beides sehr häufig in realen Importen.

---

### Technische Umsetzung

#### 1. Testdatei `public/test-stammdaten.csv`

Neue Zeilen werden nach Zeile 124 angehängt. Insgesamt ca. 20–25 neue Zeilen für die Blöcke E–K:

**Block E (Telefon-Rohdaten, 4 Zeilen):**
- S_ID 10210–10213
- Verschiedene Telefon-Rohformate für P_ERZ1_TelefonPrivat: `0791234567`, `+41791234567`, `0041791234567`, `41791234567`

**Block F (GROSSBUCHSTABEN, 3 Zeilen):**
- S_ID 10220–10222
- P_ERZ1_Name: `GROSSMANN`, P_ERZ1_Vorname: `HANS`, P_ERZ1_Strasse: `HAUPTSTRASSE 15`

**Block G (E-Mail-Tippfehler, 3 Zeilen):**
- S_ID 10230–10232
- P_ERZ1_Mobil: `musteratgmial.com` (gmial), `info @test.ch` (Leerzeichen), `ANNA@GMAIL.COM` (Grossbuchstaben)

**Block H (Excel-Datum, 3 Zeilen):**
- S_ID 10240–10242
- S_Geburtsdatum: `45291`, `44927`, `42005` (Excel-Seriennummern)

**Block I (Getrennt lebend, 2 Zeilen):**
- S_ID 10250–10251
- Zwei Kinder mit demselben Vater (Name+Strasse gleich, ID verschieden, keine AHV)
- Vater hat bei Kind 2 neue Adresse → name-only matching testen

**Block J (Klassenwechsel-Duplikat, 2 Zeilen):**
- S_ID 10260, gleiche S_AHV, S_ID
- Kind mit Klasse `3A` und nochmal mit Klasse `4A` → echtes Duplikat wegen S_ID-Gleichheit
- Prüft ob S_ID-Duplikat korrekt erkannt wird (anders als Klassenwechsel)

**Block K (Fehlende Erziehungsberechtigte, 2 Zeilen):**
- S_ID 10270–10271
- ERZ1 = Beistand mit minimalen Daten, kein ERZ2
- Teste keine falschen Pflichtfeld-Warnungen

#### 2. Neue Mustererkennung in `src/workers/validationWorker.ts`

Neue Funktion `formatDateDE` für Datum-Format-Varianten:
```ts
function formatDateDE(value: string): string | null {
  // DD-MM-YYYY → DD.MM.YYYY
  const dashMatch = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) return `${dashMatch[1]}.${dashMatch[2]}.${dashMatch[3]}`;
  
  // YYYY-MM-DD → DD.MM.YYYY (ISO)
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
  
  return null;
}
```

Neuer Pattern-Zweig in `analyzeErrors` für Datum-Varianten:
- Erkennt DD-MM-YYYY und ISO-Format
- `canAutoFix: true`
- `suggestedAction: 'Format: DD.MM.YYYY'`

Neuer Pattern-Zweig für Leerzeichen-Trimming:
- Erkennt Werte mit `value !== value.trim()`
- Betrifft alle Textspalten (Name, Strasse, Ort)
- `canAutoFix: true`

#### 3. Neue Mustererkennung in `src/lib/localBulkCorrections.ts`

Neue Funktion `formatDateDE` (parallel zu Worker):
```ts
export function formatDateDE(value: string): string | null {
  const dashMatch = value.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) return `${dashMatch[1]}.${dashMatch[2]}.${dashMatch[3]}`;
  const isoMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[3]}.${isoMatch[2]}.${isoMatch[1]}`;
  return null;
}

export function trimWhitespace(value: string): string | null {
  const trimmed = value.trim().replace(/\s{2,}/g, ' ');
  return trimmed !== value ? trimmed : null;
}
```

Neue `detectDateFormatPattern`-Funktion für DD-MM-YYYY und ISO-Daten.
Neue `detectWhitespacePattern`-Funktion für alle Text-Spalten.

Beide werden in `analyzeErrorsLocally` eingehängt.

#### 4. Apply-Correction im Worker ergänzen

In `applyCorrection` zwei neue `case`-Zweige:
```ts
case 'date_de_format':
  newValue = formatDateDE(String(value));
  break;
case 'whitespace_trim':
  newValue = trimWhitespace(String(value));
  break;
```

---

### Zusammenfassung der Änderungen

| Datei | Änderung |
|---|---|
| `public/test-stammdaten.csv` | +~25 neue Zeilen für Blöcke E–K |
| `src/workers/validationWorker.ts` | +`formatDateDE`, +`trimWhitespace`, +2 neue Pattern-Zweige in `analyzeErrors`, +2 neue `case` in `applyCorrection` |
| `src/lib/localBulkCorrections.ts` | +`formatDateDE`, +`trimWhitespace`, +`detectDateFormatPattern`, +`detectWhitespacePattern`, beide in `analyzeErrorsLocally` eingehängt |

Keine Änderungen an UI-Komponenten nötig – die neuen Muster werden automatisch über die bestehende Pattern-Display-Logik in Step 3 angezeigt.
