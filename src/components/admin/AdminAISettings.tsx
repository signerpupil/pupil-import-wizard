import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, Brain, MessageSquare, Globe, Sparkles } from 'lucide-react';

interface AISetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  setting_type: string;
}

const AI_MODELS = [
  { value: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash Preview (Schnell)' },
  { value: 'google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (Ausgewogen)' },
  { value: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro (Beste Qualität)' },
  { value: 'google/gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash Lite (Am schnellsten)' },
  { value: 'openai/gpt-5-mini', label: 'GPT-5 Mini (OpenAI)' },
  { value: 'openai/gpt-5', label: 'GPT-5 (OpenAI Premium)' },
];

const LANGUAGES = [
  { value: 'de_CH', label: 'Schweizer Hochdeutsch (de_CH)' },
  { value: 'de_DE', label: 'Deutsch (de_DE)' },
  { value: 'fr_CH', label: 'Französisch (fr_CH)' },
  { value: 'it_CH', label: 'Italienisch (it_CH)' },
];

const TONES = [
  { value: 'formal', label: 'Formell' },
  { value: 'informal', label: 'Informell' },
  { value: 'neutral', label: 'Neutral' },
];

export function AdminAISettings() {
  const [settings, setSettings] = useState<AISetting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const { toast } = useToast();

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('ai_settings')
      .select('*')
      .order('key');

    if (error) {
      toast({ title: 'Fehler', description: 'Einstellungen konnten nicht geladen werden.', variant: 'destructive' });
    } else {
      setSettings(data || []);
      const form: Record<string, string> = {};
      (data || []).forEach(s => {
        form[s.key] = s.value;
      });
      setFormData(form);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    let hasError = false;

    for (const setting of settings) {
      if (formData[setting.key] !== setting.value) {
        const { error } = await supabase
          .from('ai_settings')
          .update({ value: formData[setting.key] })
          .eq('id', setting.id);

        if (error) {
          hasError = true;
          toast({ title: 'Fehler', description: `${setting.key} konnte nicht gespeichert werden.`, variant: 'destructive' });
        }
      }
    }

    if (!hasError) {
      toast({ title: 'Erfolg', description: 'KI-Einstellungen wurden gespeichert.' });
      fetchSettings();
    }
    setIsSaving(false);
  };

  const getIcon = (key: string) => {
    switch (key) {
      case 'model': return <Brain className="h-5 w-5" />;
      case 'language': return <Globe className="h-5 w-5" />;
      case 'tone': return <MessageSquare className="h-5 w-5" />;
      case 'system_prompt': return <Sparkles className="h-5 w-5" />;
      default: return null;
    }
  };

  const getLabel = (key: string) => {
    switch (key) {
      case 'model': return 'KI-Modell';
      case 'language': return 'Sprache';
      case 'tone': return 'Ton';
      case 'system_prompt': return 'System-Prompt';
      default: return key;
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
              <Brain className="h-5 w-5" />
              KI-Einstellungen
            </CardTitle>
            <CardDescription>
              Konfigurieren Sie das Verhalten der KI für Korrekturvorschläge.
            </CardDescription>
          </div>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Speichern
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Model Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            KI-Modell
          </Label>
          <Select
            value={formData['model'] || ''}
            onValueChange={(value) => setFormData({ ...formData, model: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Modell auswählen" />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Wählen Sie das KI-Modell für die Analyse und Korrekturvorschläge.
          </p>
        </div>

        {/* Language Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Sprache
          </Label>
          <Select
            value={formData['language'] || ''}
            onValueChange={(value) => setFormData({ ...formData, language: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sprache auswählen" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.value} value={lang.value}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Die KI antwortet in der gewählten Sprache mit den entsprechenden Konventionen.
          </p>
        </div>

        {/* Tone Selection */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Ton
          </Label>
          <Select
            value={formData['tone'] || ''}
            onValueChange={(value) => setFormData({ ...formData, tone: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Ton auswählen" />
            </SelectTrigger>
            <SelectContent>
              {TONES.map((tone) => (
                <SelectItem key={tone.value} value={tone.value}>
                  {tone.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* System Prompt */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            System-Prompt
          </Label>
          <Textarea
            value={formData['system_prompt'] || ''}
            onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
            className="min-h-48 font-mono text-sm"
            placeholder="System-Prompt für die KI..."
          />
          <p className="text-sm text-muted-foreground">
            Der System-Prompt definiert das Verhalten und die Anweisungen für die KI.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
