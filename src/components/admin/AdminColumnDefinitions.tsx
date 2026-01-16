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
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, Loader2, GripVertical } from 'lucide-react';

interface ColumnDefinition {
  id: string;
  name: string;
  display_name: string;
  data_type: string;
  is_required: boolean;
  description: string | null;
  sort_order: number;
}

export function AdminColumnDefinitions() {
  const [columns, setColumns] = useState<ColumnDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnDefinition | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    data_type: 'text',
    is_required: false,
    description: '',
  });
  const { toast } = useToast();

  const fetchColumns = async () => {
    const { data, error } = await supabase
      .from('column_definitions')
      .select('*')
      .order('sort_order');

    if (error) {
      toast({ title: 'Fehler', description: 'Spalten konnten nicht geladen werden.', variant: 'destructive' });
    } else {
      setColumns(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchColumns();
  }, []);

  const handleOpenDialog = (column?: ColumnDefinition) => {
    if (column) {
      setEditingColumn(column);
      setFormData({
        name: column.name,
        display_name: column.display_name,
        data_type: column.data_type,
        is_required: column.is_required,
        description: column.description || '',
      });
    } else {
      setEditingColumn(null);
      setFormData({
        name: '',
        display_name: '',
        data_type: 'text',
        is_required: false,
        description: '',
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingColumn) {
      const { error } = await supabase
        .from('column_definitions')
        .update({
          name: formData.name,
          display_name: formData.display_name,
          data_type: formData.data_type,
          is_required: formData.is_required,
          description: formData.description || null,
        })
        .eq('id', editingColumn.id);

      if (error) {
        toast({ title: 'Fehler', description: 'Spalte konnte nicht aktualisiert werden.', variant: 'destructive' });
      } else {
        toast({ title: 'Erfolg', description: 'Spalte wurde aktualisiert.' });
        fetchColumns();
      }
    } else {
      const { error } = await supabase
        .from('column_definitions')
        .insert({
          name: formData.name,
          display_name: formData.display_name,
          data_type: formData.data_type,
          is_required: formData.is_required,
          description: formData.description || null,
          sort_order: columns.length,
        });

      if (error) {
        toast({ title: 'Fehler', description: 'Spalte konnte nicht erstellt werden.', variant: 'destructive' });
      } else {
        toast({ title: 'Erfolg', description: 'Spalte wurde erstellt.' });
        fetchColumns();
      }
    }
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('column_definitions')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Fehler', description: 'Spalte konnte nicht gelöscht werden.', variant: 'destructive' });
    } else {
      toast({ title: 'Erfolg', description: 'Spalte wurde gelöscht.' });
      fetchColumns();
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
            <CardTitle>Spalten-Definitionen</CardTitle>
            <CardDescription>
              Definieren Sie, welche Spalten beim Import erwartet werden.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Neue Spalte
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingColumn ? 'Spalte bearbeiten' : 'Neue Spalte erstellen'}
                </DialogTitle>
                <DialogDescription>
                  Definieren Sie die Eigenschaften der Spalte.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Technischer Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z.B. S_Name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display_name">Anzeigename</Label>
                  <Input
                    id="display_name"
                    value={formData.display_name}
                    onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                    placeholder="z.B. Nachname"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="data_type">Datentyp</Label>
                  <Select
                    value={formData.data_type}
                    onValueChange={(value) => setFormData({ ...formData, data_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text</SelectItem>
                      <SelectItem value="number">Zahl</SelectItem>
                      <SelectItem value="date">Datum</SelectItem>
                      <SelectItem value="email">E-Mail</SelectItem>
                      <SelectItem value="ahv">AHV-Nummer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_required"
                    checked={formData.is_required}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_required: checked })}
                  />
                  <Label htmlFor="is_required">Pflichtfeld</Label>
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
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleSave}>
                  {editingColumn ? 'Aktualisieren' : 'Erstellen'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {columns.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Keine Spalten definiert. Erstellen Sie eine neue Spalte.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Anzeigename</TableHead>
                <TableHead>Typ</TableHead>
                <TableHead>Pflicht</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {columns.map((column) => (
                <TableRow key={column.id}>
                  <TableCell>
                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                  </TableCell>
                  <TableCell className="font-mono text-sm">{column.name}</TableCell>
                  <TableCell>{column.display_name}</TableCell>
                  <TableCell className="capitalize">{column.data_type}</TableCell>
                  <TableCell>{column.is_required ? 'Ja' : 'Nein'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(column)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(column.id)}>
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
