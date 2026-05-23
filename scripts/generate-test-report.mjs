#!/usr/bin/env node
// Generates public/test-report.html from vitest JSON results.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const inputPath = process.argv[2] || 'test-results.json';
const outputPath = process.argv[3] || 'public/test-report.html';

if (!existsSync(inputPath)) {
  console.error(`[report] Input not found: ${inputPath}`);
  process.exit(1);
}

const data = JSON.parse(readFileSync(inputPath, 'utf-8'));
const files = data.testResults || [];
const totals = { passed: 0, failed: 0, skipped: 0, total: 0, duration: 0 };
const fileRows = [];

for (const f of files) {
  const tests = f.assertionResults || [];
  const counts = { passed: 0, failed: 0, skipped: 0 };
  for (const t of tests) {
    if (t.status === 'passed') counts.passed++;
    else if (t.status === 'failed') counts.failed++;
    else counts.skipped++;
  }
  totals.passed += counts.passed;
  totals.failed += counts.failed;
  totals.skipped += counts.skipped;
  totals.total += tests.length;
  totals.duration += (f.endTime || 0) - (f.startTime || 0);
  fileRows.push({ name: f.name.replace(/^.*\/src\//, 'src/'), counts, total: tests.length, failed: tests.filter(t => t.status === 'failed').map(t => ({ title: t.fullName || t.title, msg: (t.failureMessages || []).join('\n').slice(0, 800) })) });
}

const status = totals.failed === 0 ? 'PASS' : 'FAIL';
const statusColor = totals.failed === 0 ? '#0d9488' : '#dc2626';
const generated = new Date().toISOString();

const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

const html = `<!DOCTYPE html>
<html lang="de"><head><meta charset="utf-8"><title>Import-Wizard Test Report</title>
<style>
body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:1100px;margin:2rem auto;padding:0 1.5rem;color:#0f172a;background:#f8fafc}
h1{color:#0f766e;margin-bottom:.25rem}
.meta{color:#64748b;font-size:.85rem;margin-bottom:1.5rem}
.status{display:inline-block;padding:.25rem .75rem;border-radius:.375rem;color:#fff;background:${statusColor};font-weight:600;letter-spacing:.05em}
.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1rem;margin:1rem 0 2rem}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:.5rem;padding:1rem}
.card .n{font-size:1.75rem;font-weight:700}
.card .l{font-size:.8rem;color:#64748b;text-transform:uppercase;letter-spacing:.05em}
.pass{color:#0d9488}.fail{color:#dc2626}.skip{color:#a16207}
table{width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:.5rem;overflow:hidden}
th,td{padding:.5rem .75rem;border-bottom:1px solid #e2e8f0;text-align:left;font-size:.875rem}
th{background:#f1f5f9;font-weight:600}
tr:last-child td{border-bottom:none}
.fail-detail{background:#fef2f2;padding:.75rem 1rem;margin:.5rem 0;border-left:3px solid #dc2626;border-radius:.25rem;font-size:.85rem}
pre{background:#0f172a;color:#e2e8f0;padding:.75rem;border-radius:.25rem;overflow-x:auto;font-size:.75rem}
</style></head><body>
<h1>Import-Wizard Test Report</h1>
<div class="meta">Generiert: ${generated} · <span class="status">${status}</span></div>
<div class="grid">
  <div class="card"><div class="n">${totals.total}</div><div class="l">Total</div></div>
  <div class="card"><div class="n pass">${totals.passed}</div><div class="l">Passed</div></div>
  <div class="card"><div class="n fail">${totals.failed}</div><div class="l">Failed</div></div>
  <div class="card"><div class="n skip">${totals.skipped}</div><div class="l">Skipped</div></div>
</div>
<h2>Dateien (${fileRows.length})</h2>
<table><thead><tr><th>Datei</th><th>Tests</th><th class="pass">✓</th><th class="fail">✗</th><th class="skip">⊘</th></tr></thead><tbody>
${fileRows.map(f => `<tr><td><code>${esc(f.name)}</code></td><td>${f.total}</td><td class="pass">${f.counts.passed}</td><td class="fail">${f.counts.failed}</td><td class="skip">${f.counts.skipped}</td></tr>`).join('')}
</tbody></table>
${totals.failed > 0 ? `<h2 class="fail">Fehlgeschlagene Tests</h2>${fileRows.filter(f => f.failed.length).map(f => `<div class="fail-detail"><strong>${esc(f.name)}</strong>${f.failed.map(t => `<div style="margin-top:.5rem">• ${esc(t.title)}<pre>${esc(t.msg)}</pre></div>`).join('')}</div>`).join('')}` : ''}
<p style="margin-top:2rem;color:#64748b;font-size:.8rem">Auto-generiert via GitHub Actions · <a href="regeluebersicht-import-wizard.html">Regelübersicht</a></p>
</body></html>`;

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, html);
console.log(`[report] ${status} — ${totals.passed}/${totals.total} (${totals.failed} failed) → ${outputPath}`);
process.exit(totals.failed > 0 ? 1 : 0);