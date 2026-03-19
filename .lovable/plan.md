

# Nationalitäts-Mappings erweitern

## Übersicht
Die bestehende `NATIONALITY_AUTO_CORRECTIONS` hat ~135 Einträge. Die `VALID_NATIONALITIES` Liste umfasst ~200 Länder. Es fehlen noch viele alternative Bezeichnungen, ISO-Codes, historische Namen und Tippfehler-Varianten.

## Änderungen

### Datei: `src/lib/fileParser.ts`

Erweiterung von `NATIONALITY_AUTO_CORRECTIONS` um ca. **120 neue Einträge** in folgenden Kategorien:

**1. Fehlende ISO-2-Codes (~40)**
AL, BA, BG, BR, CL, CN, CO, CZ, DK, DZ, EC, EG, ER, ET, FI, GE, GR, HR, HU, ID, IE, IL, IN, IQ, IR, JP, KE, KR, KW, LB, LI, LK, MA, MX, NG, NO, PE, PH, PK, PL, RO, RS, RU, SA, SE, SK, SI, SY, TH, TN, UA, UZ, VN, XK

**2. Fehlende historische/veraltete Namen (~20)**
Abessinien (bereits vorhanden) → ergänzen: Niederländisch-Ostindien → Indonesien, Französisch-Indochina → Vietnam, Belgisch-Kongo → Dem. Rep. Kongo, Deutsch-Südwestafrika → Namibia, Portugiesisch-Ostafrika → Mosambik, Mesopotamien → Irak, Salomoninseln → Salomon-Inseln, Borneo → Malaysia, Katalonien → Spanien, Kurdistan → Irak, Tschechoslowakei → Tschechien, Nordjemen/Südjemen → Jemen

**3. Alternative Bezeichnungen/Varianten (~30)**
Nordmazedonien-Varianten, Ländernamen in anderen Schreibweisen (z.B. Bosnien-Herzegovina, Bosnien-Herzegowina), englische Bezeichnungen die in CH-Schulen vorkommen (Syria, Turkey, Greece, Serbia, Croatia, Hungary, Albania, Morocco, Tunisia, Egypt), umgangssprachliche (Saudis → Saudi-Arabien, Palästinenser → Palästina)

**4. Weitere Tippfehler (~30)**
Schweitz, Schwiez, Albanin, Boglaren, Kroatein, Serbin, Makzedonien, Montenegero, Frankrreich, Griechenland-Varianten, Spanein, Kolombien, Ekuador, Tansanien, Kammerun, Simbabwe, Marroko, Tuniesien, Algierien, Liberien/Libanon-Verwechslung, etc.

### Datei: `src/test/newRules.test.ts`
Bestehende Nationalitäts-Tests erweitern mit Stichproben für neue Kategorien (ISO-Codes, historische Namen, Tippfehler).

## Technische Details
- Alle neuen Einträge werden in `NATIONALITY_AUTO_CORRECTIONS` eingefügt
- Die bestehende case-insensitive Normalisierung und Levenshtein-Fuzzy-Matching greifen weiterhin
- Excel-Export aktualisiert sich automatisch
- Keine Änderung an `VALID_NATIONALITIES` (Zielliste bleibt fix)

