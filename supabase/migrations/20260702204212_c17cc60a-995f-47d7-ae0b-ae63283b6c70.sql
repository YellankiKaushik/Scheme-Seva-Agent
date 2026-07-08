
-- Schemes catalog
CREATE TABLE public.schemes (
  id TEXT PRIMARY KEY,
  scheme_name TEXT NOT NULL,
  ministry TEXT NOT NULL,
  scheme_code TEXT,
  benefit_type TEXT NOT NULL,
  benefit_amount TEXT NOT NULL,
  description TEXT NOT NULL,
  eligibility JSONB NOT NULL,
  keywords TEXT[] NOT NULL DEFAULT '{}',
  documents_required TEXT[] NOT NULL DEFAULT '{}',
  application_steps TEXT[] NOT NULL DEFAULT '{}',
  application_url TEXT,
  application_mode TEXT NOT NULL DEFAULT 'online',
  source_url TEXT NOT NULL,
  last_verified DATE NOT NULL,
  confidence_level TEXT NOT NULL DEFAULT 'verified',
  state_scope TEXT NOT NULL DEFAULT 'central',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.schemes TO anon, authenticated;
GRANT ALL ON public.schemes TO service_role;
ALTER TABLE public.schemes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Schemes are public" ON public.schemes FOR SELECT USING (true);

-- Citizen sessions (demo: no auth, keyed by client-generated session id)
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL UNIQUE,
  profile JSONB NOT NULL,
  found_schemes JSONB NOT NULL DEFAULT '[]'::jsonb,
  report_markdown TEXT,
  safety_status TEXT,
  last_scan_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.sessions TO anon, authenticated;
GRANT ALL ON public.sessions TO service_role;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions readable by session_key" ON public.sessions FOR SELECT USING (true);
CREATE POLICY "Sessions insertable" ON public.sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Sessions updatable" ON public.sessions FOR UPDATE USING (true);

-- Vigilance alerts
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key TEXT NOT NULL,
  scheme_id TEXT NOT NULL,
  scheme_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  urgency TEXT NOT NULL DEFAULT 'medium',
  seen BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.alerts TO anon, authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Alerts readable" ON public.alerts FOR SELECT USING (true);
CREATE POLICY "Alerts insertable" ON public.alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Alerts updatable" ON public.alerts FOR UPDATE USING (true);

CREATE INDEX schemes_state_idx ON public.schemes(state_scope);
CREATE INDEX alerts_session_idx ON public.alerts(session_key, created_at DESC);
