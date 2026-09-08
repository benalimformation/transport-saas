-- Lier chaque livraison créée depuis un devis à son devis d'origine.
-- Cette relation permet également d'empêcher la création
-- de plusieurs livraisons depuis le même devis.

ALTER TABLE public.livraisons
ADD COLUMN IF NOT EXISTS devis_id UUID;

ALTER TABLE public.livraisons
DROP CONSTRAINT IF EXISTS livraisons_devis_id_fkey;

ALTER TABLE public.livraisons
ADD CONSTRAINT livraisons_devis_id_fkey
FOREIGN KEY (devis_id)
REFERENCES public.devis(id)
ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS livraisons_devis_id_unique
ON public.livraisons (devis_id)
WHERE devis_id IS NOT NULL;
