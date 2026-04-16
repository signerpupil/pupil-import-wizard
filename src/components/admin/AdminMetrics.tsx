import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, BarChart3 } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';

interface UsageEvent {
  id: string;
  created_at: string;
  event_type: string;
  import_type: string | null;
  step_number: number | null;
  payload: Record<string, unknown> | null;
  app_version: string | null;
  session_id: string | null;
}

const RANGE_OPTIONS = [
  { value: '7', label: 'Letzte 7 Tage' },
  { value: '30', label: 'Letzte 30 Tage' },
  { value: '90', label: 'Letzte 90 Tage' },
];

const PIE_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--pupil-teal))',
  'hsl(var(--pupil-success))',
  'hsl(var(--pupil-warning))',
  'hsl(var(--muted-foreground))',
  'hsl(var(--destructive))',
];

export function AdminMetrics() {
  const [events, setEvents] = useState<UsageEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const days = parseInt(range, 10);
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    supabase
      .from('usage_events')
      .select('*')
      .gte('created_at', since)
      .order('created_at', { ascending: true })
      .limit(10000)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          setError(error.message);
          setEvents([]);
        } else {
          setEvents((data ?? []) as UsageEvent[]);
        }
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  const importsPerDay = useMemo(() => {
    if (!events) return [];
    const counts = new Map<string, number>();
    for (const e of events) {
      if (e.event_type !== 'import_started') continue;
      const day = e.created_at.slice(0, 10);
      counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));
  }, [events]);

  const importTypeDistribution = useMemo(() => {
    if (!events) return [];
    const counts = new Map<string, number>();
    for (const e of events) {
      if (e.event_type !== 'import_started') continue;
      const t = e.import_type ?? 'unbekannt';
      counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    return Array.from(counts.entries()).map(([name, value]) => ({ name, value }));
  }, [events]);

  const topErrorTypes = useMemo(() => {
    if (!events) return [];
    const counts = new Map<string, number>();
    for (const e of events) {
      if (e.event_type !== 'validation_completed') continue;
      const errs = (e.payload?.error_count_by_type ?? {}) as Record<string, number>;
      for (const [type, n] of Object.entries(errs)) {
        if (typeof n !== 'number') continue;
        counts.set(type, (counts.get(type) ?? 0) + n);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([type, count]) => ({ type, count }));
  }, [events]);

  const stepFunnel = useMemo(() => {
    if (!events) return [];
    // Count distinct sessions reaching each step.
    const sessionsAtStep = new Map<number, Set<string>>();
    for (const e of events) {
      if (e.event_type !== 'step_reached' || e.step_number == null || !e.session_id) continue;
      const set = sessionsAtStep.get(e.step_number) ?? new Set<string>();
      set.add(e.session_id);
      sessionsAtStep.set(e.step_number, set);
    }
    return [0, 1, 2, 3, 4].map(step => ({
      step: `Step ${step}`,
      sessions: sessionsAtStep.get(step)?.size ?? 0,
    }));
  }, [events]);

  // Aggregate unmapped raw values across all `unmapped_value` events.
  const unmappedRanking = useMemo(() => {
    if (!events) return [];
    const counts = new Map<string, number>(); // key = `${kind}|${value}`
    for (const e of events) {
      if (e.event_type !== 'unmapped_value') continue;
      const p = (e.payload ?? {}) as Record<string, Array<{ value: string; count: number }>>;
      for (const kind of ['language', 'nationality', 'plz'] as const) {
        const arr = p[kind];
        if (!Array.isArray(arr)) continue;
        for (const item of arr) {
          if (!item || typeof item.value !== 'string' || typeof item.count !== 'number') continue;
          const key = `${kind}|${item.value}`;
          counts.set(key, (counts.get(key) ?? 0) + item.count);
        }
      }
    }
    return Array.from(counts.entries())
      .map(([key, count]) => {
        const [kind, value] = key.split('|', 2);
        return { kind, value, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 30);
  }, [events]);

  // Aggregate pattern masks per column across all `unfixed_pattern` events.
  const patternsByColumn = useMemo(() => {
    if (!events) return [];
    // column -> mask -> count
    const byCol = new Map<string, Map<string, number>>();
    for (const e of events) {
      if (e.event_type !== 'unfixed_pattern') continue;
      const p = (e.payload ?? {}) as Record<string, Array<{ mask: string; count: number }>>;
      for (const [column, arr] of Object.entries(p)) {
        if (!Array.isArray(arr)) continue;
        let inner = byCol.get(column);
        if (!inner) {
          inner = new Map<string, number>();
          byCol.set(column, inner);
        }
        for (const item of arr) {
          if (!item || typeof item.mask !== 'string' || typeof item.count !== 'number') continue;
          inner.set(item.mask, (inner.get(item.mask) ?? 0) + item.count);
        }
      }
    }
    return Array.from(byCol.entries())
      .map(([column, inner]) => ({
        column,
        total: Array.from(inner.values()).reduce((a, b) => a + b, 0),
        masks: Array.from(inner.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 8)
          .map(([mask, count]) => ({ mask, count })),
      }))
      .sort((a, b) => b.total - a.total);
  }, [events]);

  // Aggregate manual corrections (mask → mask) per column.
  const manualCorrectionsByColumn = useMemo(() => {
    if (!events) return [];
    // column -> "from||to" -> count
    const byCol = new Map<string, Map<string, number>>();
    for (const e of events) {
      if (e.event_type !== 'manual_correction') continue;
      const corrections = ((e.payload ?? {}) as Record<string, unknown>).corrections;
      if (!corrections || typeof corrections !== 'object') continue;
      for (const [column, arr] of Object.entries(corrections as Record<string, Array<{ from: string; to: string; count: number }>>)) {
        if (!Array.isArray(arr)) continue;
        let inner = byCol.get(column);
        if (!inner) {
          inner = new Map<string, number>();
          byCol.set(column, inner);
        }
        for (const item of arr) {
          if (!item || typeof item.from !== 'string' || typeof item.to !== 'string' || typeof item.count !== 'number') continue;
          const key = `${item.from}||${item.to}`;
          inner.set(key, (inner.get(key) ?? 0) + item.count);
        }
      }
    }
    return Array.from(byCol.entries())
      .map(([column, inner]) => ({
        column,
        total: Array.from(inner.values()).reduce((a, b) => a + b, 0),
        pairs: Array.from(inner.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .map(([key, count]) => {
            const [from, to] = key.split('||', 2);
            return { from, to, count };
          }),
      }))
      .sort((a, b) => b.total - a.total);
  }, [events]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-pupil-teal" />
            Nutzungsstatistiken
          </h2>
          <p className="text-sm text-muted-foreground">
            Anonyme Telemetrie – keine Schülerdaten enthalten.
          </p>
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RANGE_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Imports pro Tag</CardTitle>
            <CardDescription>Anzahl gestarteter Importe</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={importsPerDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Import-Typen</CardTitle>
            <CardDescription>Verteilung gestarteter Importe</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={importTypeDistribution} dataKey="value" nameKey="name" outerRadius={90} label>
                  {importTypeDistribution.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top 10 Fehler-Typen</CardTitle>
            <CardDescription>Aggregiert aus Validierungs-Events</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topErrorTypes} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                <YAxis dataKey="type" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--pupil-teal))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step-Funnel</CardTitle>
            <CardDescription>Sitzungen, die jeden Schritt erreichen</CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stepFunnel}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="step" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="sessions" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Full-width: missing mappings + unfixable patterns */}
      <div className="grid grid-cols-1 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Häufigste fehlende Mappings</CardTitle>
            <CardDescription>
              Unbekannte Sprach-, Nationalitäts- und PLZ-Werte (Top 30) – direkter Hinweis auf Lücken in den Mapping-Tabellen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {unmappedRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Keine fehlenden Mappings im Zeitraum.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-border">
                      <th className="py-2 pr-4 font-medium text-muted-foreground">Typ</th>
                      <th className="py-2 pr-4 font-medium text-muted-foreground">Wert</th>
                      <th className="py-2 font-medium text-muted-foreground text-right">Anzahl</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmappedRanking.map((row, i) => (
                      <tr key={i} className="border-b border-border/50">
                        <td className="py-1.5 pr-4">
                          <span className="inline-block px-2 py-0.5 rounded text-xs bg-muted text-foreground">
                            {row.kind === 'language' ? 'Sprache' : row.kind === 'nationality' ? 'Nationalität' : 'PLZ'}
                          </span>
                        </td>
                        <td className="py-1.5 pr-4 font-mono text-xs">{row.value}</td>
                        <td className="py-1.5 text-right tabular-nums">{row.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Häufigste nicht korrigierbare Muster</CardTitle>
            <CardDescription>
              Anonymisierte Zeichenmasken (A=Buchstabe, 9=Ziffer) pro Spalte – zeigt, welche Auto-Fix-Regeln noch fehlen.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {patternsByColumn.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">Keine Muster im Zeitraum.</p>
            ) : (
              <div className="space-y-4">
                {patternsByColumn.map(group => (
                  <div key={group.column} className="border border-border rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{group.column}</span>
                      <span className="text-xs text-muted-foreground tabular-nums">{group.total} Fehler</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {group.masks.map((m, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1">
                          <code className="font-mono">{m.mask}</code>
                          <span className="tabular-nums text-muted-foreground">{m.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {events && events.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Keine Ereignisse im gewählten Zeitraum.
        </p>
      )}
    </div>
  );
}
