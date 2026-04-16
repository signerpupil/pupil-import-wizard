
Der User möchte alle drei verbleibenden Vorschläge aus der letzten Liste umgesetzt haben:

1. Filter-Tabs in Step 3 mobile-sticky direkt unter der Summary
2. "Weiter zur Vorschau"-Button auf Mobile als sticky Bottom-Bar
3. Vitest-Tests für sessionStore mit fake-indexeddb

## Plan: Sticky Mobile Controls + sessionStore Tests

### 1. Filter-Tabs sticky unter Summary (`Step3Validation.tsx`)
- Die Filter-Tabs (Alle / Offen / Korrigiert) befinden sich aktuell direkt unter der Summary-Box
- Sticky-Container um Tabs legen mit `sticky top-[Höhe-der-Summary] z-20 md:static`
- Da die Summary-Höhe variabel ist, einfacher Ansatz: Summary + Filter-Tabs in einen gemeinsamen Sticky-Container packen, sodass beides als Block oben kleben bleibt
- `bg-background/95 backdrop-blur-sm` für sauberen Übergang beim Scrollen
- Auf `md:` zurück zu normalem Flow

### 2. "Weiter"-Button als sticky Bottom-Bar auf Mobile
- `NavigationButtons` (am Ende von `Step3Validation`) auf Mobile in fixierte Bottom-Bar verwandeln
- Optionen geprüft: Eigenen Wrapper im `Step3Validation` um die `NavigationButtons` legen mit `fixed bottom-0 left-0 right-0 z-30 bg-background border-t p-3 md:static md:border-0 md:p-0`
- Padding-Bottom am Hauptcontainer (`pb-20 md:pb-0`), damit Inhalte nicht verdeckt werden
- Nur in Step 3 anwenden (nicht global), da spezifisch gewünscht

### 3. Vitest-Tests für `sessionStore` mit `fake-indexeddb`
- Neue Datei: `src/test/sessionStore.test.ts`
- `fake-indexeddb` als devDependency installieren (über package.json — wird beim Build automatisch via `npm install` gezogen)
- Test-Setup: `import 'fake-indexeddb/auto'` am Anfang der Testdatei (kein globales Setup nötig, isoliert die Tests)
- Coverage:
  - `saveSession` + `loadSession` Roundtrip
  - `Date`-Objekte im `changeLog` werden korrekt serialisiert/deserialisiert
  - `clearSession` entfernt die gespeicherte Session
  - `getSessionMeta` liefert korrekte Metadaten (fileName, rowCount, changeLogCount, savedAt)
  - `loadSession` gibt `null` zurück wenn keine Session existiert
  - Überschreiben einer existierenden Session funktioniert

### Dateien
- `src/components/import/Step3Validation.tsx` — Sticky-Wrapper für Summary+Filter-Tabs erweitern, NavigationButtons in Mobile-Bottom-Bar wrappen, Padding-Bottom am Container
- `package.json` — `fake-indexeddb` als devDependency
- `src/test/sessionStore.test.ts` — neue Testdatei

### Risiken / Hinweise
- Sticky-Stacking: Die bereits existierende sticky Summary (`top-0 z-30`) und die neuen sticky Filter-Tabs müssen denselben Container teilen oder die Filter-Tabs brauchen eine berechnete `top`-Position. Einfachste Lösung: beide in **einen** sticky Container — kompakter und stabiler.
- Bottom-Bar darf den letzten Listeneintrag nicht verdecken → Padding-Bottom am Step-Container.
- `fake-indexeddb/auto` wird **nur** in dieser einen Testdatei importiert, damit andere Tests nicht beeinflusst werden.
