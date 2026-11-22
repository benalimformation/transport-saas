import "server-only";
import Stripe from "stripe";

/**
 * Vérifie la cohérence entre l'environnement et la clé Stripe.
 * En cas de doute, les opérations Stripe sont bloquées.
 */
function validateStripeConfiguration(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  const vercelEnv = process.env.VERCEL_ENV;

  if (!key || (!key.startsWith("sk_test_") && !key.startsWith("sk_live_"))) {
    throw new Error("Clé secrète Stripe absente ou invalide.");
  }

  if (
    vercelEnv !== undefined &&
    !["production", "preview", "development"].includes(vercelEnv)
  ) {
    throw new Error("Environnement Vercel non reconnu.");
  }

  // Hors Vercel : seul le développement local est autorisé.
  if (!vercelEnv && process.env.NODE_ENV === "production") {
    throw new Error(
      "Environnement de production non identifié : Stripe bloqué."
    );
  }

  const expectedMode = vercelEnv === "production" ? "live" : "test";
  const actualMode = key.startsWith("sk_live_") ? "live" : "test";

  if (expectedMode !== actualMode) {
    throw new Error(
      "Incompatibilité entre l'environnement et le mode Stripe."
    );
  }

  return key;
}

export function isStripeConfigured(): boolean {
  try {
    validateStripeConfiguration();
    return true;
  } catch {
    return false;
  }
}

export function getStripeClient(): Stripe {
  const key = validateStripeConfiguration();

  return new Stripe(key, {
    typescript: true,
    maxNetworkRetries: 2,
    timeout: 20000,
  });
}

export default getStripeClient;
