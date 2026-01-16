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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, CheckCircle, XCircle } from 'lucide-react';

interface BusinessRule {
  id: string;
  name: string;
  rule_type: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  configuration: any;
  description: string | null;
  error_message: string;
  is_active: boolean;
  sort_order: number;
}

const RULE_TYPES = [
  { value: 'family_relation', label: 'Familienbeziehung' },
  { value: 'age_validation', label: 'Altersvalidierung' },
  { value: 'date_range', label: 'Datumsbereich' },
  { value: 'field_dependency', label: 'Feldabhängigkeit' },
  { value: 'unique_constraint', label: 'Eindeutigkeit' },
  { value: 'family_consistency', label: 'Familien-Konsistenz' },
  { value: 'name_change_detection', label: 'Namenswechsel-Erkennung' },
  { value: 'parent_child_consolidation', label: 'Eltern-Kind Konsolidierung' },
  { value: 'custom', label: 'Benutzerdefiniert' },
];

export function AdminBusinessRules() {
  const [rules, setRules] = useState<BusinessRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BusinessRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rule_type: 'family_relation',
    configuration: '{}',
    description: '',
    error_message: '',
    is_active: true,
  });
  const { toast } = useToast();

  const fetchRules = async () => {
    const { data, error } = await supabase
      .from('business_rules')
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

  const handleOpenDialog = (rule?: BusinessRule) => {
    if (rule) {
      setEditingRule(rule);
      setFormData({
        name: rule.name,
        rule_type: rule.rule_type,
        configuration: JSON.stringify(rule.configuration, null, 2),
        description: rule.description || '',
        error_message: rule.error_message,
        is_active: rule.is_active,
      });
    } else {
      setEditingRule(null);
      setFormData({
        name: '',
        rule_type: 'family_relation',
        configuration: '{}',
        description: '',
        error_message: '',
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    let configJson;
    try {
      configJson = JSON.parse(formData.configuration);
    } catch {
      toast({ title: 'Fehler', description: 'Ungültiges JSON in der Konfiguration.', variant: 'destructive' });
      return;
    }

    if (editingRule) {
      const { error } = await supabase
        .from('business_rules')
        .update({
          name: formData.name,
          rule_type: formData.rule_type,
          configuration: configJson,
          description: formData.description || null,
          error_message: formData.error_message,
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
        .from('business_rules')
        .insert({
          name: formData.name,
          rule_type: formData.rule_type,
          configuration: configJson,
          description: formData.description || null,
          error_message: formData.error_message,
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
      .from('business_rules')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Fehler', description: 'Regel konnte nicht gelöscht werden.', variant: 'destructive' });
    } else {
      toast({ title: 'Erfolg', description: 'Regel wurde gelöscht.' });
      fetchRules();
    }
  };

  const toggleActive = async (rule: BusinessRule) => {
    const { error } = await supabase
      .from('business_rules')
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
            <CardTitle>Geschäftslogik-Regeln</CardTitle>
            <CardDescription>
              Komplexe Validierungen wie Familienbeziehungen, Altersvalidierung und mehr.
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
                  Definieren Sie eine Geschäftslogik-Regel.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z.B. Eltern-Kind-Beziehung"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rule_type">Regeltyp</Label>
                  <Select
                    value={formData.rule_type}
                    onValueChange={(value) => setFormData({ ...formData, rule_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RULE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="configuration">Konfiguration (JSON)</Label>
                  <Textarea
                    id="configuration"
                    value={formData.configuration}
                    onChange={(e) => setFormData({ ...formData, configuration: e.target.value })}
                    className="font-mono text-sm min-h-24"
                    placeholder='{"minAge": 4, "maxAge": 20}'
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="error_message">Fehlermeldung</Label>
                  <Input
                    id="error_message"
                    value={formData.error_message}
                    onChange={(e) => setFormData({ ...formData, error_message: e.target.value })}
                    placeholder="z.B. Ungültige Familienbeziehung"
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
            Keine Geschäftslogik-Regeln definiert. Erstellen Sie eine neue Regel.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Fehlermeldung</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {RULE_TYPES.find(t => t.value === rule.rule_type)?.label || rule.rule_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-48 truncate">{rule.error_message}</TableCell>
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
