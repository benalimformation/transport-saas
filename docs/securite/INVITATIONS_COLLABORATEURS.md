# ROUTCH - Invitations sécurisées des collaborateurs

## Objectif
Permettre à un administrateur d'inviter un collaborateur
dans son entreprise existante.

## Règles obligatoires
1. Seuls admin et super_admin peuvent inviter.
2. L'entreprise est déterminée côté serveur depuis le profil de l'administrateur.
3. Le navigateur ne peut pas choisir entreprise_id.
4. Les rôles autorisés sont admin, exploitant, chauffeur et client.
5. Le rôle super_admin ne peut jamais être attribué par invitation.
6. Aucun mot de passe temporaire partagé.
7. Le collaborateur définit son propre mot de passe.
8. Une invitation ne crée jamais de nouvelle entreprise.
9. Une invitation ne crée jamais de nouvel essai gratuit.
10. Les invitations sont limitées dans le temps et révocables.
11. Une adresse déjà associée à un compte doit être traitée explicitement.
12. Les données de rattachement et de rôle ne sont jamais validées depuis user_metadata.
13. Le rattachement est effectué uniquement par un mécanisme serveur autorisé.
14. Une invitation ne doit pas permettre de rejoindre une autre entreprise.
15. Les erreurs et invitations répétées doivent être gérées sans créer de comptes orphelins.

## Architecture envisagée
- Table d'invitations protégée par RLS et privilèges SQL.
- API Next.js authentifiée, réservée aux administrateurs.
- Liaison sécurisée avec Supabase Auth.
- Adaptation contrôlée du trigger handle_new_company_user().
- Formulaire /utilisateurs/nouveau sans champ mot de passe.
- Parcours d'acceptation et de définition du mot de passe.

## Sécurité de déploiement
Aucune migration distante sans validation explicite.
Ne jamais utiliser supabase db push automatiquement.
Ne jamais exposer SUPABASE_SERVICE_ROLE_KEY au navigateur.
Tester les scénarios normaux et malveillants avant mise en production.
