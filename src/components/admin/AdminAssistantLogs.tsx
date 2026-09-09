import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw, MessageSquare, Download } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type LogRow = {
  id: string;
  created_at: string;
  question: string;
  answer: string | null;
  source: string | null;
  session_id: string | null;
};

function normalize(q: string) {
  return q.toLowerCase().replace(/\s+/g, ' ').replace(/[?.!,;:]/g, '').trim();
}

export function AdminAssistantLogs() {
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('assistant_chat_logs')
      .select('id, created_at, question, answer, source, session_id')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (error) console.error(error);
    setRows((data as LogRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const s = search.toLowerCase().trim();
    if (!s) return rows;
    return rows.filter(
      (r) => r.question.toLowerCase().includes(s) || (r.answer ?? '').toLowerCase().includes(s),
    );
  }, [rows, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, { question: string; count: number; last: string }>();
    for (const r of filtered) {
      const key = normalize(r.question);
      const entry = map.get(key);
      if (entry) {
        entry.count += 1;
        if (r.created_at > entry.last) entry.last = r.created_at;
      } else {
        map.set(key, { question: r.question, count: 1, last: r.created_at });
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count || (a.last < b.last ? 1 : -1));
  }, [filtered]);

  function exportCsv() {
    const head = 'Zeitpunkt;Quelle;Frage;Antwort\n';
    const body = filtered
      .map((r) =>
        [
          new Date(r.created_at).toLocaleString('de-CH'),
          r.source ?? '',
          `"${r.question.replace(/"/g, '""')}"`,
          `"${(r.answer ?? '').replace(/"/g, '""')}"`,
        ].join(';'),
      )
      .join('\n');
    const blob = new Blob(['\ufeff' + head + body], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'edi-fragen.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Gestellte Fragen an Edi
            </CardTitle>
            <CardDescription>
              Anonymes Protokoll ohne Personenbezug – ideal, um neue FAQ-Einträge abzuleiten.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Aktualisieren
            </Button>
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Fragen durchsuchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Wird geladen…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            Noch keine Fragen protokolliert.
          </p>
        ) : (
          <Tabs defaultValue="haeufig">
            <TabsList>
              <TabsTrigger value="haeufig">Häufigste Fragen ({grouped.length})</TabsTrigger>
              <TabsTrigger value="verlauf">Verlauf ({filtered.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="haeufig" className="space-y-2 pt-4">
              {grouped.map((g) => (
                <div
                  key={g.question}
                  className="flex items-start justify-between gap-3 rounded-md border p-3"
                >
                  <span className="text-sm">{g.question}</span>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge variant="secondary">{g.count}×</Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(g.last).toLocaleDateString('de-CH')}
                    </span>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="verlauf" className="space-y-2 pt-4">
              {filtered.map((r) => (
                <details key={r.id} className="rounded-md border p-3">
                  <summary className="cursor-pointer text-sm">
                    <span className="text-xs text-muted-foreground mr-2">
                      {new Date(r.created_at).toLocaleString('de-CH')}
                    </span>
                    {r.question}
                    {r.source && (
                      <Badge variant="outline" className="ml-2">
                        {r.source}
                      </Badge>
                    )}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {r.answer ?? '(keine Antwort gespeichert)'}
                  </p>
                </details>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
