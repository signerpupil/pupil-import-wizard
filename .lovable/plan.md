

## PUPIL-Export Anleitung fuer LPStep2Teachers

Erstelle eine aufklappbare Anleitung fuer den PUPIL-Personen-Export, analog zur bestehenden `LOInstructionGuide`.

### Aenderungen

**1. Screenshot kopieren**
- `user-uploads://2026-03-03-06-47-56.png` → `src/assets/pupil-anleitung-personen-export.png`

**2. Neue Komponente `src/components/import/lp-zuweisung/PUPILInstructionGuide.tsx`**

Gleiche Struktur wie `LOInstructionGuide`, mit zwei Phasen und einem Screenshot:

**Phase A — Navigieren:**
1. Im linken Menü **Master Data** öffnen
2. **Personen (SuS/GV/LP/SV/MA/SB)** anklicken
3. **Personen** auswählen

**Phase B — Filtern und exportieren:**
4. Alle LP-Rollen im Rollen-Filter wählen (Gesamtschulleitung, Schulleitung, Lehrperson, Assistenzperson, Hausaufgabenhilfe, Heilpädagogisches Personal, Therapie)
5. Prüfen ob die Spalten **Nachname**, **Vorname** und **Schlüssel** eingeblendet sind — falls nicht, via **Spaltenkonfiguration** einblenden
6. **Aktion für gefilterte Personen** → **Export (aktuelle Spalten)**

Screenshot darunter mit Lightbox (identisches Pattern wie LOInstructionGuide).

- localStorage-Key: `pupil-guide-open`, standardmässig eingeklappt
- Nummern-Badges mit Kreisen wie bei LOInstructionGuide (1-6 durchnummeriert)

**3. `LPStep2Teachers.tsx` anpassen**

Die neue `<PUPILInstructionGuide />` in die erste Card ("Personen-PUPIL Datei hochladen") einbauen, zwischen der Beschreibung und dem File-Upload-Input.

