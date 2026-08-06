CREATE TABLE public.assistant_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text NOT NULL DEFAULT 'Sonstiges',
  keywords text[] NOT NULL DEFAULT '{}'::text[],
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.assistant_faqs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_faqs TO authenticated;
GRANT ALL ON public.assistant_faqs TO service_role;

ALTER TABLE public.assistant_faqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle können aktive FAQs lesen"
ON public.assistant_faqs FOR SELECT
TO anon, authenticated
USING (is_active = true);

CREATE POLICY "Admins können alle FAQs lesen"
ON public.assistant_faqs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins können FAQs verwalten"
ON public.assistant_faqs FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_assistant_faqs_updated_at
BEFORE UPDATE ON public.assistant_faqs
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX assistant_faqs_active_idx ON public.assistant_faqs (is_active, sort_order);