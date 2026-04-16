---
name: Session Persistence via IndexedDB
description: Wizard state (steps, errors, correctedRows, changeLog) auto-saved to IndexedDB to survive browser crashes
type: feature
---
`src/lib/sessionStore.ts` persists the entire `ImportWizardState` plus `fileName` to IndexedDB (`pupil-import-wizard` DB, `sessions` store, key `current`). Single active session.

API: `saveSession(state, fileName)`, `loadSession()`, `clearSession()`, `getSessionMeta()`.

Date preservation: custom `encodeDates`/`decodeDates` walker (NOT JSON replacer — `Date.toJSON()` fires before replacers). Marker shape: `{ __date: ISO }`.

Tests: `src/test/sessionStore.test.ts` uses `fake-indexeddb/auto`.
