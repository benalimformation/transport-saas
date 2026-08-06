-- Migration initiale extraite du projet Supabase original
-- Extrait en lecture seule, sans données, sans politiques Auth
-- Date: 2026-06-24

-- Table entreprises
CREATE TABLE entreprises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR NOT NULL,
    adresse TEXT,
    email VARCHAR,
    telephone VARCHAR,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table camions
CREATE TABLE camions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    immatriculation VARCHAR NOT NULL,
    marque VARCHAR,
    modele VARCHAR,
    statut VARCHAR,
    date_livraison DATE,
    heure_limite TIME,
    entreprise_id UUID REFERENCES entreprises(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table Chauffeurs
CREATE TABLE Chauffeurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR,
    email VARCHAR,
    telephone VARCHAR,
    statut VARCHAR,
    entreprise_id UUID REFERENCES entreprises(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table clients
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR,
    adresse TEXT,
    email VARCHAR,
    telephone VARCHAR,
    observation TEXT,
    entreprise_id UUID REFERENCES entreprises(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table depenses
CREATE TABLE depenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR,
    montant DECIMAL,
    date_depense DATE,
    commentaire TEXT,
    camion_id UUID REFERENCES camions(id),
    chauffeur_id UUID REFERENCES Chauffeurs(id),
    entreprise_id UUID REFERENCES entreprises(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table devis
CREATE TABLE devis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client VARCHAR,
    client_id UUID REFERENCES clients(id),
    depart VARCHAR,
    arrivee VARCHAR,
    distance_km INTEGER,
    palettes INTEGER,
    poids DECIMAL,
    date_transport DATE,
    prix_ht DECIMAL,
    tva DECIMAL,
    prix_ttc DECIMAL,
    prix DECIMAL,
    statut VARCHAR,
    entreprise_id UUID REFERENCES entreprises(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table livraisons
CREATE TABLE livraisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client VARCHAR,
    client_id UUID REFERENCES clients(id),
    adresse_depart TEXT,
    adresse_arrivee TEXT,
    destinataire VARCHAR,
    lieu_prise_en_charge TEXT,
    marchandises TEXT,
    emballage VARCHAR,
    nombre_colis VARCHAR,
    poids_brut VARCHAR,
    volume VARCHAR,
    reserves TEXT,
    instructions_cmr TEXT,
    documents_annexes TEXT,
    prix_ht DECIMAL,
    tva DECIMAL,
    prix_ttc DECIMAL,
    date_livraison DATE,
    heure_limite TIME,
    camion_id UUID REFERENCES camions(id),
    chauffeur_id UUID REFERENCES Chauffeurs(id),
    signature_chauffeur TEXT,
    signature_destinataire TEXT,
    date_signature DATE,
    statut VARCHAR,
    entreprise_id UUID REFERENCES entreprises(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table factures
CREATE TABLE factures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client VARCHAR,
    client_id UUID REFERENCES clients(id),
    numero VARCHAR,
    date_facture DATE,
    date_echeance DATE,
    date_paiement DATE,
    montant_ht DECIMAL,
    tva DECIMAL,
    montant_ttc DECIMAL,
    statut VARCHAR,
    livraison_id UUID REFERENCES livraisons(id),
    entreprise_id UUID REFERENCES entreprises(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table profils
CREATE TABLE profils (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom VARCHAR,
    email VARCHAR,
    role VARCHAR,
    entreprise_id UUID REFERENCES entreprises(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX idx_camions_entreprise_id ON camions(entreprise_id);
CREATE INDEX idx_chauffeurs_entreprise_id ON Chauffeurs(entreprise_id);
CREATE INDEX idx_clients_entreprise_id ON clients(entreprise_id);
CREATE INDEX idx_devis_entreprise_id ON devis(entreprise_id);
CREATE INDEX idx_livraisons_entreprise_id ON livraisons(entreprise_id);
CREATE INDEX idx_factures_entreprise_id ON factures(entreprise_id);
CREATE INDEX idx_depenses_entreprise_id ON depenses(entreprise_id);
CREATE INDEX idx_profils_entreprise_id ON profils(entreprise_id);

CREATE INDEX idx_devis_client_id ON devis(client_id);
CREATE INDEX idx_livraisons_client_id ON livraisons(client_id);
CREATE INDEX idx_factures_client_id ON factures(client_id);
CREATE INDEX idx_livraisons_camion_id ON livraisons(camion_id);
CREATE INDEX idx_livraisons_chauffeur_id ON livraisons(chauffeur_id);
CREATE INDEX idx_factures_livraison_id ON factures(livraison_id);
CREATE INDEX idx_depenses_camion_id ON depenses(camion_id);
CREATE INDEX idx_depenses_chauffeur_id ON depenses(chauffeur_id);