-- Migration corrective : restauration de public.parametres_entreprise
-- La table est absente du schéma distant alors que handle_new_company_user()
-- l'utilise lors de chaque nouvelle inscription.

BEGIN;

CREATE TABLE IF NOT EXISTS public.parametres_entreprise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL,
  nom VARCHAR(255) NOT NULL,
  adresse TEXT,
  telephone VARCHAR(50),
  email VARCHAR(255),
  site_web VARCHAR(255),
  siret VARCHAR(50),
  tva_intra VARCHAR(50),
  iban VARCHAR(50),
  bic VARCHAR(50),
  conditions_paiement VARCHAR(100) DEFAULT 'Paiement à 30 jours',
  tva_defaut DECIMAL(5,2) DEFAULT 20.00,
  prefixe_devis VARCHAR(20) DEFAULT 'DEV-',
  prefixe_factures VARCHAR(20) DEFAULT 'FACT-',
  mentions_legales TEXT DEFAULT 'Document généré automatiquement par Transport SaaS',
  couleur_primaire VARCHAR(20) DEFAULT '#3b82f6',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_entreprise_params UNIQUE (entreprise_id)
);

CREATE OR REPLACE FUNCTION public.update_parametres_entreprise_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS update_parametres_entreprise_updated_at
ON public.parametres_entreprise;

CREATE TRIGGER update_parametres_entreprise_updated_at
BEFORE UPDATE ON public.parametres_entreprise
FOR EACH ROW
EXECUTE FUNCTION public.update_parametres_entreprise_updated_at();

ALTER TABLE public.parametres_entreprise
ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_params"
ON public.parametres_entreprise;

DROP POLICY IF EXISTS "update_params"
ON public.parametres_entreprise;

CREATE POLICY "select_params"
ON public.parametres_entreprise
FOR SELECT
TO authenticated
USING (
  entreprise_id IN (
    SELECT profils.entreprise_id
    FROM public.profils
    WHERE profils.id = auth.uid()
  )
);

CREATE POLICY "update_params"
ON public.parametres_entreprise
FOR UPDATE
TO authenticated
USING (
  entreprise_id IN (
    SELECT profils.entreprise_id
    FROM public.profils
    WHERE profils.id = auth.uid()
  )
)
WITH CHECK (
  entreprise_id IN (
    SELECT profils.entreprise_id
    FROM public.profils
    WHERE profils.id = auth.uid()
  )
);

REVOKE ALL
ON TABLE public.parametres_entreprise
FROM PUBLIC;

GRANT SELECT, UPDATE
ON TABLE public.parametres_entreprise
TO authenticated;

ALTER TABLE public.parametres_entreprise
NO FORCE ROW LEVEL SECURITY;

COMMIT;