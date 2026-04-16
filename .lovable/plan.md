
Der User will Option 1 (Lovable Cloud Telemetrie) umsetzen — und fragt explizit, ob das mit GitHub Pages Deployment funktioniert.

**Ja, funktioniert problemlos.** GitHub Pages liefert nur statisches HTML/JS aus. Der Browser ruft danach Lovable Cloud (Supabase) direkt via HTTPS auf — genau wie auf der `*.lovable.app` Preview. Nichts unterscheidet sich, weil der gesamte Cloud-Zugriff client-seitig über die anon-key läuft (bereits in `.env` als `VITE_SUPABASE_*` und damit in den Build eingebacken).

Einzige Voraussetzung: CORS in Supabase erlaubt standardmäßig alle Origins für die anon REST/Edge-API → keine Konfiguration nötig.

## Plan: Anonyme Nutzungs-Telemetrie

### 1. Datenbank (Migration)
Neue Tabelle `usage_events`:
- `id uuid PK`, `created_at timestamptz`, `event_type text`, `import_type text NULL`, `step_number int NULL`, `payload jsonb`, `app_version text`, `session_id uuid`
- Index auf `(created_at DESC, event_type)`
- RLS: `INSERT` für `anon` + `authenticated` erlaubt; `SELECT` nur für `admin`-Rolle (via `has_role`).
- Validierungs-Trigger: Payload-Größe < 4 KB, `event_type` aus Whitelist.

### 2. Frontend Tracking (`src/lib/analytics.ts`)
- `getSessionId()` — UUID in `sessionStorage` (pro Tab, nicht persistent → keine Wiedererkennung).
- `trackEvent(type, payload)` — fire-and-forget POST direkt an Supabase REST (`supabase.from('usage_events').insert(...)`), Fehler still ignoriert.
- Opt-out-Check: liest `localStorage.getItem('analytics-opt-out')`.
- App-Version aus `import.meta.env.VITE_APP_VERSION` (per Vite define gesetzt, fallback `'dev'`).

### 3. Tracking-Calls (minimal-invasiv)
- `useImportWizard.ts`: Step-Wechsel (`step_reached`), `RESET` (`import_reset`).
- `Step1FileUpload.tsx`: nach Datei-Parse (`import_started` mit `import_type` + `row_count_bucket`).
- `Step3Validation.tsx`: nach Validierungsabschluss (`validation_completed` mit aggregierten `error_count_by_type`, **keine** Werte).
- `Step4Preview.tsx`: bei Export-Klick (`export_completed` mit Format).

**Strikt verboten in Payloads**: Spaltenwerte, Namen, AHV, Dateinamen, IDs. Nur Zähler und Bucket-Größen.

### 4. Datenschutz-Hinweis
- `DatenschutzDialog.tsx` ergänzen: kurzer Absatz "Anonyme Nutzungsstatistiken (Ereignistyp, Schritt-Nummer, Fehleranzahl pro Typ) werden zur Verbesserung erfasst. Keine Schülerdaten."
- Footer: dezenter "Statistik deaktivieren"-Toggle (setzt `localStorage`-Flag).

### 5. Admin-Dashboard (`/admin/metrics`)
- Neue Route + Tab in `Admin.tsx`.
- Komponente `AdminMetrics.tsx`: 
  - Date-Range-Picker (7/30/90 Tage).
  - 4 Charts mit recharts (bereits via shadcn vorhanden):
    - Imports pro Tag (Linie)
    - Verteilung Import-Typen (Pie)
    - Häufigste Fehler-Typen (Balken, Top 10)
    - Step-Funnel (Balken: Wieviele erreichen Step 1/2/3/4)
- Direkte Supabase-Queries (RLS schützt → nur Admins sehen Daten).

### 6. Build (für GitHub Pages)
- `vite.config.ts`: `define: { 'import.meta.env.VITE_APP_VERSION': JSON.stringify(...) }` mit Git-SHA oder Timestamp.
- Keine weiteren Anpassungen am `deploy.yml` nötig — die `VITE_SUPABASE_*` aus `.env` werden bereits im Build eingebettet.

## Offene Punkte zur Bestätigung

1. **Opt-out vs. Opt-in**: Empfehlung → Opt-out (transparent in Datenschutz, Toggle im Footer). Zustimmung?
2. **Bucket-Größen** für Zeilenanzahl: `<100`, `100-500`, `500-1000`, `1000-3000`, `>3000` — okay?
3. **Admin-Dashboard** als neuer Tab in `/admin` (nicht eigene Route) — okay?

Nach Bestätigung dieser drei Punkte setze ich um.
