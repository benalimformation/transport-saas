ALTER TABLE public.livraisons
ADD COLUMN IF NOT EXISTS expediteur TEXT,
ADD COLUMN IF NOT EXISTS date_prise_en_charge DATE;