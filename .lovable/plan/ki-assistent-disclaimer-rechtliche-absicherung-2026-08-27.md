# KI-Assistent: Disclaimer & rechtliche Absicherung

## Ausgangslage
- `/assistent` und das Floating-Widget (`public/pupil-assistent.html`) zeigen bereits einen **Datenschutzhinweis** zu Anthropic/Claude.
- Es existiert ein Footer-Hinweis: "Interne Anwendung. Keine Zugangsdaten oder Passwörter in der Wissensbasis."
- Es gibt **keine** explizite Kennzeichnung, dass Antworten KI-generiert und möglicherweise fehlerhaft sind.
- `DatenschutzDialog.tsx` und `ImpressumDialog.tsx` sind vorhanden, erwähnen den Assistenten aber nicht.

## Ziel
Den KI-Assistenten transparent, DSG/DSGVO-konform und haftungsrechtlich abgesichert kennzeichnen, ohne die UX unnötig zu belasten.

## Geplante Änderungen

### 1. KI-Disclaimer im Chat-UI
- Unterhalb der Chat-Eingabe oder oberhalb der Nachrichtenliste einen dauerhaften, kompakten Hinweis einblenden:
  - "Antworten werden von einer KI generiert."
  - "Antworten können Fehler enthalten oder veraltet sein."
  - "Bitte verifizieren Sie kritische Angaben (Termine, Links, Rechtsauskünfte) in der offiziellen Dokumentation oder beim Support."
- Im Floating-Widget und auf `/assistent` identisch umsetzen.

### 2. Erweiterter Datenschutzhinweis
- Bestehenden Datenschutzhinweis in `AssistentPage.tsx` und `pupil-assistent.html` ergänzen um:
  - Verarbeitung durch Anthropic (Claude) bleibt bestehen.
  - Hinweis, dass Eingaben zur Modellverbesserung **nicht** verwendet werden (sofern zutreffend; andernfalls prüfen).
  - Empfehlung, keine personenbezogenen Daten einzugeben.
- Optional: Hinweis auf Löschfrist/Verarbeitungsdauer der Anfragen bei Anthropic.

### 3. Quellenkennzeichnung verstärken
- Source-Badges bleiben erhalten.
- Zusätzlich jede Assistentenantwort mit einem kleinen "KI-generiert"-Label versehen (dezent, nicht störend).
- Bei Live-Doku-Antworten: Link zur Quelle direkt anbieten.

### 4. Eskalationspfad zu menschlichem Support
- Im Disclaimer einen direkten Kontakt/Link zum Support ergänzen:
  - E-Mail: `pupil@ag.ch`
  - Telefon: `062 835 26 03` (2nd Level Support BKS)
- Bei Rechtsfragen oder verbindlichen Auskünften explizit auf BKS/Beratung verweisen.

### 5. Datenschutzerklärung ergänzen
- `DatenschutzDialog.tsx` um einen Abschnitt "KI-Assistent / Chat-Funktion" erweitern:
  - Verarbeitung der Chat-Eingaben durch Anthropic Claude.
  - Zweck: Hilfe und Orientierung zum Onboarding.
  - Rechtsgrundlage: berechtigtes Interesse / ggf. Einwilligung.
  - Hinweis auf Nicht-Verwendung personenbezogener Daten.

### 6. Nutzungsbedingungen / Haftungsausschluss prüfen
- `ImpressumDialog.tsx` prüfen, ob der allgemeine Haftungsausschluss ausreicht.
- Falls nötig, ergänzend einen kurzen Assistenten-Haftungsausschluss: "Für verbindliche Auskünfte ist der offizielle Support/BKS zuständig."

### 7. Optionale Zustimmung vor erster Nutzung
- Statt nur "Verstanden"-Button: Bei erstem Öffnen einen zweizeiligen Dialog mit Checkbox:
  - "Ich verstehe, dass die Antworten KI-generiert sind und Fehler enthalten können."
  - "Ich gebe keine personenbezogenen Daten ein."
- Speicherung der Zustimmung im `localStorage`.

### 8. Offline-Widget angleichen
- `public/pupil-assistent.html` erhält denselben Disclaimer und dieselbe Quellen-/Support-Logik wie `/assistent`.

## Dateien, die geändert werden
- `src/pages/AssistentPage.tsx`
- `public/pupil-assistent.html`
- `src/components/legal/DatenschutzDialog.tsx`
- `src/components/legal/ImpressumDialog.tsx` (optional)
- `src/components/assistant/FloatingAssistant.tsx` (nur Vererbung des Disclaimer-Frames)

## Nicht im Scope
- Keine Änderung der Edge-Function-Logik oder des System-Prompts.
- Keine neue Backend-Datenbank-Tabelle für Einwilligungen.
- Keine rechtliche Beratung; bei Unsicherheit Empfehlung an Rechtsabteilung/BKS.

## Akzeptanzkriterien
- [ ] Auf `/assistent` und im Widget ist ein KI-Disclaimer sichtbar.
- [ ] Datenschutzhinweis erwähnt Anthropic-Verarbeitung und Verzicht auf personenbezogene Daten.
- [ ] Datenschutzdialog enthält einen Abschnitt zum KI-Assistenten.
- [ ] Support-Kontakt ist aus dem Chat erreichbar/ersichtlich.
- [ ] Build bleibt fehlerfrei.
