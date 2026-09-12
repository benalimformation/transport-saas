ALTER TABLE public.livraisons
ADD COLUMN IF NOT EXISTS pays_depart TEXT DEFAULT 'France',
ADD COLUMN IF NOT EXISTS pays_arrivee TEXT DEFAULT 'France';