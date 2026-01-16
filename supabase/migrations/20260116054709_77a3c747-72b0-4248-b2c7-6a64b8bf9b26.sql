-- Enum für Benutzerrollen
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Benutzerrollen-Tabelle
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- RLS für user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security Definer Funktion für Rollenprüfung (vermeidet RLS-Rekursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS Policies für user_roles
CREATE POLICY "Admins können alle Rollen sehen"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins können Rollen erstellen"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins können Rollen löschen"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Spalten-Definitionen Tabelle
CREATE TABLE public.column_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    data_type VARCHAR(50) NOT NULL DEFAULT 'text',
    is_required BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.column_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jeder kann Spalten lesen"
ON public.column_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins können Spalten verwalten"
ON public.column_definitions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Format-Regeln Tabelle (Regex-Validierungen)
CREATE TABLE public.format_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    pattern TEXT NOT NULL,
    description TEXT,
    error_message TEXT NOT NULL,
    applies_to_columns TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.format_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jeder kann Format-Regeln lesen"
ON public.format_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins können Format-Regeln verwalten"
ON public.format_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Geschäftslogik-Regeln Tabelle
CREATE TABLE public.business_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    configuration JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    error_message TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.business_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jeder kann Geschäftsregeln lesen"
ON public.business_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins können Geschäftsregeln verwalten"
ON public.business_rules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- KI-Einstellungen Tabelle
CREATE TABLE public.ai_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    value TEXT NOT NULL,
    description TEXT,
    setting_type VARCHAR(50) NOT NULL DEFAULT 'text',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Jeder kann KI-Einstellungen lesen"
ON public.ai_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins können KI-Einstellungen verwalten"
ON public.ai_settings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Standard KI-Einstellungen einfügen
INSERT INTO public.ai_settings (key, value, description, setting_type) VALUES
('model', 'google/gemini-3-flash-preview', 'Das verwendete KI-Modell', 'select'),
('language', 'de_CH', 'Sprache der KI-Antworten', 'select'),
('tone', 'formal', 'Ton der KI-Antworten (formal/informal)', 'select'),
('system_prompt', 'Du bist ein Datenvalidierungs-Assistent für Schweizer Schuldaten. Analysiere die Validierungsfehler und schlage Korrekturen vor.

SPRACHREGELN (WICHTIG):
- Antworte IMMER in Schweizer Hochdeutsch (de_CH)
- Verwende NIEMALS das Eszett (ß) - schreibe stattdessen immer "ss" (z.B. "gross" statt "groß", "Strasse" statt "Straße")
- Alle Texte in "pattern" und "suggestion" müssen diese Regel befolgen', 'System-Prompt für die KI', 'textarea');

-- Trigger für updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_column_definitions_updated_at
BEFORE UPDATE ON public.column_definitions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_format_rules_updated_at
BEFORE UPDATE ON public.format_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_rules_updated_at
BEFORE UPDATE ON public.business_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_settings_updated_at
BEFORE UPDATE ON public.ai_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Benutzer können ihre eigene Rolle sehen
CREATE POLICY "Benutzer können eigene Rolle sehen"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());