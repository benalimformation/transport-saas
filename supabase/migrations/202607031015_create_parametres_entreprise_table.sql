-- Create parametres_entreprise table for company settings
CREATE TABLE parametres_entreprise (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID NOT NULL REFERENCES entreprises(id) ON DELETE CASCADE,
  nom VARCHAR(255) NOT NULL,
  adresse TEXT,
  telephone VARCHAR(50),
  email VARCHAR(255),
  site_web VARCHAR(255),
  siret VARCHAR(50),
  tva_intra VARCHAR(50),
  iban VARCHAR(50),
  bic VARCHAR(50),
  conditions_paiement VARCHAR(100) DEFAULT 'Paiement à 30 jours',
  tva_defaut DECIMAL(5,2) DEFAULT 20.00,
  prefixe_devis VARCHAR(20) DEFAULT 'DEV-',
  prefixe_factures VARCHAR(20) DEFAULT 'FACT-',
  mentions_legales TEXT DEFAULT 'Document généré automatiquement par Transport SaaS',
  couleur_primaire VARCHAR(20) DEFAULT '#3b82f6',
  logo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT unique_entreprise_params UNIQUE (entreprise_id)
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_parametres_entreprise_updated_at
BEFORE UPDATE ON parametres_entreprise
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Comment on table
COMMENT ON TABLE parametres_entreprise IS 'Table de stockage des paramètres de l''entreprise pour la personnalisation des documents (devis, factures, CMR)';

-- Comment on columns
COMMENT ON COLUMN parametres_entreprise.nom IS 'Nom de l''entreprise';
COMMENT ON COLUMN parametres_entreprise.adresse IS 'Adresse complète de l''entreprise';
COMMENT ON COLUMN parametres_entreprise.telephone IS 'Numéro de téléphone de l''entreprise';
COMMENT ON COLUMN parametres_entreprise.email IS 'Email de contact de l''entreprise';
COMMENT ON COLUMN parametres_entreprise.site_web IS 'Site web de l''entreprise';
COMMENT ON COLUMN parametres_entreprise.siret IS 'Numéro SIRET de l''entreprise';
COMMENT ON COLUMN parametres_entreprise.tva_intra IS 'Numéro de TVA intracommunautaire';
COMMENT ON COLUMN parametres_entreprise.iban IS 'IBAN pour les paiements';
COMMENT ON COLUMN parametres_entreprise.bic IS 'Code BIC pour les paiements internationaux';
COMMENT ON COLUMN parametres_entreprise.conditions_paiement IS 'Conditions de paiement par défaut';
COMMENT ON COLUMN parametres_entreprise.tva_defaut IS 'Taux de TVA par défaut en pourcentage';
COMMENT ON COLUMN parametres_entreprise.prefixe_devis IS 'Préfixe pour la numérotation des devis';
COMMENT ON COLUMN parametres_entreprise.prefixe_factures IS 'Préfixe pour la numérotation des factures';
COMMENT ON COLUMN parametres_entreprise.mentions_legales IS 'Mentions légales pour les documents';
COMMENT ON COLUMN parametres_entreprise.couleur_primaire IS 'Couleur principale pour le branding';
COMMENT ON COLUMN parametres_entreprise.logo_url IS 'URL du logo de l''entreprise';