
## Analyse des Problems

Die aktuelle `test-stammdaten.csv` enthält keine realistischen Familienszenarien mit mehreren Kindern. Jede Zeile repräsentiert ein Kind mit einem eigenen Elternpaar – aber dieselben Eltern tauchen nie in mehreren Zeilen für ihre verschiedenen Kinder auf. Das bedeutet:

- **Eltern-ID-Konsolidierung** wird nie ausgelöst, weil dieselbe AHV-Nummer / derselbe Name nie in >1 Zeile vorkommt
- **Namenswechsel-Erkennung** wird zwar für die Ianuzi/Brunner/Müller-Szenarien ausgelöst (Zeilen 82–93), aber nur weil zwei Kinder unterschiedlich erfasste Mütter haben – nicht wegen mehrerer Kinder derselben Familie

## Was die Testdatei bisher abdeckt

- Zeilen 2–51: Schüler ohne spezielle Fehler (Grunddaten)
- Zeilen 52–55: Schüler-Duplikate (S_AHV, S_ID)
- Zeilen 58–69: Eltern-ID-Inkonsistenzen via AHV / Name+Adresse (jeder Fall hat genau 2 Zeilen, aber verschiedene Kinder)
- Zeilen 70–75: Elternpaar-Szenarien (ID-Unterschiede für dasselbe Elternpaar)
- Zeilen 76–81: Adress-/Telefon-Änderungen (Umzug-Szenarien)
- Zeilen 82–93: Namenswechsel für ERZ1 (Ianuzi, Brunner, Müller, Schmidt, Meier) und ERZ2 (Kummer)
- Zeilen 94–97: Kein-Match-Szenarien
- Zeilen 98–103: Diakritik-Normalisierung
- Zeilen 104–115: Format-Fehler (AHV, Datum, Geschlecht, E-Mail, Telefon, PLZ, Pflichtfelder)

## Was fehlt: Realistische Geschwister-Szenarien

**Szenario 1 – Familie mit 3 Kindern, Vater mit inkonsistenter ID (AHV-basiert):**
Kind A (Klasse 1A), Kind B (Klasse 3B), Kind C (Klasse 5A) haben denselben Vater mit AHV `756.1111.2222.01`, aber die Schulsoftware hat bei jedem Kind eine andere ID vergeben: `30001`, `30002`, `30003`. → 2 Fehler für ERZ1_ID (AHV-Erkennung, hohe Zuverlässigkeit)

**Szenario 2 – Familie mit 2 Kindern, Mutter nach Heirat in einem Kind anders erfasst:**
Kind A hat Mutter "Gruber Maria" (alter Name vor Heirat), Kind B hat Mutter "Gruber-Keller Maria" → Namenswechsel-Erkennung (Bindestrichzusatz)

**Szenario 3 – Familie mit 2 Kindern, Elternpaar via Name+Adresse erkannt (mittlere Zuverlässigkeit):**
Kein AHV vorhanden. ERZ1 = "Brunetti Marco, Seestrasse 7" – Kind A hat ID `40001`, Kind B hat ID `40002` → Name+Strasse-Erkennung

**Szenario 4 – Familie mit 2 Kindern, Elternpaar via Name-only erkannt (tiefe Zuverlässigkeit):**
Beide Elternteile stimmen überein, aber keine AHV und keine Adresse. → Elternpaar-Matching (niedrige Zuverlässigkeit)

## Technische Umsetzung

**Datei:** `public/test-stammdaten.csv`

Neue Zeilen werden am Ende der Datei angehängt (nach Zeile 115).

### Neue Zeilen

**Block A – Geschwister mit ERZ1-ID-Inkonsistenz via AHV (3 Kinder, ID variiert)**

Kind 1: S_AHV neu, S_ID `10201`, S_Name `Geschwister`, S_Vorname `Kind1`, Klasse `1A`
- P_ERZ1_ID: `50001`, P_ERZ1_AHV: `756.1111.2222.01`, P_ERZ1_Name: `Vater`, P_ERZ1_Vorname: `Hans`, P_ERZ1_Strasse: `Geschwisterweg 1`, P_ERZ1_PLZ: `8000`, P_ERZ1_Ort: `Zürich`
- P_ERZ2_ID: `50100`, P_ERZ2_AHV: `756.1111.2222.02`, P_ERZ2_Name: `Mutter`, P_ERZ2_Vorname: `Heidi`

Kind 2 (Bruder): S_AHV neu, S_ID `10202`, S_Name `Geschwister`, S_Vorname `Kind2`, Klasse `3B`
- **P_ERZ1_ID: `50002`** (andere ID, gleiche AHV!) – löst AHV-Inkonsistenz aus
- P_ERZ1_AHV: `756.1111.2222.01` (gleich), P_ERZ1_Name: `Vater`, P_ERZ1_Vorname: `Hans`

Kind 3 (Schwester): S_AHV neu, S_ID `10203`, S_Name `Geschwister`, S_Vorname `Kind3`, Klasse `5A`
- **P_ERZ1_ID: `50003`** (wieder andere ID, gleiche AHV!) – zweiter AHV-Inkonsistenz-Fehler
- P_ERZ1_AHV: `756.1111.2222.01` (gleich), P_ERZ1_Name: `Vater`, P_ERZ1_Vorname: `Hans`
- P_ERZ2_ID: `50102`, P_ERZ2 wie Kind 2

**Block B – Geschwister mit ERZ1-Namenswechsel (Mutter hat nach Heirat anderen Namen)**

Kind 1: S_ID `10204`, S_Name `Heirat`, S_Vorname `Kind1`, Klasse `2A`
- P_ERZ1_ID: `51001`, kein AHV, P_ERZ1_Name: `Weber`, P_ERZ1_Vorname: `Anna`, P_ERZ1_Strasse: `Heiratsgasse 5`, P_ERZ1_PLZ: `8001`, P_ERZ1_Ort: `Zürich`

Kind 2 (jüngere Schwester, nach Hochzeit der Mutter erfasst): S_ID `10205`, S_Name `Heirat`, S_Vorname `Kind2`, Klasse `4B`
- P_ERZ1_ID: `51001`, kein AHV, P_ERZ1_Name: `Weber-Brun`, P_ERZ1_Vorname: `Anna` (Bindestrichzusatz) → Namenswechsel-Erkennung

**Block C – Geschwister mit ERZ-Erkennung via Name+Strasse (mittlere Zuverlässigkeit, kein AHV)**

Kind 1: S_ID `10206`, Klasse `1C`
- P_ERZ1_ID: `52001`, kein AHV, P_ERZ1_Name: `Rossi`, P_ERZ1_Vorname: `Marco`, P_ERZ1_Strasse: `Rossiweg 3`, PLZ `8002`

Kind 2: S_ID `10207`, Klasse `4C`
- **P_ERZ1_ID: `52002`** (andere ID), kein AHV, P_ERZ1_Name: `Rossi`, P_ERZ1_Vorname: `Marco`, P_ERZ1_Strasse: `Rossiweg 3` (identisch) → Name+Strasse-Inkonsistenz

**Block D – Geschwister mit Elternpaar-Erkennung via Name-only (tiefe Zuverlässigkeit)**

Kind 1: S_ID `10208`, Klasse `2C`
- P_ERZ1_ID: `53001`, P_ERZ1_Name: `Dario`, P_ERZ1_Vorname: `Luca`, ohne AHV, ohne Strasse
- P_ERZ2_ID: `53002`, P_ERZ2_Name: `Dario`, P_ERZ2_Vorname: `Sofia`

Kind 2: S_ID `10209`, Klasse `5C`
- **P_ERZ1_ID: `53003`** (andere ID!), P_ERZ1_Name: `Dario`, P_ERZ1_Vorname: `Luca`, ohne AHV
- **P_ERZ2_ID: `53004`** (andere ID!), P_ERZ2_Name: `Dario`, P_ERZ2_Vorname: `Sofia` → Elternpaar-Inkonsistenz (name_only)

## Erwartetes Ergebnis nach Änderung

| Block | Validierungsregel | Anzahl neue Fehler |
|---|---|---|
| A | AHV-Inkonsistenz P_ERZ1_ID | 2 Fehler (Kind2, Kind3) |
| B | Namenswechsel P_ERZ1_Name | 1 Warnung (Kind2) |
| C | Name+Strasse-Inkonsistenz P_ERZ1_ID | 1 Fehler (Kind2) |
| D | Elternpaar-Inkonsistenz (name_only) P_ERZ1_ID + P_ERZ2_ID | 2 Warnungen (Kind2) |

Diese Szenarien decken alle drei Erkennungsstrategien der `checkParentIdConsistency`-Funktion ab und liefern realistische Geschwisterfamilien.
