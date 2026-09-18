# 7 Education Design – Vorschau-Seite

Ziel: Sie sehen den neuen Look als separate Vorschau, ohne dass sich an der bestehenden Seite etwas ändert. Erst wenn Sie zustimmen, wird der Stil auf die ganze Seite übertragen.

## Stil aus Ihrer Vorlage

Aus der Präsentation übernommen:

- Sehr viel Weiss, klare Ränder, ruhige Flächen
- Fast-Schwarz `#0D0D0D` als Textfarbe
- Magenta `#F43175` als Hauptakzent (passt zu Edi)
- Zusatzfarben für die Bereichs-Kacheln: Blau `#072AC8`, Türkis `#21C2A2`, Orange `#FF8C42`, Gelb `#FFD313`
- Schrift: die Vorlage nutzt «PP Mori» (lizenzpflichtig). Ersatz mit sehr ähnlichem Charakter: «Switzer» – kostenlos einbindbar.
- Logo «seven education» oben links, dezente Seitenzahl/Fusszeile

## Was gebaut wird

Eine neue Vorschau-Adresse `/style-vorschau`, die die Startseite im neuen Stil zeigt:

- Kopfzeile: weiss, Logo links, feine Trennlinie statt Schatten
- Titelbereich: grosse, eng gesetzte Überschrift «PUPIL@AG – Schritt für Schritt», kurzer Untertitel, Magenta-Detail
- Bereich «Datenaufbereitung»: Kacheln mit dünnem Rahmen, viel Innenabstand, farbigem Punkt statt Farbverlauf
- Bereich «Datenimporte»: gleiche Kachel-Sprache, Icons schlicht in Schwarz, Hover mit Magenta-Rahmen
- Bereich «Schulung & Ressourcen» sowie «Login & Onboarding» im gleichen Raster
- Edi-Button unten rechts wie heute (Magenta passt bereits)

Die Kacheln sind in der Vorschau anklickbar wie gewohnt, damit Sie den Eindruck im Betrieb prüfen können.

## Danach

Nach Ihrer Freigabe: Farbtokens und Schrift zentral umstellen, damit alle Schritte, Dialoge und Anleitungen automatisch im neuen Stil erscheinen. Ohne Freigabe bleibt alles wie heute.

## Technisch

- Neue Route `/style-vorschau` in `src/App.tsx`, neue Seite `src/pages/StylePreviewPage.tsx` mit einer Kopie der Startseiten-Struktur (`Step0TypeSelect`-Inhalte), rein visuell angepasst
- Alternative Tokens in einer eigenen CSS-Klasse (`.seven-theme`) in `index.css` – bestehende Tokens bleiben unverändert
- Schrift «Switzer» via Fontshare-CSS, nur innerhalb der Vorschau-Klasse aktiv
- Keine Änderung an Logik, Importablauf, Edge Functions oder Daten
