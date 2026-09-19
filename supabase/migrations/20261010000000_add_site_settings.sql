CREATE TABLE IF NOT EXISTS public.site_settings (
    key text PRIMARY KEY,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read settings
CREATE POLICY "Allow public read access to site_settings"
ON public.site_settings
FOR SELECT
TO public
USING (true);

-- Allow admins to update settings
CREATE POLICY "Allow admins to update site_settings"
ON public.site_settings
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Initial seeding
INSERT INTO public.site_settings (key, value)
VALUES ('theme', '"pupil"')
ON CONFLICT (key) DO NOTHING;

GRANT SELECT ON public.site_settings TO anon, authenticated;
GRANT ALL ON public.site_settings TO authenticated;
