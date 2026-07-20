## Ziel

1. In der Karte „Eltern-ID Konsolidierung" klarer zeigen, dass die IDs in „Aktueller Stand" **Eltern-IDs** sind (nicht Kinder-IDs) — im Header **und** pro Zeile.
2. Die Filter-Buttons für die Zuverlässigkeit neu aufteilen: getrennte Buttons für **Hohe**, **Mittlere** und **Tiefe** Zuverlässigkeit — kein kombinierter „Mittel + Hoch"-Button mehr. Die zugrunde liegende Prüf-/Kategorisierungslogik bleibt unverändert.

## Datei

`src/components/import/ParentConsolidationCard.tsx` (reine UI-Änderung, keine Logikänderung, keine Änderung an `fileParser.ts`).

## Änderungen im Detail

### 1. Vergleichsansicht klarer beschriften

Im aufgeklappten Detailblock (`Einträge im Vergleich`, Zeilen ~650–732):

- **Karten-Header „Aktueller Stand"** ergänzen um Elternnamen und Erläuterung:
  - Zeile darunter: `Elternperson: {group.parentName} — Eltern-ID gemäss jeder Kinderzeile`
- **Zeilenlabel** pro Kind umformulieren:
  - alt: `Lena Gaertner: SCZID2FEBLIL6S`
  - neu: `Eltern-ID in Zeile von Lena Gaertner (Z. 10): SCZID2FEBLIL6S`
  - Referenzzeile analog: `Referenz – Eltern-ID in Zeile von Lena Gaertner (Z. 10): SCZID2FEBLIL6S`
- Kleine Info-Zeile am oberen Rand der linken Karte:
  - `Die ID zeigt, welche Eltern-ID aktuell in der jeweiligen Kinderzeile steht.`
- **Karten-Header „Nach Konsolidierung"** ergänzen um:
  - Untertitel: `Alle Kinderzeilen von {parentName} erhalten dieselbe Eltern-ID.`
- Der bereits vorhandene Chip „Einheitliche ID: …" behält seine Position; darüber neu ein Hinweis:
  - `Neuer Wert in Spalte {group.column} für alle betroffenen Kinderzeilen:`
- Klarstellendes Label an jedem ID-Chip (`px-1.5 py-0.5 … font-mono`): Prefix-Text „Eltern-ID" links vom Chip nur einmal pro Karte (im Header), damit die Zeilen kompakt bleiben.

### 2. Filter-Buttons für Zuverlässigkeit

Im Button-Block (Zeilen ~320–358):

- **Button „Mittel + Hoch" entfernen.**
- Übrige Buttons bleiben: `Alle` / `Hohe Zuverlässigkeit` / `Mittlere Zuverlässigkeit` / `Tiefe Zuverlässigkeit`.
- Default-Filter (`useState`, Zeile 132) von `'medium_high'` auf `'all'` umstellen, damit beim Öffnen alle drei Kategorien sichtbar sind.
- Filter-Logik in `filteredGroups` (Zeilen 147–156): Zweig `medium_high` entfernen; `all|high|medium|low` bleiben unverändert.
- Farbliche Kennzeichnung bleibt gleich (Grün / Amber / Rot); jeder Button zeigt weiterhin seine Anzahl.

### 3. Nicht angepasst

- `matchReason`-Strings und Kategorisierung in `src/lib/fileParser.ts` bleiben unverändert (Hohe = AHV, Mittlere = Name+Strasse / Name+Telefon / Name+Elternpaar / Fuzzy, Tiefe = Name+Vorname).
- Keine Änderungen an `ParentIdInconsistencyGroup`-Typ, keine neuen Felder erforderlich; `group.parentName`, `group.column` und `group.correctId` reichen für die Textausgabe.

## Ergebnis

- „Einträge im Vergleich" macht durch Elternname im Header **und** durch das Präfix „Eltern-ID in Zeile von …" pro Zeile eindeutig sichtbar, dass es sich um die in der jeweiligen Kinderzeile eingetragene Eltern-ID handelt.
- Die drei Zuverlässigkeitsstufen sind einzeln filterbar; der irreführende Kombi-Button entfällt.
