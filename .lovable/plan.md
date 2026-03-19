

# Deep Research: Weltweite Sprachen → BISTA-Mapping

## Ausgangslage

- **52 offizielle BISTA-Kategorien** (Zielwerte, unveränderbar)
- **~90 bestehende Auto-Korrekturen** in `LANGUAGE_AUTO_CORRECTIONS`
- Fuzzy-Matching (Levenshtein) fängt Tippfehler ab, aber **unbekannte Sprachbezeichnungen** (z.B. "Zulu", "Quechua", "Cebuano") werden nicht erkannt

## Forschungsergebnis: Fehlende Sprachen nach Region

Basierend auf Ethnologue, Wikipedia (Top 200 Sprachen), BFS-Migrationsdaten und Schweizer Schulrealität fehlen ca. **150–200 weitere Sprachen**, die in der Schweiz als Muttersprache vorkommen können.

### Kategorisierung der fehlenden Sprachen:

| BISTA-Zielkategorie | Fehlende Sprachen (Beispiele) |
|---|---|
| **Afrikanische Sprachen** | Zulu, Xhosa, Shona, Ndebele, Sotho, Tswana, Malagasy, Ewe, Fon, Mossi/Mooré, Mandinka, Sango, Luba, Chichewa, Luganda, Acholi, Dinka, Nuer, Afar, Beja, Serer, Diola/Jola, Mende, Krio, Edo, Kikuyu, Luo, Runyankole, Teso, Nyanja, Bemba, Chewa, Zarma, Kanuri, Tiv, Efik, Nupe |
| **Arabisch** (Dialekte) | Ägyptisch-Arabisch, Levantinisch, Irakisch-Arabisch, Maghrebinisch, Sudanesisch-Arabisch, Jemenitisch |
| **Chinesisch** (Varianten) | Hakka, Min, Wu, Shanghaiisch, Hokkien, Teochew, Fuzhou |
| **Indoarische/Drawidische** | Sindhi, Odia/Oriya, Assamesisch, Konkani, Maithili, Bhojpuri, Rajasthani, Chhattisgarhi, Dogri, Kashmiri, Santali, Tulu, Badaga |
| **Ostasiatische Sprachen** | Hmong/Miao, Zhuang, Yi, Mien/Yao, Dong |
| **Übrige süd-/südostasiat.** | Javanisch, Sundanesisch, Cebuano, Ilocano, Bisaya, Shan, Karen, Mon, Cham, Tetum, Balinesisch, Minangkabau, Acehnese |
| **Westasiatische Sprachen** | Aserbaidschanisch, Tadschikisch, Turkmenisch, Belutschi/Balochi, Hazaragi |
| **Übrige westasiatische** | Kirgisisch, Kasachisch, Tschetschenisch, Awarisch, Ossetisch |
| **Andere westeuropäische** | Walisisch, Bretonisch, Okzitanisch, Galicisch, Korsisch, Sardisch, Maltesisch, Luxemburgisch, Friesisch |
| **Andere nordeuropäische** | Samisch/Sami, Färöisch/Faröisch, Grönländisch |
| **Übrige osteuropäische** | Weissrussisch/Belarussisch, Moldawisch |
| **Übrige slawische** | Sorbisch, Ruthenisch, Kaschubisch |
| **Portugiesisch** (Variante) | Kreolisch (Kapverdisch), Brasilianisches Portugiesisch |
| **Spanisch** (Variante) | Quechua → eigentlich Andere westeuropäische? Nein → nicht definiert oder eigene Logik |

Zusätzlich: **Gebärdensprachen**, **Kreolsprachen**, **amerikanische indigene Sprachen** (Quechua, Aymara, Guaraní, Nahuatl) → `nicht definiert` oder nächste Kategorie.

## Umsetzungsplan

### Schritt 1: Erweiterte Mapping-Tabelle erstellen
Datei: `src/lib/fileParser.ts` — `LANGUAGE_AUTO_CORRECTIONS` erweitern um ca. **150+ neue Einträge**, systematisch nach BISTA-Kategorie geordnet:

**Afrikanische Sprachen (~40 neue)**:
Zulu, Xhosa, Shona, Ndebele, Sotho, Tswana, Malagasy, Ewe, Fon, Mooré, Mandinka, S