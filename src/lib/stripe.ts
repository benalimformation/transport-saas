import "server-only";
import Stripe from "stripe";

/**
 * Configuration et initialisation sécurisée du client Stripe côté serveur
 * 
 * Ce module est strictement serveur et ne doit jamais être importé côté client.
 * La clé secrète Stripe est chargée depuis les variables d'environnement.
 */

// Variables d'environnement requises (vérifiées à l'initialisation)
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

/**
 * Vérification de la configuration Stripe au démarrage
 * 
 * Cette fonction valide que les variables d'environnement requises
 * pour Stripe sont présentes dans l'environnement serveur.
 * 
 * @throws {Error} Si la clé secrète Stripe est manquante
 */
function validateStripeConfig(): void {
  if (!stripeSecretKey) {
    throw new Error(
      "Configuration Stripe manquante. Veuillez définir STRIPE_SECRET_KEY dans .env.local."
    );
  }

  // Validation basique du format de la clé (sans révéler la valeur)
  if (!stripeSecretKey.startsWith("sk_")) {
    throw new Error(
      "Format de clé Stripe invalide. STRIPE_SECRET_KEY doit commencer par 'sk_'."
    );
  }
}

// Initialisation immédiate - validation de la configuration
try {
  validateStripeConfig();
} catch (error) {
  // En développement, on peut afficher un avertissement mais ne pas bloquer
  // le build tant que Stripe n'est pas utilisé par toutes les pages.
  // En production, cette erreur sera levée lors de l'utilisation du client.
  if (process.env.NODE_ENV === "development") {
    console.warn(
      "⚠️  Configuration Stripe incomplète. L'initialisation du client Stripe échouera lors de son utilisation.",
      error instanceof Error ? error.message : "Erreur inconnue"
    );
  }
}

/**
 * Client Stripe singleton pour toute l'application
 * 
 * Initialisé uniquement si la configuration est valide.
 * En cas d'erreur de configuration, l'accès à cette instance échouera.
 */
const stripeClient = (() => {
  // Vérification finale avant création du client
  if (!stripeSecretKey || !stripeSecretKey.startsWith("sk_")) {
    // Retourne un proxy qui échoue proprement lors de l'utilisation
    return new Proxy(
      {},
      {
        get() {
          throw new Error(
            "Le client Stripe n'est pas disponible. Vérifiez que STRIPE_SECRET_KEY est correctement configurée dans .env.local."
          );
        },
      }
    ) as Stripe;
  }

  // Version d'API Stripe recommandée (à ajuster selon les besoins du projet)
  // Utilise la dernière version stable compatible avec le SDK Stripe installé
  const stripeApiVersion = "2026-07-29.dahlia";

  return new Stripe(stripeSecretKey, {
    apiVersion: stripeApiVersion,
    // Configuration compatible avec Next.js
    // Note: en développement, utilisez la clé de test (sk_test_...)
    // En production, la clé live (sk_live_...) sera injectée par la plateforme
    typescript: true,
    maxNetworkRetries: 2,
    timeout: 20000,
  });
})();

/**
 * Fonction utilitaire pour vérifier la validité de la configuration Stripe
 * 
 * @returns {boolean} true si la configuration Stripe est valide et prête à être utilisée
 */
export function isStripeConfigured(): boolean {
  return (
    typeof stripeSecretKey === "string" &&
    stripeSecretKey.length > 0 &&
    stripeSecretKey.startsWith("sk_")
  );
}

/**
 * Récupère l'instance du client Stripe sécurisée
 * 
 * @returns {Stripe} Instance configurée du client Stripe
 * @throws {Error} Si la configuration Stripe est invalide ou manquante
 */
export function getStripeClient(): Stripe {
  // Vérification de runtime avant de retourner le client
  if (!isStripeConfigured()) {
    throw new Error(
      "Impossible d'initialiser le client Stripe. " +
        "Assurez-vous que STRIPE_SECRET_KEY est définie dans .env.local " +
        "et qu'elle suit le format correct (sk_test_... ou sk_live_)."
    );
  }

  return stripeClient;
}

/**
 * Export par défaut du client Stripe pour une utilisation simplifiée
 * 
 * Attention : Cette exportation échouera si la configuration est invalide.
 * Pour un contrôle plus fin, utiliser `getStripeClient()` avec gestion d'erreur.
 */
export default stripeClient;