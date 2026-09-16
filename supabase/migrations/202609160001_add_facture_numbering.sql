-- Numérotation professionnelle et atomique des factures TransportERP
-- Format : PREFIXE-ANNEE-NUMERO
-- Exemple avec le préfixe par défaut : FACT-2026-000001
--
-- Le compteur est indépendant pour chaque entreprise et chaque année.
-- Les numéros de factures déjà existants sont conservés.

-- 1. Table technique des compteurs
CREATE TABLE IF NOT EXISTS public.facture_counters (
    entreprise_id UUID NOT NULL,
    annee INTEGER NOT NULL,
    dernier_numero INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT facture_counters_pkey
        PRIMARY KEY (entreprise_id, annee)
);

-- 2. Empêcher deux factures d'une même entreprise
-- d'avoir le même numéro.
CREATE UNIQUE INDEX IF NOT EXISTS factures_entreprise_numero_unique
ON public.factures (entreprise_id, numero)
WHERE numero IS NOT NULL
  AND btrim(numero) <> '';

-- 3. Fonction d'attribution atomique du numéro.
CREATE OR REPLACE FUNCTION public.assign_facture_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_annee INTEGER;
    v_numero INTEGER;
    v_prefixe TEXT;
BEGIN
    -- Ne jamais remplacer un numéro déjà attribué.
    IF NEW.numero IS NOT NULL
       AND btrim(NEW.numero) <> '' THEN
        RETURN NEW;
    END IF;

    IF NEW.entreprise_id IS NULL THEN
        RAISE EXCEPTION
            'Impossible de numéroter la facture : entreprise_id absent';
    END IF;

    -- L'année correspond à la date de facture.
    v_annee := EXTRACT(
        YEAR FROM COALESCE(
            NEW.date_facture,
            NEW.created_at::date,
            CURRENT_DATE
        )
    )::INTEGER;

    -- Préfixe configuré pour l'entreprise.
    SELECT NULLIF(btrim(prefixe_factures), '')
    INTO v_prefixe
    FROM public.parametres_entreprise
    WHERE entreprise_id = NEW.entreprise_id
    LIMIT 1;

    -- Valeur de secours.
    v_prefixe := COALESCE(v_prefixe, 'FACT-');

    -- Normaliser pour éviter FACT--2026...
    v_prefixe := regexp_replace(v_prefixe, '-+$', '');

    -- Incrément atomique.
    INSERT INTO public.facture_counters (
        entreprise_id,
        annee,
        dernier_numero
    )
    VALUES (
        NEW.entreprise_id,
        v_annee,
        1
    )
    ON CONFLICT (entreprise_id, annee)
    DO UPDATE
    SET dernier_numero =
        public.facture_counters.dernier_numero + 1
    RETURNING dernier_numero
    INTO v_numero;

    NEW.numero :=
        v_prefixe
        || '-'
        || v_annee::TEXT
        || '-'
        || lpad(v_numero::TEXT, 6, '0');

    RETURN NEW;
END;
$$;

-- 4. Trigger automatique pour chaque nouvelle facture.
DROP TRIGGER IF EXISTS trg_assign_facture_number
ON public.factures;

CREATE TRIGGER trg_assign_facture_number
BEFORE INSERT ON public.factures
FOR EACH ROW
EXECUTE FUNCTION public.assign_facture_number();

-- 5. Sécuriser la table technique des compteurs.
ALTER TABLE public.facture_counters ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.facture_counters
FROM anon, authenticated;
