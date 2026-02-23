
# Schritt-fuer-Schritt Korrektur automatisch in den Viewport scrollen

## Problem
Wenn die Schritt-fuer-Schritt Korrektur geoeffnet wird (z.B. bei Sprache/Nationalitaet), muss der Benutzer manuell nach unten scrollen, um das Modal zu sehen. Das ist umstaendlich und nicht intuitiv.

## Loesung
Eine `useRef` Referenz auf die Step-by-Step Card setzen und per `scrollIntoView` automatisch dorthin scrollen, sobald das Modal aktiviert wird.

## Technische Aenderungen

### Datei: `src/components/import/Step3Validation.tsx`

1. **Ref erstellen** (bei den anderen useState/useRef Deklarationen):
   ```typescript
   const stepByStepRef = useRef<HTMLDivElement>(null);
   ```

2. **useEffect hinzufuegen** der bei Aktivierung des Modals scrollt:
   ```typescript
   useEffect(() => {
     if (stepByStepMode && currentError && stepByStepRef.current) {
       stepByStepRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
     }
   }, [stepByStepMode]);
   ```

3. **Ref an die Card anbinden** (Zeile 1937):
   ```tsx
   <Card ref={stepByStepRef} className="border-2 border-primary">
   ```

Das sind insgesamt 3 kleine Aenderungen in einer Datei.
