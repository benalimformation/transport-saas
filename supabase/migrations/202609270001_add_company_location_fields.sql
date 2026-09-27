-- Add structured company location fields.
-- Existing `adresse` is preserved for backward compatibility.

ALTER TABLE public.entreprises
  ADD COLUMN IF NOT EXISTS code_postal text,
  ADD COLUMN IF NOT EXISTS ville text,
  ADD COLUMN IF NOT EXISTS pays text;

COMMENT ON COLUMN public.entreprises.code_postal IS
  'Postal code of the company address.';

COMMENT ON COLUMN public.entreprises.ville IS
  'City of the company address.';

COMMENT ON COLUMN public.entreprises.pays IS
  'Country of the company address.';