## Ziel
Die 4 bestehenden Starter-Chips auf `/assistent` durch die 6 neuen Beispielfragen ersetzen.

## Änderung
`src/pages/AssistentPage.tsx` – Konstante `QUICK_CHIPS`:

```ts
const QUICK_CHIPS = [
  "Wann muss ich SSO einrichten?",
  "Wie erstelle ich dynamische Gruppen?",
  "Was ist das Projekt Koneksa?",
  "Welche Schulen sind in Slot 1?",
  "Wie funktionieren Absenzen in PUPIL?",
  "Wann ist der Kick-Off für Slot 1?",
];
```

## Hinweis
Der Chip-Container nutzt bereits `flex flex-wrap gap-2`, 6 Chips werden also automatisch mehrzeilig sauber umbrochen. Kein Layout-Fix nötig.
