import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, Upload, Search } from 'lucide-react';

interface Faq {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  is_active: boolean;
  sort_order: number;
}

const CATEGORIES = [
  'Ablauf/Onboarding',
  'Links & Zugänge',
  'Schulungen',
  'Migration',
  'Sonstiges',
];

const EMPTY_FORM = {
  question: '',
  answer: '',
  category: 'Ablauf/Onboarding',
  keywords: '',
  is_active: true,
  sort_order: 0,
};

/** Parst «F: … / A: …»-Blöcke oder CSV (Frage;Antwort[;Kategorie]) */
function parseBulk(text: string): { question: string; answer: string; category?: string }[] {
  const out: { question: string; answer: string; category?: string }[] = [];
  const trimmed = text.trim();
  if (!trimmed) return out;

  if (/^\s*(F|Frage)\s*:/im.test(trimmed)) {
    const blocks = trimmed.split(/\n\s*\n(?=\s*(?:F|Frage)\s*:)/i);
    for (const block of blocks) {
      const m = block.match(/(?:F|Frage)\s*:\s*([\s\S]*?)\n\s*(?:A|Antwort)\s*:\s*([\s\S]*)$/i);
      if (m) {
        const q = m[1].trim();
        const a = m[2].trim();
        if (q && a) out.push({ question: q, answer: a });
      }
    }
    return out;
  }

  for (const line of trimmed.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const parts = line.split(line.includes(';') ? ';' : '\t');
    const q = (parts[0] ?? '').trim().replace(/^"|"$/g, '');
    const a = (parts[1] ?? '').trim().replace(/^"|"$/g, '');
    const c = (parts[2] ?? '').trim().replace(/^"|"$/g, '');
    if (!q || !a) continue;
    if (/^frage$/i.test(q)) continue;
    out.push({ question: q, answer: a, category: c || undefined });
  }
  return out;
}

export function AdminAssistantFaqs() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkCategory, setBulkCategory] = useState('Ablauf/Onboarding');
  const [editing, setEditing] = useState<Faq | null>(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('alle');
  const { toast } = useToast();

  const fetchFaqs = async () => {
    const { data, error } = await supabase
      .from('assistant_faqs')
      .select('*')
      .order('sort_order')
      .order('created_at');
    if (error) {
      toast({ title: 'Fehler', description: 'FAQs konnten nicht geladen werden.', variant: 'destructive' });
    } else {
      setFaqs((data ?? []) as Faq[]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchFaqs();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    return faqs.filter((f) => {
      if (filterCategory !== 'alle' && f.category !== filterCategory) return false;
      if (!s) return true;
      return (
        f.question.toLowerCase().includes(s) ||
        f.answer.toLowerCase().includes(s) ||
        (f.keywords ?? []).some((k) => k.toLowerCase().includes(s))
      );
    });
  }, [faqs, search, filterCategory]);

  const openDialog = (faq?: Faq) => {
    if (faq) {
      setEditing(faq);
      setFormData({
        question: faq.question,
        answer: faq.answer,
        category: faq.category,
        keywords: (faq.keywords ?? []).join(', '),
        is_active: faq.is_active,
        sort_order: faq.sort_order,
      });
    } else {
      setEditing(null);
      setFormData({ ...EMPTY_FORM, sort_order: faqs.length });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.question.trim() || !formData.answer.trim()) {
      toast({ title: 'Fehlende Angaben', description: 'Frage und Antwort sind Pflichtfelder.', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    const payload = {
      question: formData.question.trim(),
      answer: formData.answer.trim(),
      category: formData.category,
      keywords: formData.keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean),
      is_active: formData.is_active,
      sort_order: Number(formData.sort_order) || 0,
    };
    const { error } = editing
      ? await supabase.from('assistant_faqs').update(payload).eq('id', editing.id)
      : await supabase.from('assistant_faqs').insert(payload);
    setIsSaving(false);
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Gespeichert', description: 'Edi nutzt die FAQ ab der nächsten Frage.' });
    setIsDialogOpen(false);
    fetchFaqs();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('assistant_faqs').delete().eq('id', id);
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Gelöscht' });
    fetchFaqs();
  };

  const toggleActive = async (faq: Faq) => {
    const { error } = await supabase
      .from('assistant_faqs')
      .update({ is_active: !faq.is_active })
      .eq('id', faq.id);
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      return;
    }
    fetchFaqs();
  };

  const handleBulkImport = async () => {
    const parsed = parseBulk(bulkText);
    if (!parsed.length) {
      toast({
        title: 'Nichts erkannt',
        description: 'Format: «F: Frage» / «A: Antwort» (Leerzeile dazwischen) oder CSV «Frage;Antwort;Kategorie».',
        variant: 'destructive',
      });
      return;
    }
    setIsSaving(true);
    const rows = parsed.map((p, i) => ({
      question: p.question,
      answer: p.answer,
      category: p.category || bulkCategory,
      keywords: [],
      is_active: true,
      sort_order: faqs.length + i,
    }));
    const { error } = await supabase.from('assistant_faqs').insert(rows);
    setIsSaving(false);
    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Import abgeschlossen', description: `${rows.length} FAQ(s) hinzugefügt.` });
    setBulkText('');
    setIsBulkOpen(false);
    fetchFaqs();
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Edi-FAQ</CardTitle>
            <CardDescription>
              Häufige Fragen der Schulen mit Ihrer Antwort erfassen. Edi nutzt diese
              Antworten sofort und bevorzugt gegenüber Live-Suche und Standardwissen.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsBulkOpen(true)}>
              <Upload className="mr-2 h-4 w-4" /> Mehrere importieren
            </Button>
            <Button onClick={() => openDialog()}>
              <Plus className="mr-2 h-4 w-4" /> Neue FAQ
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suchen in Frage, Antwort, Stichwörtern…"
              className="pl-8"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="alle">Alle Kategorien</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Noch keine FAQ erfasst. Legen Sie die erste Frage mit Ihrer Antwort an.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">Frage</TableHead>
                <TableHead>Antwort</TableHead>
                <TableHead className="w-[150px]">Kategorie</TableHead>
                <TableHead className="w-[90px]">Aktiv</TableHead>
                <TableHead className="w-[100px] text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((faq) => (
                <TableRow key={faq.id}>
                  <TableCell className="align-top font-medium">
                    {faq.question}
                    {(faq.keywords ?? []).length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {faq.keywords.map((k) => (
                          <Badge key={k} variant="secondary" className="text-[10px]">
                            {k}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    <span className="line-clamp-3 whitespace-pre-wrap">{faq.answer}</span>
                  </TableCell>
                  <TableCell className="align-top">
                    <Badge variant="outline">{faq.category}</Badge>
                  </TableCell>
                  <TableCell className="align-top">
                    <Switch checked={faq.is_active} onCheckedChange={() => toggleActive(faq)} />
                  </TableCell>
                  <TableCell className="align-top text-right">
                    <Button variant="ghost" size="icon" onClick={() => openDialog(faq)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(faq.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Einzel-Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'FAQ bearbeiten' : 'Neue FAQ'}</DialogTitle>
            <DialogDescription>
              Die Antwort darf Markdown enthalten (**fett**, [Linktext](URL)).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="faq-question">Frage</Label>
              <Textarea
                id="faq-question"
                rows={2}
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="z. B. Wo finde ich die Zugangsdaten für den Migrations-User?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="faq-answer">Antwort</Label>
              <Textarea
                id="faq-answer"
                rows={8}
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Ihre Standardantwort…"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Kategorie</Label>
                <Select
                  value={formData.category}
                  onValueChange={(v) => setFormData({ ...formData, category: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="faq-keywords">Stichwörter (kommagetrennt)</Label>
                <Input
                  id="faq-keywords"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="migrations-user, zugangsdaten, login"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
              />
              <Label>Aktiv (wird von Edi verwendet)</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk-Import */}
      <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Mehrere FAQs importieren</DialogTitle>
            <DialogDescription>
              Entweder als Textblöcke «F: … » / «A: … » (Leerzeile zwischen den Blöcken) oder als
              CSV-Zeilen «Frage;Antwort;Kategorie».
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              rows={12}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              placeholder={'F: Wann muss die SSO-Anbindung stehen?\nA: Spätestens 4 Wochen vor Slot-Start (Schritt 5.1).\n\nF: Wo finde ich die eLearnings?\nA: Unter [pupil.ch/ag-elearning](https://www.pupil.ch/ag-elearning).'}
            />
            <div className="space-y-2">
              <Label>Kategorie für Einträge ohne eigene Angabe</Label>
              <Select value={bulkCategory} onValueChange={setBulkCategory}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Erkannt: {parseBulk(bulkText).length} Eintrag/Einträge
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleBulkImport} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Importieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}