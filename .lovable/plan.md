

# Fix: Doppelte Eltern-ID Fehler (4 statt 2 Kinder)

## Befund

Die Datei hat 2 Kinder (Mason Tyler & Liam Kofel) mit denselben Eltern (Kevin & Svenja Kofel). Die Adressen unterscheiden sich leicht ("Im Steinler 215" vs "Im Steindler 215").

### Warum 4 statt 2?

Es werden **doppelte Fehler** generiert, weil zwei Erkennungs-Passes unabhängig voneinander feuern:

- **Pass 2** (Elternpaar-Matching): Erkennt "Kevin Kofel & Svenja Kofel" als Paar → generiert 2 Fehler (P_ERZ1_ID + P_ERZ2_ID für Zeile 2)
- **Pass 3** (Einzeleltern-Matching mit Disambiguierung): Erkennt "Kevin Kofel" und "Svenja Kofel" einzeln → generiert nochmal 2 Fehler für dieselben Felder

Pass 2 fügt die erkannten Zeilen **nicht** in `resolvedByHigherStrategy` ein, daher überspringt Pass 3 sie nicht.

In der UI werden dann 3 Gruppen angezeigt:
1. "Kevin Kofel & Svenja Kofel" (Pass 2) — 2 Einträge  
2. "Kevin Kofel" (Pass 3) — 1 Eintrag  
3. "Svenja Kofel" (Pass 3) — 1 Eintrag  

→ **4 Kinder-Einträge** statt der erwarteten 2.

## Lösung

### Datei: `src/lib/fileParser.ts` — Pass 2 (Zeile ~1517-1528)

Nach dem Generieren eines Fehlers in Pass 2 den `rowFieldKey` zu `resolvedByHigherStrategy` hinzufügen. Das blockiert Pass 3 für dasselbe `row:field`-Paar.

```typescript
// Nach errorSet.add(...) und errors.push(...):
resolvedByHigherStrategy.add(rowFieldKey);
```

Zusätzlich sollte Pass 2 eine eigene Strategie `name_pair` verwenden (statt `name_only`), da das Elternpaar-Matching zuverlässiger ist als reine Namensübereinstimmung. Die neue Strategie `name_pair` wurde bereits im vorherigen Schritt zu `STRATEGY_LABELS` hinzugefügt.

### Ergebnis

```text
Vorher:  4 Fehler → 3 Gruppen → 4 "Kinder" angezeigt
Nachher: 2 Fehler → 1 Gruppe → 2 Kinder (korrekt)
```

