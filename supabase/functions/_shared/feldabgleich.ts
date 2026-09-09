// Feldabgleich LehrerOffice -> PUPIL (Stammdaten SuS und EZB).
// Quelle: Musterdatei "Muster_Testdaten_SuS_Feldabgleich.xlsx" (Blatt "Feldmapping").
export const FELDABGLEICH_DOWNLOAD_URL =
  "https://koneksa.7ed.ch/Feldabgleich_LehrerOffice_PUPIL.xlsx";

export const FELDABGLEICH_BLOCK = `

--- FELDABGLEICH LEHREROFFICE -> PUPIL (STAMMDATEN SuS UND EZB) ---
Wenn jemand fragt, welche Felder aus LehrerOffice importiert/migriert werden, welche Spalten
uebernommen werden oder wohin ein bestimmtes Feld in PUPIL geht: Antworte auf Basis der
folgenden Tabelle UND liefere immer den Download der Musterdatei mit:
[Feldabgleich LehrerOffice -> PUPIL (Excel)](${FELDABGLEICH_DOWNLOAD_URL})

Die Datei enthaelt das Blatt "Feldmapping" (alle Spalten mit Status) sowie ein Blatt mit Muster-Testdaten.
Uebersicht: 85 Felder werden importiert, 52 Felder werden nicht importiert, 2 Sonderfaelle.
Bei langen Fragen nur die relevanten Zeilen nennen, nicht die ganze Tabelle ausgeben.

| Excel-Spalte | Feld aus LehrerOffice | Status | Datenziel in PUPIL | Bemerkung |
|---|---|---|---|---|
| A | Q_System | Sonderfall | — | Im Konzept gelistet, aber kein PUPIL-Zielfeld definiert |
| B | Q_Schuljahr | Import | Schuljahr |  |
| C | Q_Semester | Import | Semester |  |
| D | S_AHV | Import | AHV-Nummer |  |
| E | S_ID | Import | Schlüssel |  |
| F | S_Name | Import | Nachname |  |
| G | S_Vorname | Import | Vorname |  |
| H | S_Geschlecht | Import | Geschlecht |  |
| I | S_Geburtsdatum | Import | Geburtsdatum |  |
| J | S_NameOffiziell | Import | Vollständiger Nachname |  |
| K | S_NameAlias | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| L | S_VornameOffiziell | Import | Vollständiger Vorname |  |
| M | S_VornameAlias | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| N | S_Heimatort | Import | Heimatort |  |
| O | S_Konfession | Import | Konfession |  |
| P | S_Muttersprache | Import | Erstsprache |  |
| Q | S_Umgangssprache | Import | Umgangssprache |  |
| R | S_Nationalitaet | Import | Nationalität / Staatsangehörigkeit |  |
| S | S_Aufenthaltsbewilligung | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| T | S_AdressenZusatz | Import | Adresszusatz |  |
| U | S_Strasse | Import | Strasse |  |
| V | S_Postfach | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| W | S_PLZ | Import | PLZ |  |
| X | S_Ort | Import | Ort |  |
| Y | S_PolitischeGemeinde | Import | Politische Gemeinde |  |
| Z | S_Land | Import | Nationalität / Staatsangehörigkeit |  |
| AA | S_EMail | Import | E-Mail |  |
| AB | S_Fax | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AC | S_Telefon | Import | Telefon Privat |  |
| AD | S_Mobil | Import | Handy |  |
| AE | S_Website | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AF | S_Mediendarstellung | Import | Medienvereinbarung |  |
| AG | S_Schuljahre | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AH | S_Eintritt_frwKiga_Datum | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AI | S_Eintritt_frwKiga_Gemeinde | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AJ | S_Eintritt_frwKiga_Kanton | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AK | S_Eintritt_frwKiga_Land | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AL | S_Eintritt_Kiga_Datum | Import | Kiga Eintrittsdatum |  |
| AM | S_Eintritt_Kiga_Gemeinde | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AN | S_Eintritt_Kiga_Kanton | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AO | S_Eintritt_Kiga_Land | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AP | S_Eintritt_Primar_Datum | Import | Primar Eintrittsdatum |  |
| AQ | S_Eintritt_Primar_Gemeinde | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AR | S_Eintritt_Primar_Kanton | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AS | S_Eintritt_Primar_Land | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AT | S_Eintritt_Sek_Datum | Sonderfall | — | Kundenfeld: muss vorhanden sein, wird aber NICHT migriert (nicht systematisch gepflegt) |
| AU | S_Eintritt_Sek_Gemeinde | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AV | S_Eintritt_Sek_Kanton | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AW | S_Eintritt_Sek_Land | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AX | S_Eintritt_Datum | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| AY | S_Eintritt_Gemeinde | Import | Eintrittsdatum Gemeinde |  |
| AZ | S_Eintritt_Kanton | Import | Eintrittsdatum Kanton |  |
| BA | S_Eintritt_Land | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BB | S_Eintritt_Klasse | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BC | S_Austritt_Datum | Import | Austrittsdatum |  |
| BD | S_Austritt_Gemeinde | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BE | S_Austritt_Kanton | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BF | S_Austritt_Land | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BG | S_Austritt_Grund | Import | Austrittsgrund |  |
| BH | S_Faecher | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BI | S_Gruppen | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BJ | S_DAZ | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BK | S_VM | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BL | S_Lehrberuf | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BM | S_Lehrbetrieb_ID | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BN | S_Hausarzt_ID | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BO | S_Zahnarzt_ID | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BP | S_FREIFELD_1 (Deutschkenntnisse) | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BQ | S_FREIFELD_2 (Anmerkungen) | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BR | S_FREIFELD_3 | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BS | P_ERZ1_ID | Import | Schlüssel |  |
| BT | P_ERZ1_AHV | Import | AHV-Nummer |  |
| BU | P_ERZ1_Name | Import | Nachname |  |
| BV | P_ERZ1_Vorname | Import | Vorname |  |
| BW | P_ERZ1_NameAlias | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BX | P_ERZ1_VornameAlias | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| BY | P_ERZ1_Beruf | Import | Beruf |  |
| BZ | P_ERZ1_Geschl | Import | Geschlecht |  |
| CA | P_ERZ1_Rolle | Import | Rolle |  |
| CB | P_ERZ1_Nationalitaet | Import | Nationalität / Staatsangehörigkeit |  |
| CC | P_ERZ1_Muttersprache | Import | Erstsprache |  |
| CD | P_ERZ1_Umgangsprache | Import | Umgangssprache |  |
| CE | P_ERZ1_Anrede | Import | Anrede |  |
| CF | P_ERZ1_Strasse | Import | Strasse |  |
| CG | P_ERZ1_AdressenZusatz | Import | Adresszusatz |  |
| CH | P_ERZ1_PLZ | Import | PLZ |  |
| CI | P_ERZ1_Ort | Import | Ort |  |
| CJ | P_ERZ1_Land | Import | Land |  |
| CK | P_ERZ1_EMail | Import | Private E-Mail |  |
| CL | P_ERZ1_EMailGeschaeft | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| CM | P_ERZ1_TelefonPrivat | Import | Telefon Privat |  |
| CN | P_ERZ1_TelefonGeschaeft | Import | Telefon (geschäftlich) |  |
| CO | P_ERZ1_Mobil | Import | Handy |  |
| CP | P_ERZ1_MobilGeschaeft | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| CQ | P_ERZ2_ID | Import | Schlüssel |  |
| CR | P_ERZ2_AHV | Import | AHV-Nummer |  |
| CS | P_ERZ2_Name | Import | Nachname |  |
| CT | P_ERZ2_Vorname | Import | Vorname |  |
| CU | P_ERZ2_NameAlias | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| CV | P_ERZ2_VornameAlias | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| CW | P_ERZ2_Beruf | Import | Beruf |  |
| CX | P_ERZ2_Geschl | Import | Geschlecht |  |
| CY | P_ERZ2_Rolle | Import | Rolle |  |
| CZ | P_ERZ2_Nationalitaet | Import | Nationalität / Staatsangehörigkeit |  |
| DA | P_ERZ2_Muttersprache | Import | Erstsprache |  |
| DB | P_ERZ2_Umgangsprache | Import | Umgangssprache |  |
| DC | P_ERZ2_Anrede | Import | Anrede |  |
| DD | P_ERZ2_Strasse | Import | Strasse |  |
| DE | P_ERZ2_AdressenZusatz | Import | Adresszusatz |  |
| DF | P_ERZ2_PLZ | Import | PLZ |  |
| DG | P_ERZ2_Ort | Import | Ort |  |
| DH | P_ERZ2_Land | Import | Land |  |
| DI | P_ERZ2_EMail | Import | Private E-Mail |  |
| DJ | P_ERZ2_EMailGeschaeft | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| DK | P_ERZ2_TelefonPrivat | Import | Telefon Privat |  |
| DL | P_ERZ2_TelefonGeschaeft | Import | Telefon (geschäftlich) |  |
| DM | P_ERZ2_Mobil | Import | Handy |  |
| DN | P_ERZ2_MobilGeschaeft | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| DO | K_ID | Import | Klassen ID |  |
| DP | K_ID2 | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| DQ | K_KURSID | Import | O365 Schluessel |  |
| DR | K_Schluessel | Import | Klassenschlüssel für Umsysteme |  |
| DS | K_Name | Import | Klassenname |  |
| DT | K_Schulstufe | Import | Art der Schulklasse |  |
| DU | K_Schulform | Import | Schulart |  |
| DV | K_Jahr | Import | Jahrgang |  |
| DW | K_Zusatz | Import | Klassenzusatz |  |
| DX | K_Information | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| DY | K_Schuleinheit | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| DZ | K_Schulhaus_ID | Import | Schlüssel der Schule |  |
| EA | K_Schulhaus_Name | Import | Name der Schule |  |
| EB | L_KL1_AHV | Import | AHV-Nummer | Mapping via AHV-Nummer, nicht via Schlüssel (Schlüssel kommt aus kantonalem PULS) |
| EC | L_KL1_ID | Import | Schlüssel |  |
| ED | L_KL1_Name | Import | Nachname |  |
| EE | L_KL1_Vorname | Import | Vorname |  |
| EF | L_KL2_AHV | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| EG | L_KL2_ID | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| EH | L_KL2_Name | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
| EI | L_KL2_Vorname | Kein Import | — | Nicht im Migrationskonzept aufgeführt |
|  |  |  |  |  |
| Legende |  |  |  |  |
| Import | Grün |  | Feld ist im Migrationskonzept PUPIL@AG v1.0 mit Datenziel aufgeführt und wird nach PUPIL importiert. |  |
| Sonderfall | Gelb |  | Im Konzept erwähnt, aber ohne Zielfeld bzw. explizit nicht migriert. |  |
| Kein Import | Grau |  | Spalte im LO-Export vorhanden, im Migrationskonzept nicht aufgeführt – wird nicht migriert. |  |
|  |  |  |  |  |
| Total Spalten: 139 | Import: 85 | Sonderfall: 2 | Kein Import: 52 |  |  |  |  |
| Quelle: Migrationskonzept PUPIL@AG, Version 1.0 vom 16.11.2025 (Peter Streit), Kap. 2.1.1 / Muster_Testdaten_SuS.xlsx |  |  |  |  |
`;
