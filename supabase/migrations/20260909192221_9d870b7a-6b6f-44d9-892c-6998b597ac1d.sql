CREATE TABLE public.assistant_chat_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  question text NOT NULL,
  answer text,
  source text,
  session_id uuid
);

GRANT SELECT ON public.assistant_chat_logs TO authenticated;
GRANT ALL ON public.assistant_chat_logs TO service_role;

ALTER TABLE public.assistant_chat_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read chat logs"
ON public.assistant_chat_logs
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_assistant_chat_logs_created_at ON public.assistant_chat_logs (created_at DESC);