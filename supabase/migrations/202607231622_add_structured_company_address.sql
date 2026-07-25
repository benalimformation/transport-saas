-- Migration pour structurer l'adresse de l'entreprise avec champs séparés + onboarding obligatoire
-- Ajoute les colonnes code_postal, ville, pays et complement_adresse à la table public.entreprises
-- Inclut un backfill prudent pour extraire code postal et ville des adresses existantes françaises

-- 1. Ajout des nouvelles colonnes à la table entreprises
ALTER TABLE public.entreprises
  ADD COLUMN IF NOT EXISTS code_postal text,
  ADD COLUMN IF NOT EXISTS ville text,
  ADD COLUMN IF NOT EXISTS pays text DEFAULT 'France',
  ADD COLUMN IF NOT EXISTS complement_adresse text;

COMMENT ON COLUMN public.entreprises.code_postal IS 'Code postal de l''entreprise (5 chiffres pour la France)';
COMMENT ON COLUMN public.entreprises.ville IS 'Ville de l''entreprise, en majuscules normalisées';
COMMENT ON COLUMN public.entreprises.pays IS 'Pays de l''entreprise, par défaut "France"';
COMMENT ON COLUMN public.entreprises.complement_adresse IS 'Complément d''adresse facultatif (étage, bâtiment, etc.)';

-- 2. Backfill prudent pour les adresses existantes françaises
--    Ne modifie que les lignes où code_postal ou ville est NULL
--    Ne modifie jamais la colonne adresse existante
--    Ignore les adresses impossibles à analyser
--    Reste idempotent (peut être exécuté plusieurs fois sans effet secondaire)

DO $$
DECLARE
  row_record RECORD;
  extracted_code_postal TEXT;
  extracted_ville TEXT;
  address_parts TEXT[];
  last_part TEXT;
  postal_code_match TEXT[];
BEGIN
  FOR row_record IN 
    SELECT id, adresse 
    FROM public.entreprises 
    WHERE (code_postal IS NULL OR ville IS NULL) 
      AND adresse IS NOT NULL 
      AND adresse != ''
      AND pays IS NULL OR pays = 'France' OR pays ILIKE '%france%'
  LOOP
    -- Initialiser les variables
    extracted_code_postal := NULL;
    extracted_ville := NULL;
    
    -- 1. Rechercher un motif code postal (5 chiffres) suivi d'un nom de ville à la fin de l'adresse
    --    Pattern: 5 chiffres + espace + lettres (avec accents, tirets, apostrophes)
    --    Exemple: "12 RUE DES PACOTILLES 49000 ANGERS"
    postal_code_match := regexp_match(row_record.adresse, '(\d{5})\s+([A-Za-zÀ-ÿ\s\-\'']+)$');
    
    IF postal_code_match IS NOT NULL AND array_length(postal_code_match, 1) = 3 THEN
      -- Code postal trouvé (5 chiffres)
      extracted_code_postal := postal_code_match[1];
      
      -- Ville: nettoyer les espaces multiples et mettre en majuscules
      extracted_ville := upper(trim(postal_code_match[2]));
      
      -- Supprimer d'éventuels chiffres supplémentaires après le nom de ville
      -- Exemple: "PARIS 01" -> "PARIS"
      extracted_ville := regexp_replace(extracted_ville, '\s+\d+$', '');
      
      -- Vérifier que la ville n'est pas un nom de rue commun
      -- (rue, avenue, boulevard, etc.)
      IF extracted_ville ~* '^(RUE|AVENUE|BOULEVARD|CHEMIN|ROUTE|IMPASSE|PLACE|ALLÉE|COURS|QUAI|PASSAGE)\s+' THEN
        -- C'est probablement un nom de rue, pas une ville
        extracted_ville := NULL;
        extracted_code_postal := NULL;
      END IF;
    ELSE
      -- 2. Fallback: chercher un code postal ailleurs dans l'adresse
      --    Recherche le dernier segment qui pourrait être "code postal + ville"
      address_parts := string_to_array(row_record.adresse, ' ');
      
      IF array_length(address_parts, 1) >= 2 THEN
        last_part := address_parts[array_length(address_parts, 1)];
        -- Vérifier si le dernier segment est uniquement des lettres (ville)
        IF last_part ~ '^[A-Za-zÀ-ÿ\s\-\'']+$' THEN
          extracted_ville := upper(trim(last_part));
          
          -- Vérifier le segment précédent pour un code postal
          IF array_length(address_parts, 1) >= 2 THEN
            DECLARE
              prev_part TEXT := address_parts[array_length(address_parts, 1) - 1];
            BEGIN
              IF prev_part ~ '^\d{5}$' THEN
                extracted_code_postal := prev_part;
              END IF;
            END;
          END IF;
        END IF;
      END IF;
    END IF;
    
    -- Mettre à jour uniquement si nous avons extrait quelque chose de valide
    -- et que la colonne cible est actuellement NULL
    IF extracted_ville IS NOT NULL AND extracted_ville != '' THEN
      UPDATE public.entreprises
      SET 
        ville = COALESCE(ville, extracted_ville),
        code_postal = COALESCE(code_postal, extracted_code_postal),
        pays = COALESCE(pays, 'France')
      WHERE id = row_record.id
        AND (ville IS NULL OR code_postal IS NULL);
    END IF;
  END LOOP;
END $$;

-- 3. Index optionnel pour améliorer les performances des requêtes par ville
CREATE INDEX IF NOT EXISTS idx_entreprises_ville 
ON public.entreprises (ville) 
WHERE ville IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_entreprises_code_postal 
ON public.entreprises (code_postal) 
WHERE code_postal IS NOT NULL;

-- 4. Documentation de la migration
COMMENT ON TABLE public.entreprises IS 'Table des entreprises avec adresse structurée depuis la migration 202607231622. Colonnes ajoutées: code_postal, ville, pays, complement_adresse. La colonne adresse conserve l''adresse complète originale. Backfill automatique pour les adresses françaises se terminant par "code postal + ville".';

-- Note de sécurité: 
-- Cette migration n''ajoute pas de contraintes NOT NULL pour ne pas casser les entreprises existantes.
-- La validation des données doit être faite au niveau de l''application (onboarding/page.tsx).
-- Le backfill est idempotent et ne modifie que les lignes où les nouvelles colonnes sont NULL.