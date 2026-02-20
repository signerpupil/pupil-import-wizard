
## Problem-Analyse

Das UI zeigt "1 betroffene Kinder" obwohl Block A 3 Kinder hat. Das Problem liegt darin, dass die CSV-Zeilen für die Geschwister-Blöcke A-D zwar hinzugefügt wurden, aber:

1. **Spalten-Alignment**: Die Geschwister-Zeilen könnten falsch ausgerichtet sein (falsche Spaltenanzahl), sodass P_ERZ1_AHV nicht korrekt erkannt wird
2. **Fehlende "All-children"-Darstellung**: Die `affectedRows` enthält in der Konsolidierungs-Logik alle Zeilen der Gruppe – aber nur wenn alle Zeilen denselben `groupKey` ergeben (AHV, Name+Strasse, oder Elternpaar)

Die Lösung: Die CSV grundlegend neu strukturieren mit **realistischen Grossfamilien** (2–6 Kinder) mit konsequent konsistenten Spaltenwerten, damit die Gruppierung sicher funktioniert.

## Was wird geändert

### Datei: `public/test-stammdaten.csv`

Die bestehenden Geschwister-Blöcke A-D (Zeilen 116–124) werden durch deutlich realistischere und vollständigere Familien ersetzt. Gleichzeitig werden die Blöcke E-K (Zeilen 125–144) beibehalten.

---

### Neue Familien-Szenarien

#### Familie Bauer – 5 Kinder, Vater AHV-Inkonsistenz (hohe Zuverlässigkeit)

Vater Hans Bauer, AHV `756.2222.3333.01`, wird bei 5 Kindern mit 3 verschiedenen IDs erfasst:
- Kind 1 (Klasse 1A): P_ERZ1_ID = `70001` → korrekte ID (Referenz)
- Kind 2 (Klasse 2B): P_ERZ1_ID = `70002` → Fehler
- Kind 3 (Klasse 3A): P_ERZ1_ID = `70001` → korrekt (bereits gleiche ID)
- Kind 4 (Klasse 4C): P_ERZ1_ID = `70003` → Fehler
- Kind 5 (Klasse 5B): P_ERZ1_ID = `70002` → Fehler

Ergebnis: 4 Kinder in `affectedRows`, 3 davon mit Transformation → zeigt gemischtes Bild (korrekt + inkorrekt)

#### Familie Ritter – 4 Kinder, BEIDE Eltern mit ID-Inkonsistenz (AHV)

Vater Thomas Ritter, AHV `756.3333.4444.01`, Mutter Sandra Ritter, AHV `756.3333.4444.02`:
- Kind 1 (2A): ERZ1_ID = `71001`, ERZ2_ID = `72001` (Referenz)
- Kind 2 (3B): ERZ1_ID = `71002`, ERZ2_ID = `72001` → ERZ1 falsch
- Kind 3 (5A): ERZ1_ID = `71001`, ERZ2_ID = `72002` → ERZ2 falsch
- Kind 4 (6B): ERZ1_ID = `71003`, ERZ2_ID = `72003` → beide falsch

Ergebnis: 2 separate Konsolidierungen (eine für ERZ1, eine für ERZ2), je mit 4 Kindern in affectedRows

#### Familie Kunz – 3 Kinder, Name+Strasse-Matching (mittlere Zuverlässigkeit)

Kein AHV. Vater Peter Kunz, Seestrasse 12, 8002 Zürich:
- Kind 1 (1B): ERZ1_ID = `73001` (Referenz)
- Kind 2 (3C): ERZ1_ID = `73002` → Fehler
- Kind 3 (6A): ERZ1_ID = `73003` → Fehler

Ergebnis: 3 Kinder in affectedRows (Name+Strasse-Matching)

#### Familie Egli – 6 Kinder, Name-only-Matching (tiefe Zuverlässigkeit, Grossfamilie)

Kein AHV, keine Strasse. Eltern: Franz und Monika Egli:
- Kind 1 (1C): ERZ1_ID = `74001`, ERZ2_ID = `75001` (Referenz)
- Kind 2 (2A): ERZ1_ID = `74001`, ERZ2_ID = `75002` → ERZ2 falsch
- Kind 3 (3B): ERZ1_ID = `74002`, ERZ2_ID = `75001` → ERZ1 falsch
- Kind 4 (4A): ERZ1_ID = `74002`, ERZ2_ID = `75002` → beide falsch
- Kind 5 (5B): ERZ1_ID = `74001`, ERZ2_ID = `75001` → korrekt
- Kind 6 (6A): ERZ1_ID = `74003`, ERZ2_ID = `75003` → beide falsch

Ergebnis: 6 Kinder in affectedRows → maximale Sichtbarkeit im UI

#### Familie Weber-Brun – 2 Kinder, Namenswechsel der Mutter nach Heirat

- Kind 1 (2C): ERZ1 = "Weber Anna", ID `76001`, Strasse "Heiratsgasse 5"
- Kind 2 (4B): ERZ1 = "Weber-Brun Anna", ID `76001` (gleiche ID!), Strasse "Heiratsgasse 5" → Namenswechsel-Warnung (nicht ID-Fehler)

#### Familie Trenner – 3 Kinder, Eltern getrennt, Vater bei allen 3 unterschiedlich erfasst

Vater Karl Trenner, kein AHV – Adresse hat sich nach Scheidung geändert:
- Kind 1 (3A): ERZ1 = "Trenner Karl", Strasse "Familienweg 1" → ID `77001`
- Kind 2 (5C): ERZ1 = "Trenner Karl", Strasse "Einzimmer 99" → ID `77002` (neue Adresse, nur name-only)
- Kind 3 (6C): ERZ1 = "Trenner Karl", Strasse "Einzimmer 99" → ID `77002` (korrekt)

---

### Warum bisherige Blöcke A-D nicht funktionierten

Die Blöcke A-D hatten ein CSV-Alignment-Problem: Die ERZ2-Felder für Kind 2 und Kind 3 hatten nicht dieselbe Spaltenanzahl wie die übrigen Zeilen, was dazu führte, dass der CSV-Parser die Felder falsch zuordnete und die `groupKey`-Berechnung für mehrere Kinder nicht funktionierte.

Die neuen Zeilen werden mit vollständig ausgefüllten Spalten (alle 35 Felder) geschrieben, inkl. expliziter leerer Felder für optionale Spalten.

---

### Technische Umsetzung

**Datei: `public/test-stammdaten.csv`**

- Zeilen 116–124 (Blöcke A-D): Vollständig ersetzen durch die 6 neuen Familien
- Zeilen 125–144 (Blöcke E-K): Beibehalten
- Sicherstellen: Jede Zeile hat **exakt dieselbe Spaltenanzahl** wie der Header (via Semikolon-Zählung)

**Vorgehensweise:**

Für jede Familienzeile werden **alle Pflichtfelder** explizit gesetzt:
```
Quelle;Schuljahr;S_AHV;S_ID;S_Name;S_Vorname;S_Geschlecht;S_Geburtsdatum;S_Strasse;S_PLZ;S_Ort;
P_ERZ1_ID;P_ERZ1_AHV;P_ERZ1_Name;P_ERZ1_Vorname;P_ERZ1_Strasse;P_ERZ1_PLZ;P_ERZ1_Ort;P_ERZ1_TelefonPrivat;P_ERZ1_Mobil;
P_ERZ2_ID;P_ERZ2_AHV;P_ERZ2_Name;P_ERZ2_Vorname;P_ERZ2_Strasse;P_ERZ2_PLZ;P_ERZ2_Ort;P_ERZ2_TelefonPrivat;P_ERZ2_Mobil;
K_Name;LP_AHV;LP_ID;LP_Name;LP_Vorname
```
Leere optionale Felder werden als `;;` explizit leer gelassen, nicht weggelassen.

**Erwartetes Ergebnis im UI:**

| Familie | Spalte | Kinder in affectedRows | Zuverlässigkeit |
|---|---|---|---|
| Bauer | P_ERZ1_ID | 5 | Hoch (AHV) |
| Ritter ERZ1 | P_ERZ1_ID | 4 | Hoch (AHV) |
| Ritter ERZ2 | P_ERZ2_ID | 4 | Hoch (AHV) |
| Kunz | P_ERZ1_ID | 3 | Mittel (Name+Str.) |
| Egli ERZ1 | P_ERZ1_ID | 6 | Tief (name-only) |
| Egli ERZ2 | P_ERZ2_ID | 6 | Tief (name-only) |
| Weber-Brun | P_ERZ1_Name | 2 | Namenswechsel |
| Trenner | P_ERZ1_ID | 3 | Tief (name-only) |
