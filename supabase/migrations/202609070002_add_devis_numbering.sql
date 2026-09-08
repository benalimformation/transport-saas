-- Numérotation professionnelle et atomique des devis TransportERP
-- Format : PREFIXE-ANNEE-NUMERO
-- Exemple : DEV-2026-000001
--
-- Le compteur est indépendant pour chaque entreprise et chaque année.
-- L'attribution est effectuée côté PostgreSQL afin d'éviter les doublons
-- en cas de créations simultanées.

-- 1. Ajouter le numéro de devis persistant
ALTER TABLE public.devis
ADD COLUMN IF NOT EXISTS numero_devis TEXT;

-- 2. Table des compteurs de devis
CREATE TABLE IF NOT EXISTS public.devis_counters (
    entreprise_id UUID NOT NULL,
    annee INTEGER NOT NULL,
    dernier_numero INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT devis_counters_pkey
        PRIMARY KEY (entreprise_id, annee)
);

-- 3. Empêcher deux devis d'une même entreprise
-- d'avoir le même numéro.
CREATE UNIQUE INDEX IF NOT EXISTS devis_entreprise_numero_unique
ON public.devis (entreprise_id, numero_devis)
WHERE numero_devis IS NOT NULL;

-- 4. Fonction d'attribution atomique du numéro.
CREATE OR REPLACE FUNCTION public.assign_devis_number()
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
    IF NEW.numero_devis IS NOT NULL
       AND btrim(NEW.numero_devis) <> '' THEN
        RETURN NEW;
    END IF;

    IF NEW.entreprise_id IS NULL THEN
        RAISE EXCEPTION
            'Impossible de numéroter le devis : entreprise_id absent';
    END IF;

    -- L'année est celle de la création du devis.
    v_annee := EXTRACT(
        YEAR FROM COALESCE(NEW.created_at, NOW())
    )::INTEGER;

    -- Préfixe configuré pour l'entreprise.
    SELECT NULLIF(btrim(prefixe_devis), '')
    INTO v_prefixe
    FROM public.parametres_entreprise
    WHERE entreprise_id = NEW.entreprise_id
    LIMIT 1;

    -- Valeur de secours.
    v_prefixe := COALESCE(v_prefixe, 'DEV-');

    -- Normaliser pour éviter DEV--2026...
    v_prefixe := regexp_replace(v_prefixe, '-+$', '');

    -- Incrément atomique.
    INSERT INTO public.devis_counters (
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
        public.devis_counters.dernier_numero + 1
    RETURNING dernier_numero
    INTO v_numero;

    NEW.numero_devis :=
        v_prefixe
        || '-'
        || v_annee::TEXT
        || '-'
        || lpad(v_numero::TEXT, 6, '0');

    RETURN NEW;
END;
$$;

-- 5. Trigger automatique à chaque nouveau devis.
DROP TRIGGER IF EXISTS trg_assign_devis_number
ON public.devis;

CREATE TRIGGER trg_assign_devis_number
BEFORE INSERT ON public.devis
FOR EACH ROW
EXECUTE FUNCTION public.assign_devis_number();

-- 6. Sécuriser la table technique des compteurs.
ALTER TABLE public.devis_counters ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.devis_counters
FROM anon, authenticated;