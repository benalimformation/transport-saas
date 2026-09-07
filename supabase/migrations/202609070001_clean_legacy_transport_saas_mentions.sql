-- TransportERP
-- Nettoyage de l'ancienne mention "Transport SaaS"
-- Migration non destructive

-- 1. Supprime l'ancien texte par défaut pour les nouveaux comptes
ALTER TABLE public.parametres_entreprise
  ALTER COLUMN mentions_legales DROP DEFAULT;

-- 2. Nettoie uniquement les enregistrements qui contiennent exactement
--    l'ancienne mention par défaut.
UPDATE public.parametres_entreprise
SET mentions_legales = NULL
WHERE mentions_legales = 'Document généré automatiquement par Transport SaaS';