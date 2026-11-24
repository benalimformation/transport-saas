-- ROUTCH: tenant isolation for entreprises and profils.
-- REVIEW BEFORE APPLYING. Do not execute against production without approval.
BEGIN;

-- Helper runs as postgres when migration is applied by the database owner.
CREATE OR REPLACE FUNCTION public.current_user_entreprise_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT p.entreprise_id
  FROM public.profils AS p
  WHERE p.id = (SELECT auth.uid())
  LIMIT 1
$$;
ALTER FUNCTION public.current_user_entreprise_id() OWNER TO postgres;
REVOKE ALL ON FUNCTION public.current_user_entreprise_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_entreprise_id() TO authenticated;

ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profils ENABLE ROW LEVEL SECURITY;

-- Remove known permissive policies and prior restrictive policy names.
DROP POLICY IF EXISTS "Allow insert entreprises" ON public.entreprises;
DROP POLICY IF EXISTS "Allow read entreprises" ON public.entreprises;
DROP POLICY IF EXISTS "Allow update entreprises" ON public.entreprises;
DROP POLICY IF EXISTS "select_own_entreprise" ON public.entreprises;
DROP POLICY IF EXISTS "update_own_entreprise" ON public.entreprises;
DROP POLICY IF EXISTS "Allow insert profils" ON public.profils;
DROP POLICY IF EXISTS "Allow read profils" ON public.profils;
DROP POLICY IF EXISTS "read_own_profile" ON public.profils;
DROP POLICY IF EXISTS "update_own_profile" ON public.profils;

CREATE POLICY "select_own_entreprise" ON public.entreprises
FOR SELECT TO authenticated
USING (id = (SELECT public.current_user_entreprise_id()));

CREATE POLICY "update_own_entreprise" ON public.entreprises
FOR UPDATE TO authenticated
USING (id = (SELECT public.current_user_entreprise_id()))
WITH CHECK (id = (SELECT public.current_user_entreprise_id()));

CREATE POLICY "select_company_profiles" ON public.profils
FOR SELECT TO authenticated
USING (entreprise_id = (SELECT public.current_user_entreprise_id()));

-- Own non-sensitive profile fields only; column grants further constrain updates.
CREATE POLICY "update_own_profile" ON public.profils
FOR UPDATE TO authenticated
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()) AND entreprise_id = (SELECT public.current_user_entreprise_id()));

-- Revoke table-level grants, including those inherited via PUBLIC.
REVOKE ALL ON TABLE public.entreprises FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.profils FROM PUBLIC, anon, authenticated;

GRANT SELECT ON TABLE public.entreprises TO authenticated;
GRANT UPDATE (nom, adresse, code_postal, ville, pays, telephone, email)
ON TABLE public.entreprises TO authenticated;
GRANT SELECT ON TABLE public.profils TO authenticated;
GRANT UPDATE (email, nom) ON TABLE public.profils TO authenticated;

-- No client INSERT/DELETE grant for either table. Signup is handled by
-- postgres-owned SECURITY DEFINER trigger handle_new_company_user().
COMMIT;
