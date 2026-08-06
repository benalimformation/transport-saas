-- Script pour vérifier les colonnes d'abonnement dans la table entreprises
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'entreprises' 
    AND table_schema = 'public'
ORDER BY ordinal_position;