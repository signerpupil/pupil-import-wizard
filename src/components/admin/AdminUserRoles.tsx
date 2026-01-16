import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Plus, Trash2, Loader2, Shield, UserPlus, AlertCircle, Crown } from 'lucide-react';

interface UserRole {
  id: string;
  user_id: string;
  role: 'admin' | 'user';
  created_at: string;
}

export function AdminUserRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const fetchRoles = async () => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching roles:', error);
      toast({ title: 'Fehler', description: 'Rollen konnten nicht geladen werden.', variant: 'destructive' });
    } else {
      setRoles(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleAddAdmin = async () => {
    if (!newUserId.trim()) {
      toast({ title: 'Fehler', description: 'Bitte geben Sie eine Benutzer-ID ein.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    // Check if user already has admin role
    const { data: existing } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', newUserId)
      .eq('role', 'admin')
      .maybeSingle();

    if (existing) {
      toast({ title: 'Hinweis', description: 'Dieser Benutzer ist bereits Administrator.', variant: 'default' });
      setIsSubmitting(false);
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .insert({
        user_id: newUserId,
        role: 'admin',
      });

    if (error) {
      toast({ title: 'Fehler', description: 'Admin-Rolle konnte nicht hinzugefügt werden. Stellen Sie sicher, dass die Benutzer-ID korrekt ist.', variant: 'destructive' });
    } else {
      toast({ title: 'Erfolg', description: 'Administrator wurde hinzugefügt.' });
      setNewUserId('');
      setIsDialogOpen(false);
      fetchRoles();
    }
    setIsSubmitting(false);
  };

  const handleRemoveAdmin = async (roleId: string, userId: string) => {
    // Prevent removing yourself
    if (userId === user?.id) {
      toast({ title: 'Fehler', description: 'Sie können sich nicht selbst als Administrator entfernen.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('id', roleId);

    if (error) {
      toast({ title: 'Fehler', description: 'Admin-Rolle konnte nicht entfernt werden.', variant: 'destructive' });
    } else {
      toast({ title: 'Erfolg', description: 'Administrator wurde entfernt.' });
      fetchRoles();
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
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Benutzer & Rollen
            </CardTitle>
            <CardDescription>
              Verwalten Sie Administratoren für den Admin-Bereich.
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Admin hinzufügen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Administrator hinzufügen</DialogTitle>
                <DialogDescription>
                  Fügen Sie einen neuen Administrator hinzu, indem Sie dessen Benutzer-ID eingeben.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Der Benutzer muss sich zuerst registrieren. Die Benutzer-ID finden Sie in der Supabase-Datenbank unter auth.users.
                  </AlertDescription>
                </Alert>
                <div className="space-y-2">
                  <Label htmlFor="user_id">Benutzer-ID (UUID)</Label>
                  <Input
                    id="user_id"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder="z.B. 123e4567-e89b-12d3-a456-426614174000"
                    className="font-mono"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleAddAdmin} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Hinzufügen
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {roles.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Keine Administratoren vorhanden. Fügen Sie den ersten Administrator hinzu.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Benutzer-ID</TableHead>
                <TableHead>Rolle</TableHead>
                <TableHead>Hinzugefügt</TableHead>
                <TableHead className="text-right">Aktionen</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-mono text-sm">
                    <div className="flex items-center gap-2">
                      {role.user_id === user?.id && (
                        <span title="Das sind Sie">
                          <Crown className="h-4 w-4 text-pupil-warning" />
                        </span>
                      )}
                      {role.user_id.slice(0, 8)}...{role.user_id.slice(-4)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="default" className="bg-primary">
                      <Shield className="mr-1 h-3 w-3" />
                      Admin
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(role.created_at).toLocaleDateString('de-CH')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleRemoveAdmin(role.id, role.user_id)}
                      disabled={role.user_id === user?.id}
                    >
                      <Trash2 className={`h-4 w-4 ${role.user_id === user?.id ? 'text-muted-foreground' : 'text-destructive'}`} />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Hinweis:</strong> Um den ersten Administrator hinzuzufügen, müssen Sie sich registrieren und dann Ihre Benutzer-ID manuell in der Datenbank zur user_roles-Tabelle hinzufügen.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
