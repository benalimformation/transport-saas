import "server-only";
import Stripe from "stripe";

/**
 * Configuration et initialisation sécurisée du client Stripe côté serveur
 * 
 * Ce module est strictement serveur et ne doit jamais être importé côté client.
 * La clé secrète Stripe est chargée depuis les variables d'environnement.
 */

/**
 * Fonction utilitaire pour vérifier la validité de la configuration Stripe
 * 
 * @returns {boolean} true si la configuration Stripe est valide et prête à être utilisée
 */
export function isStripeConfigured(): boolean {
  const key = process.env.STRIPE_SECRET_KEY;
  return (
    typeof key === "string" &&
    key.length > 0 &&
    key.startsWith("sk_")
  );
}

/**
 * Récupère l'instance du client Stripe sécurisée
 * 
 * @returns {Stripe} Instance configurée du client Stripe
 * @throws {Error} Si la configuration Stripe est invalide ou manquante
 */
export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!key || !key.startsWith("sk_")) {
    throw new Error(
      "Impossible d'initialiser le client Stripe. " +
        "Assurez-vous que STRIPE_SECRET_KEY est définie dans .env.local " +
        "et qu'elle suit le format correct (sk_test_... ou sk_live_)."
    );
  }

  // Le SDK Stripe utilise automatiquement la dernière version d'API compatible
  return new Stripe(key, {
    typescript: true,
    maxNetworkRetries: 2,
    timeout: 20000,
  });
}

/**
 * Export par défaut du client Stripe pour une utilisation simplifiée
 * 
 * Attention : Cette exportation échouera si la configuration est invalide.
 * Pour un contrôle plus fin, utiliser `getStripeClient()` avec gestion d'erreur.
 */
export default getStripeClient;
