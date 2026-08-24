# Plan: Kontakt & Onboarding auf der Startseite

## Ziel
Auf der Startseite (`Step0TypeSelect`) werden zwei neue, prominent platzierte Bereiche ergänzt:
1. **Login Onboarding** – Direkteinstieg zum Kundenportal `pipy.app`, oberhalb der bestehenden Bereiche.
2. **Kontakt zur Projektleitung Pupil** – Button, der vor der Weiterleitung abfragt, ob ein kostenpflichtiges Begleitungsangebot bereits angenommen wurde, und dann auf die passende Buchungsseite verweist.

## Entscheidungen aus dem Klärungsgespräch
- Onboarding kommt als **ganz oben platzierte, durchgehende Karte/Banner**.
- Kontakt öffnet einen **Ja/Nein-Dialog** vor der Weiterleitung.
- Onboarding öffnet in einem **neuen Tab**.
- Farbakzente werden vom Agenten im bestehenden Designsystem gewählt.

## Geplante Änderungen

### 1. Design-Tokens erweitern
- `src/index.css`: Zwei neue semantische Farbvariablen ergänzen:
  - `--pupil-onboarding` (Cyan/Teal-Ton) + `--pupil-onboarding-foreground`
  - `--pupil-contact` (Warmes Amber/Orange) + `--pupil-contact-foreground`
- `tailwind.config.ts`: Die beiden Farben unter `colors.pupil` als `onboarding` / `contact` mit `-foreground` anlegen.

### 2. Neue Sektionen in `src/components/import/Step0TypeSelect.tsx`

#### Login Onboarding (oberste Sektion)
- Vollbreite Card/Banner direkt unter dem Hero-Titel.
- Icon: `Rocket` oder `LogIn`.
- Titel: z. B. "Login & Onboarding"
- Beschreibung: Hinweis, dass hier das Kundenportal für die eigene Schule geöffnet wird.
- Button/Card-Klick öffnet `https://www.pipy.app/pupil/onboarding` in einem neuen Tab.
- Visuell abgegrenzt mit `border-pupil-onboarding/30 bg-pupil-onboarding/[0.06]`.

#### Kontakt zur Projektleitung Pupil
- Eigene Sektion (z. B. unterhalb der Import-Kacheln oder als eigenständiger Block).
- Card mit Icon `Mail`/`Calendar` und Button "Termin buchen".
- Klick öffnet einen shadcn-Dialog mit folgendem Inhalt:
  - Erklärungstext, dass die Selbstmigration dokumentiert ist und ein persönliches Gespräch kostenpflichtig ist, sofern kein Begleitungsangebot vorliegt.
  - Frage: "Haben Sie vorab ein Angebot für 'Begleitung im Projekt' von Sales erhalten und angenommen?"
  - Zwei Buttons:
    - **Ja** → Weiterleitung zu `https://bookings.cloud.microsoft/bookwithme/user/8f3fb96c1e4947168ab6012279648721%407education.com?anonymous&ismsaljsauthenabled`
    - **Nein** → Weiterleitung zu `https://calendly.com/sebastian-mombers-7education/30min`
  - Vor dem Öffnen wird in einem Alert o. ä. angezeigt: "Sie werden nun zu [Microsoft Bookings / Calendly] weitergeleitet. Der Link öffnet sich in einem neuen Tab."
- Visuell abgegrenzt mit `border-pupil-contact/30 bg-pupil-contact/[0.06]`.

### 3. Interaktion / State
- Neuer lokaler State `contactDialogOpen: boolean`.
- Beim Klick auf eine der beiden Dialog-Optionen wird `window.open(url, '_blank', 'noopener,noreferrer')` ausgeführt und der Dialog geschlossen.
- Keine Backend- oder Speicher-Änderungen nötig.

### 4. Icons
- `lucide-react` Icons ergänzen (z. B. `Rocket`, `LogIn`, `Mail`, `Calendar`, `ExternalLink`).

## Akzeptanzkriterien
- [ ] Login-Onboarding-Karte ist oberste Sektion auf der Startseite und öffnet `pipy.app/pupil/onboarding` in einem neuen Tab.
- [ ] Kontakt-Karte öffnet einen Dialog mit Ja/Nein-Frage.
- [ ] Bei "Ja" erfolgt Weiterleitung zur Microsoft-Bookings-URL; bei "Nein" zu Calendly.
- [ ] Vor der Weiterleitung wird der Zielort und das Öffnen im neuen Tab angezeigt.
- [ ] Neue Bereiche sind farblich vom Rest der Seite abgegrenzt und verwenden keine hartkodierten Farben.
- [ ] Build läuft fehlerfrei durch.
