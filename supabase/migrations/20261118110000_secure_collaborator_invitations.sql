-- ROUTCH - Invitations securisees des collaborateurs
-- Migration locale uniquement : ne pas appliquer sans validation.

BEGIN;

CREATE TABLE public.invitations_collaborateurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entreprise_id UUID NOT NULL
        REFERENCES public.entreprises(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nom TEXT NOT NULL,
    role TEXT NOT NULL
        CHECK (role IN ('admin', 'exploitant', 'chauffeur', 'client')),
    invite_par UUID NOT NULL
        REFERENCES auth.users(id),
    statut TEXT NOT NULL DEFAULT 'pending'
        CHECK (statut IN ('pending', 'accepted', 'revoked', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    accepted_user_id UUID UNIQUE REFERENCES auth.users(id),
    token_hash TEXT NOT NULL UNIQUE
        CHECK (token_hash ~ '^[0-9a-f]{64}$'),
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT invitations_acceptation_coherente
        CHECK (
            (
                statut = 'accepted'
                AND accepted_user_id IS NOT NULL
                AND accepted_at IS NOT NULL
            )
            OR
            (
                statut <> 'accepted'
                AND accepted_user_id IS NULL
                AND accepted_at IS NULL
            )
        ),
    CONSTRAINT invitations_email_non_vide
        CHECK (LENGTH(BTRIM(email)) > 0)
);

CREATE UNIQUE INDEX invitations_collaborateurs_pending_unique
ON public.invitations_collaborateurs (entreprise_id, LOWER(BTRIM(email)))
WHERE statut = 'pending';

ALTER TABLE public.invitations_collaborateurs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.invitations_collaborateurs
FROM PUBLIC, anon, authenticated;

-- Expiration des invitations en attente.
-- Fonction interne, non accessible aux utilisateurs.

CREATE OR REPLACE FUNCTION public.expirer_invitations_collaborateurs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.invitations_collaborateurs
    SET statut = 'expired'
    WHERE statut = 'pending'
      AND expires_at <= NOW();

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.expirer_invitations_collaborateurs()
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expirer_invitations_collaborateurs() TO service_role;
COMMIT;
