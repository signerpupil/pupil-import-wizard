
# Erweiterte Duplikatsprüfung: Name-only mit Adress-Disambiguierung

## Zusammenfassung der Regel

Aktuell werden Elternteile mit identischem Vor-/Nachnamen und unterschiedlicher Adresse als potenzielle Duplikate gemeldet (Name-only Strategie, Warnung). Die neue Regel verfeinert dies:

```text
Gleicher Name + Vorname?
  |
  +-- Gleiche Adresse? --> Dieselbe Person (wie bisher)
  |
  +-- Unterschiedliche Adresse?
        |
        +-- Gleiche Telefonnummer? --> Dieselbe Person --> Warnung ausgeben
        |     (TelefonPrivat, TelefonGeschaeft oder Mobil)
        |
        +-- Keine gleiche Telefonnummer?
              |
              +-- Anderer EB (Elternteil) stimmt auch ueberein? --> Dieselbe Person --> Warnung ausgeben
              |     (gleiches Elternpaar, nur umgezogen)
              |
              +-- Anderer EB stimmt NICHT ueberein --> Verschiedene Personen --> KEINE Warnung
```

## Betroffene Dateien

### 1. `src/lib/fileParser.ts`

**PARENT_CONSISTENCY_CHECKS erweitern** (Zeilen 186-203):
- Telefon-Felder zu jeder ERZ-Konfiguration hinzufuegen: `telefonPrivatField`, `telefonGeschaeftField`, `mobilField`
- Fuer ERZ1: `P_ERZ1_TelefonPrivat`, `P_ERZ1_TelefonGeschaeft`, `P_ERZ1_Mobil`
- Fuer ERZ2: `P_ERZ2_TelefonPrivat`, `P_ERZ2_TelefonGeschaeft`, `P_ERZ2_Mobil`

**Name+Strasse Strategie anpassen** (Zeilen 380-385):
- Bleibt unveraendert -- gleiche Adresse = dieselbe Person.

**Name-only Strategie (Pass 2) erweitern** (Zeilen 388-458):
- Aktuell: Beide Elternteile muessen namentlich uebereinstimmen.
- Neu: Wenn nur EIN Elternteil namentlich uebereinstimmt (also kein Elternpaar-Match), wird zusaetzlich geprueft:
  1. Telefonnummern des betreffenden Elternteils vergleichen (normalisiert, nur Ziffern)
  2. Falls keine Uebereinstimmung: Pruefen, ob der andere EB in beiden Zeilen identisch ist (Name+Vorname)
  3. Nur wenn eines der beiden Kriterien zutrifft, wird die Inkonsistenz-Warnung ausgegeben

**Neue Hilfsfunktion** `normalizePhone(value: string): string`:
- Entfernt alle Nicht-Ziffern fuer den Vergleich von Telefonnummern
- Wird genutzt um TelefonPrivat, TelefonGeschaeft und Mobil paarweise zu vergleichen

### 2. `src/pages/Documentation.tsx`

- Die Dokumentation der Eltern-ID Konsolidierung aktualisieren:
  - Bei der Name-only Strategie die neue Disambiguierungslogik beschreiben
  - Klarstellen: "Gleicher Name + unterschiedliche Adresse: Pruefung ueber Telefonnummer oder uebereinstimmenden zweiten Elternteil"

### 3. `src/test/duplicateMerging.test.ts`

Neue Testfaelle hinzufuegen:
- **Gleicher Name, unterschiedliche Adresse, gleiche Telefonnummer** --> Warnung (dieselbe Person)
- **Gleicher Name, unterschiedliche Adresse, keine gleiche Telefonnummer, aber gleicher anderer EB** --> Warnung (dieselbe Person)
- **Gleicher Name, unterschiedliche Adresse, keine gleiche Telefonnummer, anderer EB unterschiedlich** --> KEINE Warnung (verschiedene Personen)

## Technische Details

Die Kernlogik der Aenderung betrifft den Pass 2 in `checkParentIdConsistency`. Der aktuelle Pass 2 arbeitet mit einem `compositeKey` aus beiden Elternnamen. Die Erweiterung fuegt eine zweite Pruefschicht hinzu fuer den Fall, dass nur ein einzelner Elternteil namentlich uebereinstimmt:

1. **Bestehende Paar-Logik bleibt erhalten**: Wenn beide Elternteile namentlich uebereinstimmen, wird wie bisher die Warnung ausgegeben.
2. **Neue Einzel-Elternteil-Logik**: Eine zusaetzliche Map `singleParentByName` sammelt individuelle Elternteile nach normalisiertem Name+Vorname. Bei einem Match mit unterschiedlicher Adresse wird:
   - Die Telefonnummern beider Zeilen verglichen (alle drei Felder kreuzweise)
   - Falls kein Telefon-Match: Der jeweils andere EB beider Zeilen verglichen
   - Nur bei positivem Ergebnis wird die Warnung erzeugt
