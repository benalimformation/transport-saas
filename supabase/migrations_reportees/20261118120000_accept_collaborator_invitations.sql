-- ROUTCH - rattachement des invites, sans toucher aux anciennes migrations.
-- NE PAS appliquer sur Supabase distant sans validation explicite.
BEGIN;
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
  -- Invitation : le compte Auth est créé sans profil ni entreprise.
  -- Le rattachement n'intervient qu'après confirmation de l'email.
  IF NEW.raw_user_meta_data ? 'invitation_token' THEN
    IF COALESCE(NEW.raw_user_meta_data ->> 'invitation_token', '') !~ '^[0-9a-f]{64}$' THEN
      RAISE EXCEPTION 'Invitation invalide';
    END IF;
    PERFORM 1 FROM public.invitations_collaborateurs i
    WHERE i.token_hash = encode(pg_catalog.sha256(convert_to(NEW.raw_user_meta_data ->> 'invitation_token', 'UTF8')), 'hex')
      AND i.statut = 'pending'
      AND i.expires_at > NOW()
      AND LOWER(BTRIM(i.email)) = LOWER(BTRIM(NEW.email));
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Invitation invalide ou expiree';
    END IF;
    RETURN NEW;
  END IF;
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

-- Seul le service_role peut appeler cette fonction.
-- La fonction vérifie directement la confirmation email dans auth.users.
CREATE OR REPLACE FUNCTION public.accepter_invitation_collaborateur(
  p_user_id uuid, p_token text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_inv public.invitations_collaborateurs%ROWTYPE;
  v_email text;
BEGIN
  IF p_token IS NULL OR p_token !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Invitation invalide';
  END IF;
  SELECT email INTO v_email FROM auth.users
  WHERE id = p_user_id AND email_confirmed_at IS NOT NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Adresse email non confirmee';
  END IF;
  SELECT * INTO v_inv FROM public.invitations_collaborateurs
  WHERE token_hash = encode(pg_catalog.sha256(convert_to(p_token, 'UTF8')), 'hex')
    AND statut = 'pending' AND expires_at > NOW()
    AND LOWER(BTRIM(email)) = LOWER(BTRIM(v_email))
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation invalide ou expiree';
  END IF;
  IF EXISTS (SELECT 1 FROM public.profils WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Compte deja rattache';
  END IF;
  INSERT INTO public.profils (id,email,nom,role,entreprise_id)
  VALUES (p_user_id,v_email,v_inv.nom,v_inv.role,v_inv.entreprise_id);
  UPDATE public.invitations_collaborateurs
  SET statut = 'accepted', accepted_user_id = p_user_id, accepted_at = NOW()
  WHERE id = v_inv.id;
  RETURN v_inv.entreprise_id;
END;
$$;
REVOKE ALL ON FUNCTION public.accepter_invitation_collaborateur(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accepter_invitation_collaborateur(uuid,text) TO service_role;
COMMIT;
