CREATE TABLE public.coach_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Nouvelle conversation',
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_threads TO authenticated;
GRANT ALL ON public.coach_threads TO service_role;
ALTER TABLE public.coach_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own threads select" ON public.coach_threads FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Own threads insert" ON public.coach_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own threads update" ON public.coach_threads FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own threads delete" ON public.coach_threads FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX coach_threads_user_updated ON public.coach_threads (user_id, updated_at DESC);