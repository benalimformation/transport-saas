-- Migration RLS complètement refaite avec sécurité renforcée

-- 1. Fonction helper sécurisée
CREATE OR REPLACE FUNCTION public.current_user_entreprise_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT entreprise_id FROM public.profils WHERE id = auth.uid() LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_user_entreprise_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_entreprise_id() TO authenticated;

-- 2. Trigger pour la création automatique entreprise + profil après inscription
-- Fonction déclenchée après insertion dans auth.users
CREATE OR REPLACE FUNCTION public.handle_new_company_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
  DECLARE
  new_entreprise_id UUID;
  v_nom_entreprise TEXT;
  v_nom_utilisateur TEXT;
BEGIN
  -- Lire et nettoyer les métadonnées fournies par le formulaire d'inscription
  v_nom_entreprise :=
    NULLIF(
      BTRIM(
        COALESCE(
          NEW.raw_user_meta_data ->> 'nom_entreprise',
          ''
        )
      ),
      ''
    );

  v_nom_utilisateur :=
    NULLIF(
      BTRIM(
        COALESCE(
          NEW.raw_user_meta_data ->> 'nom_utilisateur',
          ''
        )
      ),
      ''
    );
  
  -- Valider que nom_entreprise n'est pas vide
  IF v_nom_entreprise IS NULL THEN
    RAISE EXCEPTION 'Le nom de l''entreprise est obligatoire';
  END IF;
  
  -- Utiliser une valeur par défaut si le nom utilisateur est absent
  IF v_nom_utilisateur IS NULL THEN
    v_nom_utilisateur := NEW.email;
  END IF;
  
  -- Créer une vraie ligne dans public.entreprises avec les colonnes réelles
  INSERT INTO public.entreprises(
    nom,
    email
  ) VALUES (
    v_nom_entreprise,
    NEW.email
  ) RETURNING id INTO new_entreprise_id;
  
  -- Créer public.profils avec rôle admin
  INSERT INTO public.profils(
    id,
    email,
    nom,
    role,
    entreprise_id
  ) VALUES (
    NEW.id,
    NEW.email,
    v_nom_utilisateur,
    'admin', -- Premier utilisateur = admin
    new_entreprise_id
  );
  
  -- Créer parametres_entreprise (table existante pour les paramètres)
  INSERT INTO public.parametres_entreprise(
    entreprise_id,
    nom
  ) VALUES (
    new_entreprise_id,
    v_nom_entreprise
  );
  
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Annuler toutes les insertions en cas d'erreur (ROLLBACK implicite)
    RAISE;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_company_user() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.handle_new_company_user() FROM anon;
REVOKE ALL ON FUNCTION public.handle_new_company_user() FROM authenticated;

-- Créer le trigger sur auth.users (table gérée par Supabase)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_company_user();

-- 3. Supprimer toutes les anciennes policies permissives

-- Table public.entreprises
DROP POLICY IF EXISTS "Allow insert entreprises" ON public.entreprises;
DROP POLICY IF EXISTS "Allow read entreprises" ON public.entreprises;
DROP POLICY IF EXISTS "Allow update entreprises" ON public.entreprises;

-- Table public.profils
DROP POLICY IF EXISTS "Allow insert profils" ON public.profils;
DROP POLICY IF EXISTS "Allow read profils" ON public.profils;

-- Table public."Chauffeurs"
DROP POLICY IF EXISTS "Autoriser ajout chauffeurs" ON public."Chauffeurs";
DROP POLICY IF EXISTS "Enable read access for all users" ON public."Chauffeurs";
DROP POLICY IF EXISTS "delete_chauffeurs" ON public."Chauffeurs";
DROP POLICY IF EXISTS "update_chauffeurs" ON public."Chauffeurs";

-- Table public.camions
DROP POLICY IF EXISTS "insert_camions" ON public.camions;
DROP POLICY IF EXISTS "read_camions" ON public.camions;
DROP POLICY IF EXISTS "update_camions" ON public.camions;
DROP POLICY IF EXISTS "delete_camions" ON public.camions;

-- Table public.clients
DROP POLICY IF EXISTS "insert_clients" ON public.clients;
DROP POLICY IF EXISTS "read_clients " ON public.clients;
DROP POLICY IF EXISTS "update_clients " ON public.clients;
DROP POLICY IF EXISTS "delete_clients " ON public.clients;

-- Table public.devis
DROP POLICY IF EXISTS "insert_devis" ON public.devis;
DROP POLICY IF EXISTS "read_devis" ON public.devis;
DROP POLICY IF EXISTS "read_devis " ON public.devis;
DROP POLICY IF EXISTS "update_devis" ON public.devis;
DROP POLICY IF EXISTS "delete_devis" ON public.devis;

-- Table public.livraisons
DROP POLICY IF EXISTS "insert_livraisons" ON public.livraisons;
DROP POLICY IF EXISTS "read_livraisons" ON public.livraisons;
DROP POLICY IF EXISTS "update_livraisons" ON public.livraisons;
DROP POLICY IF EXISTS "delete_livraisons" ON public.livraisons;

-- Table public.factures
DROP POLICY IF EXISTS "factures_insert" ON public.factures;
DROP POLICY IF EXISTS "factures_select" ON public.factures;
DROP POLICY IF EXISTS "factures_update" ON public.factures;
DROP POLICY IF EXISTS "factures_delete" ON public.factures;

-- Table public.depenses
DROP POLICY IF EXISTS "depenses_insert" ON public.depenses;
DROP POLICY IF EXISTS "depenses_select" ON public.depenses;
DROP POLICY IF EXISTS "depenses_update" ON public.depenses;
DROP POLICY IF EXISTS "depenses_delete" ON public.depenses;

-- 4. Politiques pour la table profils
ALTER TABLE public.profils ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_own_profile" ON public.profils;
DROP POLICY IF EXISTS "update_own_profile" ON public.profils;

-- Lecture restreinte
CREATE POLICY "read_own_profile"
ON public.profils
FOR SELECT
USING (id = auth.uid());

-- Modification sécurisée (protection par colonnes via permissions)
CREATE POLICY "update_own_profile"
ON public.profils
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- 5. Politiques pour la table entreprises
ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_entreprise" ON public.entreprises;
DROP POLICY IF EXISTS "update_own_entreprise" ON public.entreprises;

CREATE POLICY "select_own_entreprise" ON public.entreprises
FOR SELECT USING (id = public.current_user_entreprise_id());

CREATE POLICY "update_own_entreprise" ON public.entreprises
FOR UPDATE USING (id = public.current_user_entreprise_id())
WITH CHECK (id = public.current_user_entreprise_id());

-- Note: La création est gérée par le trigger handle_new_company_user() sur auth.users

-- 6. Politiques pour parametres_entreprise
ALTER TABLE public.parametres_entreprise ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_params" ON public.parametres_entreprise;
DROP POLICY IF EXISTS "update_params" ON public.parametres_entreprise;

CREATE POLICY "select_params" ON public.parametres_entreprise
FOR SELECT USING (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "update_params" ON public.parametres_entreprise
FOR UPDATE USING (entreprise_id = public.current_user_entreprise_id())
WITH CHECK (entreprise_id = public.current_user_entreprise_id());

-- 7. Politiques pour toutes les tables métier multi-tenant

-- Table public.clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_clients" ON public.clients;
DROP POLICY IF EXISTS "insert_clients" ON public.clients;
DROP POLICY IF EXISTS "update_clients" ON public.clients;
DROP POLICY IF EXISTS "delete_clients" ON public.clients;

CREATE POLICY "select_clients" ON public.clients
FOR SELECT USING (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "insert_clients" ON public.clients
FOR INSERT WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "update_clients" ON public.clients
FOR UPDATE USING (entreprise_id = public.current_user_entreprise_id())
WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "delete_clients" ON public.clients
FOR DELETE USING (entreprise_id = public.current_user_entreprise_id());

-- Table public.camions
ALTER TABLE public.camions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_camions" ON public.camions
FOR SELECT USING (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "insert_camions" ON public.camions
FOR INSERT WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "update_camions" ON public.camions
FOR UPDATE USING (entreprise_id = public.current_user_entreprise_id())
WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "delete_camions" ON public.camions
FOR DELETE USING (entreprise_id = public.current_user_entreprise_id());

-- Table public."Chauffeurs"
ALTER TABLE public."Chauffeurs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_chauffeurs" ON public."Chauffeurs"
FOR SELECT USING (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "insert_chauffeurs" ON public."Chauffeurs"
FOR INSERT WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "update_chauffeurs" ON public."Chauffeurs"
FOR UPDATE USING (entreprise_id = public.current_user_entreprise_id())
WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "delete_chauffeurs" ON public."Chauffeurs"
FOR DELETE USING (entreprise_id = public.current_user_entreprise_id());

-- Table public.devis
ALTER TABLE public.devis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_devis" ON public.devis
FOR SELECT USING (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "insert_devis" ON public.devis
FOR INSERT WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "update_devis" ON public.devis
FOR UPDATE USING (entreprise_id = public.current_user_entreprise_id())
WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "delete_devis" ON public.devis
FOR DELETE USING (entreprise_id = public.current_user_entreprise_id());

-- Table public.livraisons
ALTER TABLE public.livraisons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_livraisons" ON public.livraisons
FOR SELECT USING (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "insert_livraisons" ON public.livraisons
FOR INSERT WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "update_livraisons" ON public.livraisons
FOR UPDATE USING (entreprise_id = public.current_user_entreprise_id())
WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "delete_livraisons" ON public.livraisons
FOR DELETE USING (entreprise_id = public.current_user_entreprise_id());

-- Table public.factures
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_factures" ON public.factures
FOR SELECT USING (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "insert_factures" ON public.factures
FOR INSERT WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "update_factures" ON public.factures
FOR UPDATE USING (entreprise_id = public.current_user_entreprise_id())
WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "delete_factures" ON public.factures
FOR DELETE USING (entreprise_id = public.current_user_entreprise_id());

-- Table public.depenses
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_depenses" ON public.depenses
FOR SELECT USING (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "insert_depenses" ON public.depenses
FOR INSERT WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "update_depenses" ON public.depenses
FOR UPDATE USING (entreprise_id = public.current_user_entreprise_id())
WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "delete_depenses" ON public.depenses
FOR DELETE USING (entreprise_id = public.current_user_entreprise_id());

-- 8. Permissions par table avec protection par colonne

-- Table public.entreprises
REVOKE ALL ON TABLE public.entreprises FROM PUBLIC;
GRANT SELECT, UPDATE ON TABLE public.entreprises TO authenticated;
ALTER TABLE public.entreprises NO FORCE ROW LEVEL SECURITY;

-- Table public.profils (protection par colonne)
REVOKE ALL ON TABLE public.profils FROM PUBLIC;
REVOKE UPDATE ON TABLE public.profils FROM authenticated;
GRANT SELECT ON TABLE public.profils TO authenticated;
GRANT UPDATE (email, nom) ON TABLE public.profils TO authenticated;
ALTER TABLE public.profils NO FORCE ROW LEVEL SECURITY;

-- Table public.parametres_entreprise
REVOKE ALL ON TABLE public.parametres_entreprise FROM PUBLIC;
GRANT SELECT, UPDATE ON TABLE public.parametres_entreprise TO authenticated;
ALTER TABLE public.parametres_entreprise NO FORCE ROW LEVEL SECURITY;

-- Tables métier multi-tenant
REVOKE ALL ON TABLE 
  public.clients,
  public.camions,
  public."Chauffeurs",
  public.devis,
  public.livraisons,
  public.factures,
  public.depenses
FROM PUBLIC;

GRANT SELECT, INSERT, UPDATE, DELETE
ON TABLE
  public.clients,
  public.camions,
  public."Chauffeurs",
  public.devis,
  public.livraisons,
  public.factures,
  public.depenses
TO authenticated;

-- Documenter les décisions de sécurité
COMMENT ON FUNCTION public.handle_new_company_user() IS 
'Trigger SECURITY DEFINER exécuté après INSERT sur auth.users. Crée une entreprise dans public.entreprises, un profil admin dans public.profils, et les paramètres dans public.parametres_entreprise. Les métadonnées utilisateur (nom_entreprise, nom_utilisateur) sont lues depuis NEW.raw_user_meta_data.';
COMMENT ON FUNCTION public.current_user_entreprise_id() IS 
'Fonction helper pour récupérer l''entreprise_id de l''utilisateur connecté. Utilisée par les policies RLS.';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 
'Déclenche la création entreprise + profil admin après inscription.';
COMMENT ON POLICY "update_own_profile" ON public.profils IS 
'Permet uniquement la modification des colonnes non sensibles. 
Protège id, entreprise_id et role contre toute modification.';
