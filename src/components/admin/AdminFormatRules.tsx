import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface FormatRule {
  id: string;
  name: string;
  pattern: string;
  description: string | null;
  error_message: string;
  applies_to_columns: string[];
  is_active: boolean;
  sort_order: number;
}

export function AdminFormatRules() {
  const [rules, setRules] = useState<FormatRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<FormatRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    pattern: '',
    description: '',
    error_message: '',
    applies_to_columns: '',
    is_active: true,
  });
  const { toast } = useToast();

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from('format_rules')
      .select('*')
      .order('sort_order');

    if (error) {
      toast({ title: 'Fehler', description: 'Regeln konnten nicht geladen werden.', variant: 'destructive' });
    } else {
      setRules(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenDialog = (rule?: FormatRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        pattern: rule.pattern,
        description: rule.description || '',
        error_message: rule.error_message,
        applies_to_columns: rule.applies_to_columns.join(', '),
        is_active: rule.is_active,
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        pattern: '',
        description: '',
        error_message: '',
        applies_to_columns: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const validateRegexPattern = (pattern: string): { valid: boolean; error?: string } => {
    if (!pattern.trim()) {
      return { valid: false, error: 'Regex-Muster darf nicht leer sein.' };
    }

    // Check pattern length to prevent overly complex patterns
    if (pattern.length > 500) {
      return { valid: false, error: 'Regex-Muster ist zu lang (max. 500 Zeichen).' };
    }

    // Validate regex syntax
    try {
      new RegExp(pattern);
    } catch (e) {
      return { valid: false, error: 'Ungültige Regex-Syntax.' };
    }

    // Check for potentially dangerous ReDoS patterns
    const dangerousPatterns = [
      /\(\.\*\)\+/,           // (.*)+
      /\(\.\+\)\+/,           // (.+)+
      /\([^)]*\+\)\+/,        // (a+)+ type patterns
      /\([^)]*\*\)\+/,        // (a*)+ type patterns
      /\([^)]*\+\)\*/,        // (a+)* type patterns
      /\([^)]*\*\)\*/,        // (a*)* type patterns
      /(\.\*){2,}/,           // .*.* repetitions
      /(\.\+){2,}/,           // .+.+ repetitions
    ];

    for (const dangerous of dangerousPatterns) {
      if (dangerous.test(pattern)) {
        return { 
          valid: false, 
          error: 'Potenziell unsicheres Muster erkannt (ReDoS-Risiko). Bitte vereinfachen.' 
        };
      }
    }

    return { valid: true };
  };

  const handleSave = async () => {
    // Validate regex pattern before saving
    const patternValidation = validateRegexPattern(formData.pattern);
    if (!patternValidation.valid) {
      toast({ 
        title: 'Ungültiges Muster', 
        description: patternValidation.error, 
        variant: 'destructive' 
      });
      return;
    }

    const columnsArray = formData.applies_to_columns
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    if (editingRule) {
      const { error } = await supabase
        .from('format_rules')
        .update({
          name: formData.name,
          pattern: formData.pattern,
          description: formData.description || null,
          error_message: formData.error_message,
          applies_to_columns: columnsArray,
          is_active: formData.is_active,
        })
        .eq('id', editingRule.id);

      if (error) {
        toast({ title: 'Fehler', description: 'Regel konnte nicht aktualisiert werden.', variant: 'destructive' });
      } else {
        toast({ title: 'Erfolg', description: 'Regel wurde aktualisiert.' });
        fetchRules();
      }
    } else {
      const { error } = await supabase
        .from('format_rules')
        .insert({
          name: formData.name,
          pattern: formData.pattern,
          description: formData.description || null,
          error_message: formData.error_message,
          applies_to_columns: columnsArray,
          is_active: formData.is_active,
          sort_order: rules.length,
        });

      if (error) {
        toast({ title: 'Fehler', description: 'Regel konnte nicht erstellt werden.', variant: 'destructive' });
      } else {
        toast({ title: 'Erfolg', description: 'Regel wurde erstellt.' });
        fetchRules();
      }
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('format_rules')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Fehler', description: 'Regel konnte nicht gelöscht werden.', variant: 'destructive' });
    } else {
      toast({ title: 'Erfolg', description: 'Regel wurde gelöscht.' });
      fetchRules();
    }
  };

  const toggleActive = async (rule: FormatRule) => {
    const { error } = await supabase
      .from('format_rules')
      .update({ is_active: !rule.is_active })
      .eq('id', rule.id);

    if (error) {
      toast({ title: 'Fehler', description: 'Status konnte nicht geändert werden.', variant: 'destructive' });
    } else {
      fetchRules();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Format-Regeln</CardTitle>
            <CardDescription>
              Regex-Muster für die Validierung von AHV-Nummern, E-Mail-Adressen, Datumsformaten etc.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Neue Regel
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingRule ? 'Regel bearbeiten' : 'Neue Regel erstellen'}
                </DialogTitle>
                <DialogDescription>
                  Definieren Sie ein Regex-Muster für die Formatvalidierung.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z.B. AHV-Nummer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pattern">Regex-Muster</Label>
                  <Input
                    id="pattern"
                    value={formData.pattern}
                    onChange={(e) => setFormData({ ...formData, pattern: e.target.value })}
                    placeholder="z.B. ^756\.\d{4}\.\d{4}\.\d{2}$"
                    className="font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="error_message">Fehlermeldung</Label>
                  <Input
                    id="error_message"
                    value={formData.error_message}
                    onChange={(e) => setFormData({ ...formData, error_message: e.target.value })}
                    placeholder="z.B. Ungültiges AHV-Format"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="applies_to_columns">Gilt für Spalten (kommagetrennt)</Label>
                  <Input
                    id="applies_to_columns"
                    value={formData.applies_to_columns}
                    onChange={(e) => setFormData({ ...formData, applies_to_columns: e.target.value })}
                    placeholder="z.B. S_AHV, L_AHV"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optionale Beschreibung..."
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Aktiv</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleSave}>
                  {editingRule ? 'Aktualisieren' : 'Erstellen'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {rules.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Keine Format-Regeln definiert. Erstellen Sie eine neue Regel.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Muster</TableHead>
                <TableHead>Spalten</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell className="font-mono text-xs max-w-32 truncate">{rule.pattern}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {rule.applies_to_columns.slice(0, 2).map((col) => (
                        <Badge key={col} variant="secondary" className="text-xs">
                          {col}
                        </Badge>
                      ))}
                      {rule.applies_to_columns.length > 2 && (
                        <Badge variant="secondary" className="text-xs">
                          +{rule.applies_to_columns.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleActive(rule)}
                      className={rule.is_active ? 'text-pupil-success' : 'text-muted-foreground'}
                    >
                      {rule.is_active ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <XCircle className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(rule)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(rule.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
