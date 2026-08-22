/**
 * Récupère les IDs des prix Stripe configurés
 *
 * @returns Un objet contenant les IDs des prix mensuel et annuel
 * @throws Error si les variables d'environnement ne sont pas configurées
 */
export function getStripePriceIds(): { monthly: string; annual: string } {
  const monthly = process.env.STRIPE_PRICE_MONTHLY_ID;
  const annual = process.env.STRIPE_PRICE_ANNUAL_ID;

  if (!monthly) {
    throw new Error("Missing STRIPE_PRICE_MONTHLY_ID");
  }

  if (!annual) {
    throw new Error("Missing STRIPE_PRICE_ANNUAL_ID");
  }

  return {
    monthly,
    annual,
  };
}

export function getStripePriceId(plan: "monthly" | "annual"): string {
  if (plan === "monthly") {
    const monthly = process.env.STRIPE_PRICE_MONTHLY_ID;

    if (!monthly) {
      throw new Error("Missing STRIPE_PRICE_MONTHLY_ID");
    }

    return monthly;
  }

  const annual = process.env.STRIPE_PRICE_ANNUAL_ID;

  if (!annual) {
    throw new Error("Missing STRIPE_PRICE_ANNUAL_ID");
  }

  return annual;
}
