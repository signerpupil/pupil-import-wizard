# Neue BISTA-Sprachliste übernehmen

Die bisherige Sprachliste (51 Sammelbegriffe wie „Afrikanische Sprachen", „Westasiatische Sprachen", „nicht definiert") wird vollständig durch die neu gelieferte Liste mit 91 Einträgen inkl. Code ersetzt. Die neue Liste ist deutlich feiner (z. B. Tigrinya, Dari, Farsi, Somali, Kurdisch, Tamil als eigene Werte) und enthält neue Sammelkategorien („Andere afrikanische Sprachen", „Andere Sprachen (Pidginsprachen, …)").

## Was sich ändert

1. **Gültige Werte**: Die neue Liste wird zur einzigen Referenz für die Validierung von Mutter- und Umgangssprache. Werte, die nur in der alten Liste standen, gelten künftig als ungültig und werden über Mapping korrigiert.
2. **Auswahlliste**: Die Dropdowns in der Fehlerkorrektur (Schritt 3, Fehlertabelle und Korrektur-Modal) zeigen die neue Liste, alphabetisch sortiert. Der BISTA-Code wird zusätzlich als Hinweis pro Eintrag angezeigt.
3. **Auto-Korrekturen**: Die bestehende Mapping-Tabelle (mehrere hundert Einträge) wird auf die neuen Zielwerte umgestellt, u. a.:
   - Schweizerdeutsch/Mundart/Dialekt → **Schweizerdeutsch** (neu eigener Code 1101, nicht mehr „Deutsch")
   - Tigrinya, Somali, Amharisch, Lingala, Suaheli → eigenständige Werte statt „Afrikanische Sprachen"; übrige afrikanische Sprachen (Wolof, Yoruba, Twi …) → „Andere afrikanische Sprachen"
   - Farsi, Persisch, Dari, Kurdisch, Paschto, Aramäisch, Hebräisch, Armenisch → eigene Werte; Rest → „Andere westasiatische Sprachen"
   - Hindi, Urdu, Bengalisch, Malayalam, Nepali, Pandschabi, Romani, Singhalesisch, Tamil → eigene Werte; Telugu/Gujarati/Marathi/Kannada → „Andere indoarische und drawidische Sprachen"
   - Chinesisch/Mandarin/Kantonesisch → Chinesisch; Vietnamesisch, Thai, Japanisch, Koreanisch, Mongolisch, Khmer, Laotisch, Tagalog, Indonesisch, Tibetisch → eigene Werte; Rest → „Andere ostasiatische Sprachen"
   - Kreolisch/Pidgin/Gebärdensprache und bisher „nicht definiert" → „Andere Sprachen (Pidginsprachen, Kreolsprachen, Gebärdensprachen …)"
   - Estnisch, Lettisch, Litauisch, Isländisch, Karelisch, Lappisch → eigene Werte statt Sammelbegriffe
   - Katalanisch, Baskisch, Galizisch → eigene Werte; Irisch/Gälisch → „Andere europäische Sprachen"
   - „Serbo-Kroatisch" → Serbisch; alte Sammelbegriffe („Übrige osteuropäische Sprachen" etc.) → „Andere europäische Sprachen"
4. **Mapping-Export**: Der Excel-Export der Sprach-Mappings erhält eine zusätzliche Spalte „Code" und nutzt die neue Liste.

## Technische Umsetzung

- `src/lib/fileParser.ts`: `VALID_BISTA_LANGUAGES` durch die neue Liste ersetzen; zusätzlich `BISTA_LANGUAGE_CODES` (Bezeichnung → Code) exportieren. `LANGUAGE_AUTO_CORRECTIONS` durchgängig auf neue Zielwerte umschreiben und die alten Bezeichnungen als Migrations-Mapping ergänzen, damit bereits bereinigte Dateien weiterhin funktionieren. `BISTA_NORMALIZED` (Fuzzy-/Tippfehlersuche) bleibt und profitiert automatisch.
- `src/components/import/ErrorTable.tsx` und `Step3Validation.tsx`: sortierte Optionsliste aus der neuen Menge, Code als sekundärer Text im Auswahl-Eintrag.
- `src/lib/exportMappings.ts`: Code-Spalte in den Sheets „BISTA Sprachen (gültig)" und „Sprach-Mappings".
- Tests: `src/test/parameterized.test.ts` und `newRules.test.ts` prüfen, dass jeder Mapping-Zielwert in der neuen Liste existiert; erwartete Werte für Schweizerdeutsch/Tigrinya/Dari/Tamil anpassen, danach Testlauf.
- Projekt-Memory zur BISTA-Sprachvalidierung auf die neue Liste aktualisieren (inkl. Hinweis, dass die alte Liste ungültig ist).

## Hinweis

„Tamilisch"/„Tamil" (beide 4321) sowie „Chinesisch" (433) und „Chinesische Sprachen" (4331) sind beide in der Liste enthalten und werden beide als gültig akzeptiert – ohne automatische Vereinheitlichung, sofern nicht gewünscht.