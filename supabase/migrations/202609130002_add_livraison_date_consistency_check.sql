ALTER TABLE public.livraisons
ADD CONSTRAINT check_livraison_dates_coherentes
CHECK (
  date_prise_en_charge IS NULL
  OR date_livraison IS NULL
  OR date_livraison >= date_prise_en_charge
)
NOT VALID;