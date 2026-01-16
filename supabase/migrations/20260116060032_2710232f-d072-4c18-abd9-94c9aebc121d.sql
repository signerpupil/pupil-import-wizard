-- Die READ-Policies müssen PERMISSIVE sein, damit sie funktionieren
-- Zuerst die alten restriktiven Policies löschen
DROP POLICY IF EXISTS "Jeder kann Spalten lesen" ON public.column_definitions;
DROP POLICY IF EXISTS "Jeder kann Format-Regeln lesen" ON public.format_rules;
DROP POLICY IF EXISTS "Jeder kann Geschäftsregeln lesen" ON public.business_rules;
DROP POLICY IF EXISTS "Jeder kann KI-Einstellungen lesen" ON public.ai_settings;

-- Neue PERMISSIVE Policies erstellen (Standard ist PERMISSIVE)
CREATE POLICY "Authentifizierte können Spalten lesen"
ON public.column_definitions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authentifizierte können Format-Regeln lesen"
ON public.format_rules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authentifizierte können Geschäftsregeln lesen"
ON public.business_rules FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authentifizierte können KI-Einstellungen lesen"
ON public.ai_settings FOR SELECT
TO authenticated
USING (true);