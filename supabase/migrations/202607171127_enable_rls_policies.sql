-- Migration RLS complètement refaite avec sécurité renforcée

-- 1. Fonction helper sécurisée
CREATE OR REPLACE FUNCTION public.current_user_entreprise_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT entreprise_id FROM public.profils WHERE id = auth.uid() LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.current_user_entreprise_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_entreprise_id() TO authenticated;

-- 2. Fonction RPC pour la création sécurisée de profil
CREATE OR REPLACE FUNCTION public.create_user_profile()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_entreprise_id UUID;
BEGIN
  -- Créer une nouvelle entreprise
  new_entreprise_id := gen_random_uuid();
  
  -- Créer le profil avec des valeurs sécurisées
  INSERT INTO public.profils(
    id,
    entreprise_id,
    role,
    created_at
  ) VALUES (
    auth.uid(), -- ID synchronisé avec auth.users
    new_entreprise_id,
    'user', -- Rôle par défaut fixe
    NOW()
  );
  
  -- Créer les paramètres par défaut
  INSERT INTO public.parametres_entreprise(
    entreprise_id,
    nom,
    created_at
  ) VALUES (
    new_entreprise_id,
    'Nouvelle entreprise',
    NOW()
  );
  
  RETURN new_entreprise_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_user_profile() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_user_profile() TO authenticated;

-- 3. Politiques pour la table profils
ALTER TABLE public.profils ENABLE ROW LEVEL SECURITY;

-- Lecture restreinte
CREATE POLICY "read_own_profile" ON public.profils
FOR SELECT USING (id = auth.uid());

-- Modification sécurisée par colonne
CREATE POLICY "update_own_profile" ON public.profils
FOR UPDATE USING (id = auth.uid())
WITH CHECK (
  id = auth.uid() AND
  -- Colonnes immuables
  id IS NOT DISTINCT FROM OLD.id AND
  entreprise_id IS NOT DISTINCT FROM OLD.entreprise_id AND
  role IS NOT DISTINCT FROM OLD.role
);

-- 4. Politiques pour les tables métier (exemple complet pour clients)
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_clients" ON public.clients
FOR SELECT USING (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "insert_clients" ON public.clients
FOR INSERT WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "update_clients" ON public.clients
FOR UPDATE USING (entreprise_id = public.current_user_entreprise_id())
WITH CHECK (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "delete_clients" ON public.clients
FOR DELETE USING (entreprise_id = public.current_user_entreprise_id());

-- 5. Politiques pour parametres_entreprise
ALTER TABLE public.parametres_entreprise ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_params" ON public.parametres_entreprise
FOR SELECT USING (entreprise_id = public.current_user_entreprise_id());

CREATE POLICY "update_params" ON public.parametres_entreprise
FOR UPDATE USING (entreprise_id = public.current_user_entreprise_id())
WITH CHECK (entreprise_id = public.current_user_entreprise_id());

-- Note: La création est gérée par la fonction create_user_profile()

-- 6. Révoquer les permissions par défaut
REVOKE ALL ON TABLE public.profils FROM PUBLIC;
GRANT SELECT, UPDATE ON TABLE public.profils TO authenticated;
ALTER TABLE public.profils FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.parametres_entreprise FROM PUBLIC;
GRANT SELECT, UPDATE ON TABLE public.parametres_entreprise TO authenticated;
ALTER TABLE public.parametres_entreprise FORCE ROW LEVEL SECURITY;

-- Documenter les décisions de sécurité
COMMENT ON FUNCTION public.create_user_profile() IS 
'Fonction sécurisée pour créer un nouveau profil utilisateur et entreprise. 
Garantit que le rôle est toujours "user" par défaut et que l''entreprise_id est généré de manière sécurisée.';

COMMENT ON POLICY "update_own_profile" ON public.profils IS 
'Permet uniquement la modification des colonnes non sensibles. 
Protège id, entreprise_id et role contre toute modification.';
