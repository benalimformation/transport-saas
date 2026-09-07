-- TransportERP
-- Mise à niveau conformité des devis
-- IMPORTANT : migration préparée mais à contrôler avant application.

-- ============================================================
-- 1. INFORMATIONS JURIDIQUES DE L'ENTREPRISE
-- ============================================================

ALTER TABLE public.parametres_entreprise
  ADD COLUMN IF NOT EXISTS forme_juridique VARCHAR(100),
  ADD COLUMN IF NOT EXISTS capital_social NUMERIC(15,2),
  ADD COLUMN IF NOT EXISTS rcs_ville VARCHAR(150),
  ADD COLUMN IF NOT EXISTS duree_validite_devis_jours INTEGER DEFAULT 30;

ALTER TABLE public.parametres_entreprise
  DROP CONSTRAINT IF EXISTS check_duree_validite_devis_positive;

ALTER TABLE public.parametres_entreprise
  ADD CONSTRAINT check_duree_validite_devis_positive
  CHECK (
    duree_validite_devis_jours IS NULL
    OR duree_validite_devis_jours > 0
  );

COMMENT ON COLUMN public.parametres_entreprise.forme_juridique
  IS 'Forme juridique de l entreprise : SAS, SARL, EI, EURL, etc.';

COMMENT ON COLUMN public.parametres_entreprise.capital_social
  IS 'Capital social en euros lorsque applicable.';

COMMENT ON COLUMN public.parametres_entreprise.rcs_ville
  IS 'Ville du registre du commerce et des societes lorsque applicable.';

COMMENT ON COLUMN public.parametres_entreprise.duree_validite_devis_jours
  IS 'Duree de validite par defaut des devis, distincte des conditions de paiement.';


-- ============================================================
-- 2. INFORMATIONS CONTRACTUELLES ET TRANSPORT DU DEVIS
-- ============================================================

ALTER TABLE public.devis
  ADD COLUMN IF NOT EXISTS validite_jusqu_au DATE,
  ADD COLUMN IF NOT EXISTS reference_client TEXT,
  ADD COLUMN IF NOT EXISTS nature_marchandise TEXT,
  ADD COLUMN IF NOT EXISTS nombre_colis BIGINT,
  ADD COLUMN IF NOT EXISTS volume_m3 NUMERIC(12,3),

  ADD COLUMN IF NOT EXISTS expediteur_nom TEXT,
  ADD COLUMN IF NOT EXISTS expediteur_adresse TEXT,

  ADD COLUMN IF NOT EXISTS destinataire_nom TEXT,
  ADD COLUMN IF NOT EXISTS destinataire_adresse TEXT,

  ADD COLUMN IF NOT EXISTS date_chargement DATE,
  ADD COLUMN IF NOT EXISTS heure_chargement TIME,

  ADD COLUMN IF NOT EXISTS date_dechargement DATE,
  ADD COLUMN IF NOT EXISTS heure_dechargement TIME,

  ADD COLUMN IF NOT EXISTS prestations_annexes TEXT,
  ADD COLUMN IF NOT EXISTS conditions_particulieres TEXT;


-- ============================================================
-- 3. CONTROLES DE COHERENCE NON DESTRUCTIFS
-- ============================================================

ALTER TABLE public.devis
  DROP CONSTRAINT IF EXISTS check_devis_nombre_colis_non_negatif;

ALTER TABLE public.devis
  ADD CONSTRAINT check_devis_nombre_colis_non_negatif
  CHECK (
    nombre_colis IS NULL
    OR nombre_colis >= 0
  );

ALTER TABLE public.devis
  DROP CONSTRAINT IF EXISTS check_devis_volume_non_negatif;

ALTER TABLE public.devis
  ADD CONSTRAINT check_devis_volume_non_negatif
  CHECK (
    volume_m3 IS NULL
    OR volume_m3 >= 0
  );

ALTER TABLE public.devis
  DROP CONSTRAINT IF EXISTS check_devis_validite_coherente;

ALTER TABLE public.devis
  ADD CONSTRAINT check_devis_validite_coherente
  CHECK (
    validite_jusqu_au IS NULL
    OR created_at IS NULL
    OR validite_jusqu_au >= created_at::date
  );


-- ============================================================
-- 4. DOCUMENTATION DES NOUVEAUX CHAMPS
-- ============================================================

COMMENT ON COLUMN public.devis.validite_jusqu_au
  IS 'Date limite de validite contractuelle de l offre.';

COMMENT ON COLUMN public.devis.reference_client
  IS 'Reference commande, dossier ou reference interne fournie par le client.';

COMMENT ON COLUMN public.devis.nature_marchandise
  IS 'Description de la nature de la marchandise transportee.';

COMMENT ON COLUMN public.devis.nombre_colis
  IS 'Nombre de colis ou unites de manutention lorsque applicable.';

COMMENT ON COLUMN public.devis.volume_m3
  IS 'Volume total de la marchandise en metres cubes lorsque applicable.';

COMMENT ON COLUMN public.devis.expediteur_nom
  IS 'Nom ou raison sociale de l expediteur.';

COMMENT ON COLUMN public.devis.expediteur_adresse
  IS 'Adresse du lieu ou de l entite expediteur.';

COMMENT ON COLUMN public.devis.destinataire_nom
  IS 'Nom ou raison sociale du destinataire.';

COMMENT ON COLUMN public.devis.destinataire_adresse
  IS 'Adresse du lieu ou de l entite destinataire.';

COMMENT ON COLUMN public.devis.date_chargement
  IS 'Date prevue de chargement.';

COMMENT ON COLUMN public.devis.heure_chargement
  IS 'Heure prevue de chargement lorsque connue.';

COMMENT ON COLUMN public.devis.date_dechargement
  IS 'Date prevue de dechargement.';

COMMENT ON COLUMN public.devis.heure_dechargement
  IS 'Heure prevue de dechargement lorsque connue.';

COMMENT ON COLUMN public.devis.prestations_annexes
  IS 'Prestations annexes au transport : manutention, attente, hayon, ADR, etc.';

COMMENT ON COLUMN public.devis.conditions_particulieres
  IS 'Conditions contractuelles particulieres applicables au devis.';