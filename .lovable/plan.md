

# Regelanalyse: Duplikate, Verbesserungen & fehlende Regeln

## Aktuelle Regel-Übersicht

Das System hat **drei Validierungsebenen**: Feld-Validierung (`fileParser.ts`), Muster-Erkennung (`localBulkCorrections.ts`), und Worker-Analyse (`validationWorker.ts`).

---

## 1. Duplikate & Redundanzen

### Worker ↔ localBulkCorrections — doppelte Muster-Erkennung
Der `validationWorker.ts` (Zeile 37-391) enthält eine komplette `analyzeErrors()`-Funktion, die **identische Muster** wie `localBulkCorrections.ts` erkennt: AHV, Phone, Email, PLZ, Gender, Name, Street, Ort, IBAN, Date, Whitespace, Duplicate, ID-Conflict. Die Worker-Version wird aber **nirgends genutzt** — die UI verwendet ausschliesslich `analyzeErrorsLocally()` aus `localBulkCorrections.ts`.

**Empfehlung**: Die gesamte `analyzeErrors()`-Funktion im Worker (Zeilen 37-391) kann entfernt werden. Ebenso der `analyze`-Handler und der `applyCorrection`-Handler im Worker, da Korrekturen über `applyLocalCorrection()` laufen. Der Worker sollte nur noch `validate` machen.

### Worker `validateField` ↔ `fileParser.validateFieldType`
Beide Dateien enthalten separate Feld-Validierungslogik. Der Worker wird nur via `useValidationWorker` aufgerufen, aber `Index.tsx` nutzt `validateData` aus `fileParser.ts` direkt. Der Worker-Pfad scheint ungenutzt.

---

## 2. Fehlende Regeln — basierend auf realen Datenkonstellationen

### A. Plausibilitätsprüfungen (neue Regeln)

| Regel | Beschreibung | Typ |
|---|---|---|
| **S_ID = 0 Erkennung** | `test-id-conflicts.csv` zeigt S_ID=0 für mehrere verschiedene Personen. Wert `0` ist ein Platzhalter und sollte als