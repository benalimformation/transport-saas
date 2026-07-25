BEGIN;

-- Migration: Fondation de l'essai gratuit de 30 jours et de l'abonnement
-- Date: 2026-07-26
-- Objectif: Ajouter les colonnes nécessaires à l'essai gratuit de 30 jours
--           et mettre à jour la fonction d'inscription pour initialiser automatiquement l'essai

-- A. Ajout des colonnes d'essai et d'abonnement à la table entreprises
ALTER TABLE public.entreprises
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS current_period_end timestamptz;

-- B. Contrainte CHECK pour subscription_status (simplifiée, sans NULL)
ALTER TABLE public.entreprises
  DROP CONSTRAINT IF EXISTS check_subscription_status;

ALTER TABLE public.entreprises
  ADD CONSTRAINT check_subscription_status
  CHECK (
    subscription_status IN (
      'trialing',
      'active',
      'past_due',
      'unpaid',
      'canceled',
      'expired',
      'incomplete'
    )
  );

-- C. Valeurs par défaut pour les nouvelles lignes
ALTER TABLE public.entreprises
  ALTER COLUMN trial_started_at SET DEFAULT now(),
  ALTER COLUMN trial_ends_at SET DEFAULT (now() + interval '30 days'),
  ALTER COLUMN subscription_status SET DEFAULT 'trialing';

-- D. Backfill corrigé des entreprises existantes
-- trial_ends_at est calculé à partir de trial_started_at lorsqu'il existe
UPDATE public.entreprises
SET
  trial_started_at = COALESCE(trial_started_at, now()),
  trial_ends_at = COALESCE(
    trial_ends_at,
    COALESCE(trial_started_at, now()) + interval '30 days'
  ),
  subscription_status = COALESCE(subscription_status, 'trialing')
WHERE
  trial_started_at IS NULL
  OR trial_ends_at IS NULL
  OR subscription_status IS NULL;

-- E. Contraintes NOT NULL après backfill (sécurisé)
ALTER TABLE public.entreprises
  ALTER COLUMN trial_started_at SET NOT NULL,
  ALTER COLUMN trial_ends_at SET NOT NULL,
  ALTER COLUMN subscription_status SET NOT NULL;

-- F. Contrainte temporelle trial_ends_at > trial_started_at
ALTER TABLE public.entreprises
  DROP CONSTRAINT IF EXISTS check_trial_dates;

ALTER TABLE public.entreprises
  ADD CONSTRAINT check_trial_dates
  CHECK (trial_ends_at > trial_started_at);

-- G. Index uniques partiels Stripe (ignore les NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_entreprises_stripe_customer_id
ON public.entreprises (stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_entreprises_stripe_subscription_id
ON public.entreprises (stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- H. Mise à jour de la fonction d'inscription avec initialisation explicite de l'essai
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
BEGIN
  -- Lire et nettoyer les métadonnées fournies par le formulaire d'inscription
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

  -- Valider que nom_entreprise n'est pas vide
  IF v_nom_entreprise IS NULL THEN
    RAISE EXCEPTION 'Le nom de l''entreprise est obligatoire';
  END IF;

  -- Utiliser une valeur par défaut si le nom utilisateur est absent
  IF v_nom_utilisateur IS NULL THEN
    v_nom_utilisateur := NEW.email;
  END IF;

  -- Créer une vraie ligne dans public.entreprises avec les colonnes réelles
  -- Y COMPRIS LES NOUVELLES COLONNES D'ESSAI INITIALISÉES EXPLICITEMENT
  INSERT INTO public.entreprises(
    nom,
    email,
    trial_started_at,
    trial_ends_at,
    subscription_status
  ) VALUES (
    v_nom_entreprise,
    NEW.email,
    now(),
    now() + interval '30 days',
    'trialing'
  ) RETURNING id INTO new_entreprise_id;

  -- Créer public.profils avec rôle admin
  INSERT INTO public.profils(
    id,
    email,
    nom,
    role,
    entreprise_id
  ) VALUES (
    NEW.id,
    NEW.email,
    v_nom_utilisateur,
    'admin', -- Premier utilisateur = admin
    new_entreprise_id
  );

  -- Créer parametres_entreprise (table existante pour les paramètres)
  INSERT INTO public.parametres_entreprise(
    entreprise_id,
    nom
  ) VALUES (
    new_entreprise_id,
    v_nom_entreprise
  );

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Annuler toutes les insertions en cas d'erreur (ROLLBACK implicite)
    RAISE;
END;
$$;

-- I. Commentaires SQL explicatifs
COMMENT ON COLUMN public.entreprises.trial_started_at IS
'Date de début de l''essai gratuit. Initialisé automatiquement à la création de l''entreprise.';

COMMENT ON COLUMN public.entreprises.trial_ends_at IS
'Date de fin de l''essai gratuit (30 jours après trial_started_at).';

COMMENT ON COLUMN public.entreprises.subscription_status IS
'Statut de l''abonnement : trialing (essai), active, past_due, unpaid, canceled, expired, incomplete.';

COMMENT ON COLUMN public.entreprises.stripe_customer_id IS
'Identifiant Stripe du client, rempli lors du premier paiement.';

COMMENT ON COLUMN public.entreprises.stripe_subscription_id IS
'Identifiant Stripe de l''abonnement actif.';

COMMENT ON COLUMN public.entreprises.current_period_end IS
'Date de fin de la période de facturation en cours (pour les abonnements actifs).';

COMMIT;