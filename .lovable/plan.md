

# Audit: Alle Automatisierungsregeln auf Risiken prüfen

## Identifizierte Probleme

### 1. KRITISCH: Sprach-Fuzzy-Matching zu aggressiv (Prefix + Levenshtein)
**Datei:** `src/lib/fileParser.ts`, Zeilen 670-701

Der Prefix-Match (Schritt 3) prüft zwar jetzt Längendifferenz ≤3, aber das ist für kurze Sprachen immer noch gefährlich:
- "Tamil" (5 Zeichen) könnte auf "Tibetisch" matchen (Prefix "tamil" vs "tibet" → nein, aber Levenshtein könnte greifen)
- `maxDistance()` erlaubt bis zu 3 Edits bei Wörtern >8 Zeichen → "Montenegrinisch" könnte auf "Montenegrisch" passen (ok), aber auch unerwartete Matches

**Fix:** Levenshtein-Fuzzy für Sprachen nur als **Vorschlag (ohne `correctedValue`)** ausgeben, nie automatisch korrigieren. Der Benutzer soll entscheiden.

### 2. KRITISCH: Nationalitäten-Fuzzy-Matching setzt `correctedValue` automatisch
**Datei:** `src/lib/fileParser.ts`, Zeilen 1227-1249

Der Levenshtein-Match bei Nationalitäten (Schritt 3+4 in `findNationalityCorrection`) setzt automatisch einen `correctedValue`. Bei echten Personendaten ist das riskant:
- "Mali" (4 Zeichen, maxDist=1) → könnte "Malawi" matchen (dist=2, passt nicht)
- "Niger" → "Nigeria" (dist=2, maxDist=2 bei len=5) → **falsche Zuordnung möglich!**
- "Kongo" → könnte "Kongo (Republik)" oder "Dem. Rep. Kongo" treffen

**Fix:** Levenshtein-basierte Nationalitäten-Korrekturen nur als Vorschlag ohne automatische Korrektur. Explizite Mappings (Schritt 1+2) sind sicher und bleiben.

### 3. MITTEL: E-Mail-Korrektur entfernt Umlaute ohne Rückfrage
**Datei:** `src/lib/formatters.ts`, Zeile 187

`formatEmail` entfernt Diakritika via NFD-Normalisierung. Eine E-Mail wie `müller@example.ch` wird zu `muller@example.ch`. Das kann korrekt sein (viele Server akzeptieren keine Umlaute), ist aber eine Annahme.

**Fix:** Akzeptabel — internationalisierte E-Mails mit Umlauten sind in der Schweiz selten, und die Korrektur wird dem Benutzer angezeigt.

### 4. MITTEL: Name-Formatierung (ALL CAPS → Proper Case)
**Datei:** `src/lib/formatters.ts`, Zeilen 243-250

`formatName` konvertiert ALL CAPS und all lowercase zu Proper Case. Das ist bei Doppelnamen mit Adelspräfixen korrekt implementiert (NOBLE_PREFIXES). Akzeptabel.

### 5. NIEDRIG: Gender-Mapping "H" → "M" und "F" → "W"
**Datei:** `src/lib/formatters.ts`, Zeilen 221-232

"H" (Herr) → "M" und "F" (Frau/Female) → "W" sind plausibel für CH-Kontext. Akzeptabel.

### 6. OK: Explizite Sprach-/Nationalitäten-Mappings
Die hunderten expliziten Mappings (z.B. Schweizerdeutsch→Deutsch, Tibet→China, USA→Vereinigte Staaten) sind korrekt und sicher — das sind bewusste 1:1 Zuordnungen.

---

## Geplante Änderungen

### Datei: `src/lib/fileParser.ts`

**Änderung 1: `findSimilarLanguage` — Levenshtein-Matches nicht mehr als `correctedValue` setzen**

In der `case 'language'` Logik (Zeile ~2330-2343): Wenn der Match via Levenshtein (nicht explizites Mapping) kam, soll `correctedValue` **nicht** gesetzt werden. Der Vorschlag bleibt in der Nachricht, aber der Benutzer muss manuell korrigieren.

Dazu: `findSimilarLanguage` gibt zusätzlich zurück, **wie** der Match gefunden wurde (explicit vs fuzzy). Bei fuzzy → kein automatischer `correctedValue`.

**Änderung 2: `findNationalityCorrection` — Levenshtein-Matches nicht automatisch korrigieren**

Gleiche Logik: Explizite Mappings und exakte Case-insensitive Matches werden automatisch korrigiert. Levenshtein-Fuzzy-Matches werden nur als Vorschlag angezeigt (kein `correctedValue`).

### Zusammenfassung
- Explizite Mappings (hunderte Einträge) → **bleiben automatisch** ✓
- Case-insensitive exakte Matches → **bleiben automatisch** ✓  
- Prefix-Match → **nur Vorschlag, keine Auto-Korrektur** (Risiko zu hoch)
- Levenshtein-Fuzzy → **nur Vorschlag, keine Auto-Korrektur** (Risiko zu hoch)
- Alle anderen Regeln (AHV, Datum, Telefon, PLZ, Geschlecht) → **bleiben wie sie sind** (deterministisch und sicher)

