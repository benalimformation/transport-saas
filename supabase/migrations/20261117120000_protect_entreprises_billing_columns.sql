-- ROUTCH - Protection des colonnes de facturation
-- Les utilisateurs authentifies ne peuvent modifier
-- que les coordonnees de leur entreprise.
-- Les politiques RLS existantes restent applicables.

BEGIN;

REVOKE UPDATE ON TABLE public.entreprises FROM anon, authenticated;

GRANT UPDATE (
    nom,
    adresse,
    code_postal,
    ville,
    pays,
    telephone,
    email
) ON TABLE public.entreprises TO authenticated;

COMMIT;