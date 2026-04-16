-- Telemetry table for anonymous usage events
CREATE TABLE public.usage_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  import_type text,
  step_number integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  app_version text,
  session_id uuid
);

CREATE INDEX idx_usage_events_created_type
  ON public.usage_events (created_at DESC, event_type);

ALTER TABLE public.usage_events ENABLE ROW LEVEL SECURITY;

-- Anyone (anon + authenticated) may insert events
CREATE POLICY "Anyone can insert usage events"
  ON public.usage_events
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins may read
CREATE POLICY "Admins can read usage events"
  ON public.usage_events
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Validation trigger: whitelist event types and limit payload size
CREATE OR REPLACE FUNCTION public.validate_usage_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.event_type NOT IN (
    'app_loaded',
    'import_started',
    'step_reached',
    'validation_completed',
    'export_completed',
    'import_reset'
  ) THEN
    RAISE EXCEPTION 'Invalid event_type: %', NEW.event_type;
  END IF;

  IF octet_length(NEW.payload::text) > 4096 THEN
    RAISE EXCEPTION 'Payload too large (max 4096 bytes)';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_usage_event
  BEFORE INSERT ON public.usage_events
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_usage_event();