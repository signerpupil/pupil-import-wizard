## Ziel
Den FAQ-Block „Bis wann kann ich LehrerOffice noch nutzen?" vollständig in die Wissensbasis des PUPIL@AG Assistenten aufnehmen.

## Ist-Zustand (geprüft)
In beiden System-Prompts (`supabase/functions/assistant-claude/index.ts`, `public/pupil-assistent.html`) steht bereits:
- Ablösung LehrerOffice ab Schuljahr 2028/29
- Gestaffelte Einführung 2026/27 bis Ende 2027/28
- „LehrerOffice läuft parallel bis Ende SJ 2027/28"

Nicht enthalten:
- LehrerOffice wird von CMI weiterbetrieben, aber nicht mehr weiterentwickelt
- Kanton finanziert die Nutzung bis Ende Schuljahr 2027/28
- Neue Lösung ist verpflichtend für alle Schulen
- Ab Schuljahr 2028/29 finanziert der Kanton nur noch die neue Schulverwaltungslösung

## Änderung
Neuer FAQ-Eintrag in beiden Prompts, direkt beim bestehenden LehrerOffice-Satz:

```
FAQ „Bis wann kann ich LehrerOffice noch nutzen?":
- LehrerOffice wird von der Firma CMI weiterhin betrieben, aber nicht mehr weiterentwickelt.
- Die Nutzung wird vom Kanton bis Ende Schuljahr 2027/28 wie bisher finanziert.
- In den Schuljahren 2026/27 und 2027/28 erfolgt die gestaffelte Einführung der neuen kantonalen
  Schulverwaltungslösung, welche LehrerOffice ersetzt und von allen Schulen verpflichtend
  genutzt werden muss.
- Ab Schuljahr 2028/29 finanziert der Kanton nur noch die Nutzung der neuen Schulverwaltungslösung.
```

Im HTML-Widget als ASCII-Variante (ohne Umlaute) analog zum bestehenden Stil.

## Technisch
- `supabase/functions/assistant-claude/index.ts`: Block nach Zeile 36 einfügen, Function neu deployen.
- `public/pupil-assistent.html`: Block im FAQ-Teil des Prompt-Strings ergänzen.

## Test
Frage „Bis wann kann ich LehrerOffice noch nutzen?" in beiden Oberflächen stellen – erwartet werden alle vier Punkte.
