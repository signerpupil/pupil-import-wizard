import { useState } from 'react';
import { Check, Loader2, Palette } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useTheme, type SiteTheme } from '@/hooks/useTheme';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

export function AdminThemeSettings() {
  const { theme, isSevenTheme, isSaving, setTheme } = useTheme();
  const [pendingTheme, setPendingTheme] = useState<SiteTheme | null>(null);

  const handleChange = async (checked: boolean) => {
    const nextTheme: SiteTheme = checked ? 'seven-education' : 'pupil';
    setPendingTheme(nextTheme);
    try {
      await setTheme(nextTheme);
      toast({ title: 'Design gespeichert', description: 'Die Auswahl gilt jetzt für alle Seiten.' });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Design konnte nicht gespeichert werden',
        description: error instanceof Error ? error.message : 'Bitte versuchen Sie es erneut.',
      });
    } finally {
      setPendingTheme(null);
    }
  };

  const displayedTheme = pendingTheme ?? theme;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Palette className="h-5 w-5" />
          </div>
          <div>
            <CardTitle>Design</CardTitle>
            <CardDescription>Wählen Sie die Gestaltung für die gesamte Anwendung.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-6 rounded-md border bg-card p-5">
          <div className="space-y-1">
            <Label htmlFor="global-design" className="text-base font-semibold">
              7-Education-Design
            </Label>
            <p className="text-sm text-muted-foreground">
              {displayedTheme === 'seven-education'
                ? 'Das neue Design ist für alle Seiten aktiv.'
                : 'Das bisherige Design ist für alle Seiten aktiv.'}
            </p>
            <div className="flex items-center gap-2 pt-2 text-xs font-medium text-primary">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {isSaving ? 'Wird gespeichert …' : 'Global gespeichert'}
            </div>
          </div>
          <Switch
            id="global-design"
            checked={pendingTheme ? pendingTheme === 'seven-education' : isSevenTheme}
            onCheckedChange={handleChange}
            disabled={isSaving}
            aria-label="7-Education-Design aktivieren"
          />
        </div>
      </CardContent>
    </Card>
  );
}
