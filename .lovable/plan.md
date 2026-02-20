
# Testdatei + Dokumentations-Nachführung

## Ausgangslage

Für Tests und Dokumentationskorrektur wurden folgende Punkte festgestellt:

1. **Dokumentations-Lücke**: Der neue Abschnitt "Namenswechsel-Erkennung" fehlt vollständig in `src/pages/Documentation.tsx`. Das Wort "Namenswechsel" kommt dort kein einziges Mal vor – obwohl die Funktion `checkParentNameChanges()` seit der letzten Implementierung aktiv ist.

2. **Testdatei**: Es gibt keine CSV-Testdatei, die alle Regeln abdeckt. Eine solche Datei muss erstellt werden.

---

## Teil 1: Testdatei erstellen

Die CSV-Datei wird unter `public/test-stammdaten.csv` abgelegt, damit sie direkt über den Browser heruntergeladen werden kann.

### Struktur: ~200 Zeilen, ~75 Familien

Die Zeilen folgen dem echten Spaltenformat aus `schuelerColumns` (src/types/importTypes.ts).

### Abgedeckte Szenarien (mit Familiennummern)

```text
GRUPPE A – Normale, fehlerfreie Familien (~25 Familien)
  Fam 1–25: Normale, vollständige Datensätze ohne Fehler
  → Basis für saubere Importe

GRUPPE B – Duplikat-Szenarien (S_AHV, S_ID) (~5 Schüler)
  Fam 26: S_AHV erscheint zweimal (zwei Zeilen selber Schüler)
  Fam 27: S_ID erscheint zweimal
  Fam 28: L_KL1_AHV doppelt (gleiche KL-Person in zwei Klassen)

GRUPPE C – Eltern-ID Konsistenz (AHV-Strategie) (~5 Familien)
  Fam 29–30: Gleiche P_ERZ1_AHV aber andere P_ERZ1_ID  → Fehler
  Fam 31–32: Gleiche P_ERZ1_AHV und gleiche ID → kein Fehler

GRUPPE D – Eltern-ID Konsistenz (Name+Strasse) (~5 Familien)
  Fam 33–34: Gleicher Name+Strasse, andere ID → Fehler
  Fam 35: Gleicher Name+Strasse, gleiche ID → kein Fehler

GRUPPE E – Eltern-ID Konsistenz (Name-only Elternpaar) (~5 Familien)
  Fam 36–37: Beide Elternteile stimmen überein, andere ID → Warnung
  Fam 38: Nur ein Elternteil stimmt überein, keine Telefon-/EB-Übereinstimmung → keine Warnung

GRUPPE F – Eltern-ID (Adresse-Disambiguation) (~4 Familien)
  Fam 39: Gleicher Name, andere Adresse, gleiche Telefon → Warnung (umgezogen)
  Fam 40: Gleicher Name, andere Adresse, gleicher anderer EB → Warnung
  Fam 41: Gleicher Name, andere Adresse, kein Telefon-/EB-Match → keine Warnung

GRUPPE G – Namenswechsel-Erkennung (~8 Familien)
  Fam 42: Marina Ianuzi → Marina Ianuzi-Tadic (Bindestrich-Ergänzung)
  Fam 43: Doris Brunner → Doris Fliege-Brunner (umgekehrter Doppelname)
  Fam 44: Heidi Müller → Heidi Meier (vollständiger Namenswechsel, Fuzzy ≥65%)
  Fam 45: Anna Schmidt → Anna Roth (Schmidt ↔ Roth: <65% → keine Warnung)
  Fam 46: Peter Meier → Peter Maier (Fuzzy-Match auf kurzen Namen)
  Fam 47: Namenswechsel ERZ2
  Fam 48–49: Familien mit eindeutig verschiedenen Namen → kein Match

GRUPPE H – Diakritische Korrekturen (~5 Familien)
  Fam 50–51: Müller vs. Muller, Schütz vs. Schutz → Auto-Korrektur
  Fam 52: Björn vs. Bjorn

GRUPPE I – Format-Fehler (~10 Familien / Schüler)
  Fam 53–54: Ungültiges AHV-Format (z.B. 7561234567890 ohne Punkte)
  Fam 55: Ungültiges Geburtsdatum (z.B. 15-03-2010)
  Fam 56: Ungültiges Geschlecht (z.B. "Herr" → sollte M sein)
  Fam 57: Ungültige E-Mail (z.B. "musteratgmail.com")
  Fam 58: Ungültige Telefonnummer (z.B. "0041 79 123")
  Fam 59–60: PLZ mit 3 Stellen

GRUPPE J – Pflichtfelder fehlen (~3 Schüler)
  Fam 61: S_AHV fehlt
  Fam 62: S_Geschlecht fehlt
  Fam 63: K_Name fehlt
```

### Spalten in der CSV

Alle Pflichtfelder + die wichtigsten optionalen Felder:
`Q_System; Q_Schuljahr; S_AHV; S_ID; S_Name; S_Vorname; S_Geschlecht; S_Geburtsdatum; S_Strasse; S_PLZ; S_Ort; P_ERZ1_ID; P_ERZ1_AHV; P_ERZ1_Name; P_ERZ1_Vorname; P_ERZ1_Strasse; P_ERZ1_PLZ; P_ERZ1_Ort; P_ERZ1_TelefonPrivat; P_ERZ1_Mobil; P_ERZ2_ID; P_ERZ2_AHV; P_ERZ2_Name; P_ERZ2_Vorname; P_ERZ2_Strasse; P_ERZ2_PLZ; P_ERZ2_Ort; P_ERZ2_TelefonPrivat; K_Name; L_KL1_AHV; L_KL1_ID; L_KL1_Name; L_KL1_Vorname`

---

## Teil 2: Dokumentation nachführen

In `src/pages/Documentation.tsx` wird nach dem bestehenden Block "5. Diakritische Namenskorrektur" ein neuer Block **"6. Namenswechsel-Erkennung"** eingefügt. Der bestehende Block "6. Automatische Sammelkorrekturen" wird zu **"7. Automatische Sammelkorrekturen"** umnummeriert.

### Inhalt des neuen Blocks

- Erklärung: Eltern mit gleichem Vornamen, aber unterschiedlichem Nachnamen werden verglichen – keine AHV-Nummer nötig
- Gruppierungslogik: nach Schüler-Kontext + Vorname
- Vier erkannte Muster mit je einem Beispiel:
  - Bindestrich-Ergänzung: Marina Ianuzi → Marina Ianuzi-Tadic
  - Umgekehrter Doppelname: Doris Brunner → Doris Fliege-Brunner
  - Vollständiger Namenswechsel (≥65% Ähnlichkeit): Heidi Müller → Heidi Meier
  - Unsicherer Fuzzy-Match (≥55% Ähnlichkeit, kurze Namen): Peter Maier → Peter Mayer
- Hinweis: Nur Warnungen, keine automatischen Korrekturen; manuelle Prüfung erforderlich
- Betroffene Felder: P_ERZ1_Name, P_ERZ1_Vorname, P_ERZ2_Name, P_ERZ2_Vorname

---

## Betroffene Dateien

| Datei | Änderung |
|---|---|
| `public/test-stammdaten.csv` | Neu erstellen – ~200 Zeilen, alle Regeln abdeckend |
| `src/pages/Documentation.tsx` | Neuer Block "Namenswechsel-Erkennung" hinzufügen, Block 6 → 7 |

---

## Technische Details

### CSV-Format
- Semikolon-getrennt (`;`)
- UTF-8 Encoding mit Umlauten (ä, ö, ü, é etc.)
- AHV-Nummern im Format `756.XXXX.XXXX.XX` (gültige Prüfsumme nicht zwingend, aber strukturell korrekt)
- Geburtsdaten im Format `DD.MM.YYYY`
- IDs als Ganzzahlen (4–6-stellig)

### Warum `public/`?
Die Datei wird unter `public/test-stammdaten.csv` abgelegt, damit:
- Benutzer sie direkt über `https://[URL]/test-stammdaten.csv` herunterladen können
- Sie nicht in das React-Bundle kompiliert wird
- Sie schnell durch eine neue Version ersetzt werden kann
