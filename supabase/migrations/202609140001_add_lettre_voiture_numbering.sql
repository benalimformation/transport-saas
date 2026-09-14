-- Numérotation professionnelle et atomique des lettres de voiture TransportERP
-- Format : LV-ANNEE-NUMERO
-- Exemple : LV-2026-000001
--
-- Le compteur est indépendant pour chaque entreprise et chaque année.
-- L'attribution est effectuée côté PostgreSQL afin d'éviter les doublons
-- en cas de créations simultanées.

ALTER TABLE public.livraisons
ADD COLUMN IF NOT EXISTS numero_lettre_voiture TEXT;
CREATE TABLE IF NOT EXISTS public.lettre_voiture_counters (
    entreprise_id UUID NOT NULL,
    annee INTEGER NOT NULL,
    dernier_numero INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT lettre_voiture_counters_pkey
        PRIMARY KEY (entreprise_id, annee)
);
CREATE UNIQUE INDEX IF NOT EXISTS livraisons_entreprise_numero_lettre_unique
ON public.livraisons (entreprise_id, numero_lettre_voiture)
WHERE numero_lettre_voiture IS NOT NULL;
CREATE OR REPLACE FUNCTION public.assign_lettre_voiture_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_annee INTEGER;
    v_numero INTEGER;
BEGIN
    -- Ne jamais remplacer un numéro déjà attribué.
    IF NEW.numero_lettre_voiture IS NOT NULL
       AND btrim(NEW.numero_lettre_voiture) <> '' THEN
        RETURN NEW;
    END IF;

    IF NEW.entreprise_id IS NULL THEN
        RAISE EXCEPTION
            'Impossible de numéroter la lettre de voiture : entreprise_id absent';
    END IF;

    -- L'année est celle de la création de la livraison.
    v_annee := EXTRACT(
        YEAR FROM COALESCE(NEW.created_at, NOW())
    )::INTEGER;
        -- Incrément atomique du compteur.
    INSERT INTO public.lettre_voiture_counters (
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
        public.lettre_voiture_counters.dernier_numero + 1
    RETURNING dernier_numero
    INTO v_numero;
        NEW.numero_lettre_voiture :=
        'LV-'
        || v_annee::TEXT
        || '-'
        || lpad(v_numero::TEXT, 6, '0');

    RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_assign_lettre_voiture_number
ON public.livraisons;

CREATE TRIGGER trg_assign_lettre_voiture_number
BEFORE INSERT ON public.livraisons
FOR EACH ROW
EXECUTE FUNCTION public.assign_lettre_voiture_number();
ALTER TABLE public.lettre_voiture_counters ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.lettre_voiture_counters
FROM anon, authenticated;
-- Numéroter les livraisons existantes qui n'ont pas encore
-- de numéro de lettre de voiture.
DO $$
DECLARE
    r RECORD;
    v_annee INTEGER;
    v_numero INTEGER;
BEGIN
    FOR r IN
        SELECT id, entreprise_id, created_at
        FROM public.livraisons
        WHERE numero_lettre_voiture IS NULL
           OR btrim(numero_lettre_voiture) = ''
        ORDER BY entreprise_id, created_at, id
    LOOP
        IF r.entreprise_id IS NULL THEN
            RAISE EXCEPTION
                'Impossible de numéroter la livraison % : entreprise_id absent',
                r.id;
        END IF;

        v_annee := EXTRACT(
            YEAR FROM COALESCE(r.created_at, NOW())
        )::INTEGER;

        INSERT INTO public.lettre_voiture_counters (
            entreprise_id,
            annee,
            dernier_numero
        )
        VALUES (
            r.entreprise_id,
            v_annee,
            1
        )
        ON CONFLICT (entreprise_id, annee)
        DO UPDATE
        SET dernier_numero =
            public.lettre_voiture_counters.dernier_numero + 1
        RETURNING dernier_numero
        INTO v_numero;

        UPDATE public.livraisons
        SET numero_lettre_voiture =
            'LV-'
            || v_annee::TEXT
            || '-'
            || lpad(v_numero::TEXT, 6, '0')
        WHERE id = r.id;
    END LOOP;
END;
$$;