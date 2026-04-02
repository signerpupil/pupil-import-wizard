

# Analyse: "Tiefe Zuverlässigkeit" bei Familie Tippkemper

## Befund

Die Datei enthält 2 Kinder (Jonathan, Noah) mit denselben Eltern (Bernd & Fabienne Tippkemper), aber **unterschiedlichen Hausnummern** (Kirchweg 28 vs. 26).

### Warum "tiefe Zuverlässigkeit"?

Die Erkennung durchläuft 3 Strategien:

1. **AHV-Match** → Keine Eltern-AHV vorhanden → übersprungen
2. **Name + Strasse** → Kirchweg **28** ≠ Kirchweg **26** → übersprungen  
3. **Name-only mit Disambiguierung** → Greift, weil der andere Elternteil (Fabienne) in beiden Zeilen übereinstimmt → **Match gefunden, aber mit Label "Tiefe Zuverlässigkeit"**

Das Problem: Obwohl die Disambiguierung **erfolgreich** bestätigt hat, dass es dieselbe Person ist (via übereinstimmenden zweiten Elternteil), bleibt das Label pauschal auf "tiefe Zuverlässigkeit". Das ist irreführend.

### Zusätzlich: Telefon-Bug

Die Telefonnummern sind identisch, werden aber nicht erkannt:
- Row 1: `004179 734 87 05` → normalisiert: `00417973487​05`
- Row 2: `079 734 87 05` → normalisiert: `07973487​05`

`normalizePhone` entfernt nur Nicht-Ziffern, normalisiert aber nicht den Schweizer Ländercode `0041` → `0`.

## Lösung (2 Teile)

### 1. Telefon-Normalisierung: Schweizer Ländercode

**Datei: `src/lib/fileParser.ts`** — Funktion `normalizePhone`

```typescript
function normalizePhone(value: string): string {
  let digits = value.replace(/\D/g, '');
  // Normalize Swiss country code: 0041... → 0...
  if (digits.startsWith('0041')) {
    digits = '0' + digits.slice(4);
  }
  // Also handle +41 (already stripped to 41...)
  if (digits.startsWith('41') && digits.length >= 11) {
    digits = '0' + digits.slice(2);
  }
  return digits;
}
```

### 2. Disambiguierung → Zuverlässigkeit hochstufen

**Datei: `src/lib/fileParser.ts`** — Pass 3 (Zeile ~1608-1622)

Wenn die Disambiguierung via Telefon oder anderen Elternteil erfolgreich ist, das Confidence-Label anheben:

- **Telefon-Match** → `"Name + Telefonnummer – Mittlere Zuverlässigkeit"`
- **Anderer Elternteil stimmt überein** → `"Name + Elternpaar – Mittlere Zuverlässigkeit"`

Dazu zwei neue Einträge in `STRATEGY_LABELS`:
```typescript
name_phone: {
  label: 'Name + Telefonnummer',
  reliability: 'Mittlere Zuverlässigkeit',
},
name_pair: {
  label: 'Name + Elternpaar',
  reliability: 'Mittlere Zuverlässigkeit',
},
```

Die Error-Message und Severity werden entsprechend angepasst — statt immer `'warning'` und `'name_only'` wird der spezifische Disambiguierungsgrund verwendet.

### Ergebnis

```text
Vorher:  "Tiefe Zuverlässigkeit" (name_only) — Nutzer unsicher
Nachher: "Mittlere Zuverlässigkeit" (name_pair) — Elternpaar bestätigt
```

Telefonnummern mit `0041`-Prefix werden zusätzlich korrekt erkannt, was auch bei anderen Familien mit gemischtem Format greift.

