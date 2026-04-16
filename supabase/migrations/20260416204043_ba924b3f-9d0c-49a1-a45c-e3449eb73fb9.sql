CREATE OR REPLACE FUNCTION public.validate_usage_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.event_type NOT IN (
    'app_loaded',
    'import_started',
    'step_reached',
    'validation_completed',
    'export_completed',
    'import_reset',
    'unmapped_value',
    'unfixed_pattern',
    'manual_correction'
  ) THEN
    RAISE EXCEPTION 'Invalid event_type: %', NEW.event_type;
  END IF;

  IF octet_length(NEW.payload::text) > 4096 THEN
    RAISE EXCEPTION 'Payload too large (max 4096 bytes)';
  END IF;

  RETURN NEW;
END;
$function$;