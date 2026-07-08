
DROP POLICY IF EXISTS "Sessions insertable" ON public.sessions;
DROP POLICY IF EXISTS "Sessions updatable" ON public.sessions;
DROP POLICY IF EXISTS "Alerts insertable" ON public.alerts;
DROP POLICY IF EXISTS "Alerts updatable" ON public.alerts;
REVOKE INSERT, UPDATE ON public.sessions FROM anon, authenticated;
REVOKE INSERT, UPDATE ON public.alerts FROM anon, authenticated;
