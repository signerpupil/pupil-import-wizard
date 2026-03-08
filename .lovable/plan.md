

## Analyse: Regeln & Muster-Erkennung — Inkonsistenzen und Verbesserungsvorschläge

### 1. Gefundene Inkonsistenzen (Code-Duplikation & abweichende Logik)

**A. Doppelte Implementierung: `localBulkCorrections.ts` vs `validationWorker.ts`**

Beide Dateien enthalten nahezu identische Format-Funktionen (`formatAHV`, `formatPhone`, `formatEmail`, `formatName`, `formatStreet`, `formatIBAN`, `formatGender`, `formatExcelDate`, `formatDateDE`, `trimWhitespace`) — aber mit subtilen Unterschieden:

| Funktion | localBulkCorrections.ts | validationWorker.ts |
|---|---|---|
| `formatSwissPhone` | Erkennt `0041`-Prefix (13 digits) | Fehlt — nur `41`/`0`/9-digit |
| `formatStreet` | Keine `weg`/`pl.` Abkürzungen | Erkennt `weg`→`weg`, `pl.`→`platz` |
| `formatEmail` | Keine Tippfehler-Korrektur | Korrigiert `gmial`, `gmai`, `gamil`, `hotmal`, `outllok`, `outlok` |

**→ Vorschlag: Shared Modul** erstellen (`src/lib/formatters.ts`) mit einer einzigen Quelle für alle Format-Funktionen, importiert von beiden Dateien.

**B. Spalten-Listen nicht synchron**

Die Pattern-Detection in `localBulkCorrections.ts` verwendet hartcodierte Spaltennamen, die teilweise nicht mit `importTypes.ts` übereinstimmen:

| Pattern | localBulkCorrections.ts | importTypes.ts (tatsächliche Spalten) |
|---|---|---|
| Phone | `P_ERZ1_Tel`, `P_ERZ2_Tel`, `S_Tel`, `S_Mobile` | `P_ERZ1_TelefonPrivat`, `P_ERZ1_TelefonGeschaeft`, `P_ERZ1_Mobil`, `S_Telefon`, `S_Mobil` |
| Email | `S_Email`, `P_ERZ1_Email`, `P_ERZ2_Email`, `P_Email` | `S_EMail`, `P_ERZ1_EMail`, `P_ERZ2_EMail` |
| Whitespace | Nur 12 Spalten | Fehlt: `S_Heimatort`, `S_Konfession`, `K_Name`, `K_Schulhaus_Name` |

**→ Kritischer Bug:** Die Muster für Telefon und Email werden in `localBulkCorrections.ts` **nie erkannt**, weil die Spaltennamen falsch sind (z.B. `P_ERZ1_Tel` statt `P_ERZ1_TelefonPrivat`, `S_Email` statt `S_EMail`).

**C. Geschlecht-Validierung inkonsistent**

- `fileParser.ts` (`isValidGender`): Akzeptiert `M, W, D, MÄNNLICH, WEIBLICH, DIVERS, MALE, FEMALE, DIVERSE` — aber NICHT `MANN, FRAU, MAENNLICH, HERR, H, F, X, ANDERES`
- `localBulkCorrections.ts` / `validationWorker.ts` (`formatGender`): Akzeptiert all diese Varianten
- **→ Problem:** Werte wie `FRAU`, `HERR`, `F` werden als Fehler validiert, aber die Muster-Erkennung findet sie nicht als "auto-fixbar", weil die Validation-Message nicht den erwarteten Keyword enthält.

**D. Datum-Validierung zu locker**

- `isValidDate` akzeptiert `DD/MM/YYYY` (Slash-Format) — aber es gibt keinen Auto-Fix dafür
- `isValidDate` akzeptiert Excel-Seriennummern als "gültig" → keine Fehlermeldung → kein Auto-Fix möglich
- **→ Vorschlag:** Excel-Seriennummern und Slash-Daten als Warnung flaggen mit Auto-Fix-Vorschlag

**E. PLZ-Validierung**

- `isValidPLZ` akzeptiert 4-5 Ziffern (CH + DE/AT) — aber der Auto-Fix `formatSwissPLZ` extrahiert nur 4 Ziffern
- **→ Vorschlag:** 5-stellige PLZ ebenfalls unterstützen (DE/AT-Kontexte)

---

### 2. Vorschläge für neue Muster & Analysen

**A. Fehlende Auto-Fixes (einfach umzusetzen):**

1. **Slash-Datum → Punkt-Datum:** `DD/MM/YYYY` → `DD.MM.YYYY` (Pattern existiert in Validierung, aber kein Fix)
2. **Ort-Normalisierung:** Gross/Kleinschreibung für `S_Ort`, `P_ERZ1_Ort`, `P_ERZ2_Ort` (gleiche Logik wie `formatName`)
3. **Geschlecht erweitert:** `isValidGender` sollte alle Varianten aus `formatGender` akzeptieren
4. **Konfession-Normalisierung:** Häufige Abkürzungen wie `ref.`, `röm.-kath.`, `kath.` → volle Form
5. **Heimatort-Normalisierung:** Trim + Proper Case

**B. Neue Analyse-Muster (mittlerer Aufwand):**

6. **Adress-Konsistenz:** Gleiche Person (via ID) mit unterschiedlicher Adresse in verschiedenen Zeilen erkennen
7. **Geschwister-Konsistenz:** Kinder mit gleichen Eltern-IDs aber unterschiedlichem `S_Ort` oder `S_PLZ` flaggen
8. **Email-Domain-Statistik:** Ungewöhnliche Domains hervorheben (z.B. `@test.com`, `@example.com`)
9. **Telefon-Duplikate:** Gleiche Telefonnummer bei verschiedenen Personen erkennen
10. **Leere Pflichtfelder-Übersicht:** Gruppierte Darstellung welche Pflichtfelder am häufigsten fehlen

**C. Erweiterte Analysen (höherer Aufwand):**

11. **PLZ↔Ort-Validierung:** Schweizer PLZ-Datenbank abgleichen (z.B. 8001 → Zürich)
12. **AHV-Prüfziffer:** Die 13. Ziffer der AHV-Nummer ist eine EAN-13 Prüfziffer — validierbar
13. **Altersplausibilität:** Geburtsdatum → Alter berechnen, warnen bei <4 oder >20 Jahren (Schüler) oder <18 (Eltern)

---

### 3. Konkreter Umsetzungsplan

**Phase 1 — Bug-Fixes (kritisch):**
- Spaltennamen in `localBulkCorrections.ts` korrigieren (Phone: `P_ERZ1_TelefonPrivat` etc., Email: `S_EMail` etc.)
- `isValidGender` erweitern um alle `formatGender`-Varianten
- `formatSwissPhone` in Worker um `0041`-Prefix ergänzen
- `formatEmail` im localBulkCorrections um Domain-Tippfehler-Korrektur ergänzen
- `formatStreet` in localBulkCorrections um `weg`/`platz`-Abkürzungen ergänzen

**Phase 2 — Neue Patterns:**
- Slash-Datum Auto-Fix hinzufügen
- Ort-Normalisierung (Proper Case) hinzufügen
- Whitespace-Check auf alle Text-Spalten erweitern

**Phase 3 — Shared Formatter Modul:**
- `src/lib/formatters.ts` erstellen mit allen Format-Funktionen
- Beide Consumer (`localBulkCorrections.ts`, `validationWorker.ts`) refactoren

**Phase 4 — Erweiterte Analysen:**
- AHV-Prüfziffer-Validierung
- Altersplausibilität
- Geschwister-Adress-Konsistenz

