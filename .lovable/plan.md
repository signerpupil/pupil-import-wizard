

## Anleitung für Stammdaten-Import (LehrerOffice Export Guide)

### Übersicht
Neue Komponente `StammdatenInstructionGuide.tsx` erstellen — analog zur `LOInstructionGuide.tsx` (Collapsible + Lightbox, gleiche UX). Wird in `Step1FileUpload.tsx` oberhalb der Upload-Zone eingebunden, aber nur wenn der Import-Typ "schueler" ist.

### Änderungen

**1. Screenshots kopieren**
- `user-uploads://Screenhot_1.png` → `src/assets/lo-stammdaten-export-menu.png`
- `user-uploads://Screenshot_2.png` → `src/assets/lo-stammdaten-export-format.png`
- `user-uploads://Screenshot_3.png` → `src/assets/lo-stammdaten-export-save.png`

**2. Neue Komponente `src/components/import/StammdatenInstructionGuide.tsx`**

Gleicher Aufbau wie `LOInstructionGuide`:
- Collapsible mit `BookOpen`-Icon, Titel: "Anleitung: Daten aus LehrerOffice exportieren"
- localStorage-Persistenz (`stammdaten-guide-open`)
- Lightbox-Dialog für Screenshot-Zoom
- 4 Schritte mit `StepNumber`-Komponente:

| Schritt | Text | Screenshot |
|---------|------|------------|
| 1 | In LehrerOffice unter **Schüler/innen** die Ansicht **Schülerdaten** öffnen. | — |
| 2 | In der Ansicht das korrekte **Semester** wählen. | — |
| 3 | Im oberen Menü **Schüler → Exportieren…** wählen. | Screenshot 1 |
| 4 | Die Option **Schülerdaten (als Excelliste)** wählen und den weiteren Hinweisen folgen. | Screenshot 2 |
| 5 | Die Datei lokal speichern — diese wird anschliessend hier hochgeladen. | Screenshot 3 |

Hinweis am Ende: "Der Export kann für beliebig viele Semester wiederholt werden."

**3. `src/components/import/Step1FileUpload.tsx`**
- Import `StammdatenInstructionGuide`
- Neue optionale Prop: `importType?: string`
- Wenn `importType === 'schueler'`: `<StammdatenInstructionGuide />` zwischen Überschrift und Upload-Zone rendern

**4. `src/pages/Index.tsx`**
- `importType` an `Step1FileUpload` durchreichen (aus dem Wizard-State)

