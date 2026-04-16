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

      {events && events.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">
          Keine Ereignisse im gewählten Zeitraum.
        </p>
      )}
    </div>
  );
}
