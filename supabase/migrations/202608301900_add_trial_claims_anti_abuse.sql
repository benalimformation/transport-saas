-- Anti-abus essai gratuit :
-- un même SIRET ne peut bénéficier que d'un seul essai gratuit.
-- Aucun backfill des entreprises existantes.
BEGIN;
CREATE TABLE public.trial_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  siret TEXT NOT NULL,
  first_trial_started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  first_entreprise_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT trial_claims_siret_unique UNIQUE (siret),
  CONSTRAINT trial_claims_siret_format
    CHECK (siret ~ '^[0-9]{14}$')
);

ALTER TABLE public.trial_claims ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.trial_claims FROM PUBLIC;
REVOKE ALL ON TABLE public.trial_claims FROM anon;
REVOKE ALL ON TABLE public.trial_claims FROM authenticated;


CREATE OR REPLACE FUNCTION public.handle_new_company_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  new_entreprise_id UUID;
  v_nom_entreprise TEXT;
  v_nom_utilisateur TEXT;
  v_siret TEXT;
  v_claim_id UUID;
  v_first_trial BOOLEAN := FALSE;
BEGIN
  v_nom_entreprise :=
  NULLIF(
    BTRIM(
      COALESCE(
        NEW.raw_user_meta_data ->> 'nom_entreprise',
        ''
      )
    ),
    ''
  );

v_nom_utilisateur :=
  NULLIF(
    BTRIM(
      COALESCE(
        NEW.raw_user_meta_data ->> 'nom_utilisateur',
        ''
      )
    ),
    ''
  );

  IF v_nom_entreprise IS NULL OR btrim(v_nom_entreprise) = '' THEN
    RAISE EXCEPTION 'Le nom de l''entreprise est obligatoire';
  END IF;

  IF v_nom_utilisateur IS NULL OR btrim(v_nom_utilisateur) = '' THEN
    v_nom_utilisateur := NEW.email;
  END IF;

  v_siret := regexp_replace(
    COALESCE(NEW.raw_user_meta_data ->> 'siret', ''),
    '[^0-9]',
    '',
    'g'
  );

  IF v_siret !~ '^[0-9]{14}$' THEN
    RAISE EXCEPTION 'Un SIRET valide de 14 chiffres est obligatoire';
  END IF;

  INSERT INTO public.trial_claims (
    siret,
    first_trial_started_at
  )
  VALUES (
    v_siret,
    NOW()
  )
  ON CONFLICT (siret) DO NOTHING
  RETURNING id INTO v_claim_id;

  v_first_trial := v_claim_id IS NOT NULL;

  IF v_first_trial THEN
    INSERT INTO public.entreprises (
      nom,
      email,
      trial_started_at,
      trial_ends_at,
      subscription_status,
      trial_used
    )
    VALUES (
      v_nom_entreprise,
      NEW.email,
      NOW(),
      NOW() + INTERVAL '30 days',
      'trialing',
      TRUE
    )
    RETURNING id INTO new_entreprise_id;

    UPDATE public.trial_claims
    SET first_entreprise_id = new_entreprise_id
    WHERE id = v_claim_id;

  ELSE
    INSERT INTO public.entreprises (
      nom,
      email,
      trial_started_at,
      trial_ends_at,
      subscription_status,
      trial_used
    )
    VALUES (
      v_nom_entreprise,
      NEW.email,
      NOW() - INTERVAL '2 seconds',
      NOW() - INTERVAL '1 second',
      'trialing',
            TRUE
    )
    RETURNING id INTO new_entreprise_id;
  END IF;

  INSERT INTO public.profils (
    id,
    email,
    nom,
    role,
    entreprise_id
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_nom_utilisateur,
    'admin',
    new_entreprise_id
  );

  INSERT INTO public.parametres_entreprise (
    entreprise_id,
    nom,
    email,
    siret
  )
  VALUES (
    new_entreprise_id,
    v_nom_entreprise,
    NEW.email,
    v_siret
  );

  RETURN NEW;
END;
$$;
COMMIT;