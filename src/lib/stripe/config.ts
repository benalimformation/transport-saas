/**
 * Configuration Stripe pour l'ERP Transport SaaS
 * 
 * Ce fichier contient les constantes et configurations nécessaires
 * pour l'intégration future de Stripe.
 * 
 * IMPORTANT: Les variables d'environnement seront ajoutées dans .env.local
 * lors de l'intégration complète de Stripe.
 */

/**
 * Statuts d'abonnement Stripe compatibles avec notre système
 */
export const STRIPE_SUBSCRIPTION_STATUSES = {
  TRIALING: 'trialing',
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  UNPAID: 'unpaid',
  CANCELED: 'canceled',
  INCOMPLETE: 'incomplete',
  INCOMPLETE_EXPIRED: 'incomplete_expired',
} as const;

/**
 * Types d'événements webhook Stripe que nous traiterons
 */
export const STRIPE_WEBHOOK_EVENTS = {
  // Abonnements
  CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
  CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
  CUSTOMER_SUBSCRIPTION_TRIAL_WILL_END: 'customer.subscription.trial_will_end',
  
  // Paiements
  INVOICE_PAID: 'invoice.paid',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  INVOICE_PAYMENT_ACTION_REQUIRED: 'invoice.payment_action_required',
  
  // Clients
  CUSTOMER_CREATED: 'customer.created',
  CUSTOMER_UPDATED: 'customer.updated',
  CUSTOMER_DELETED: 'customer.deleted',
  
  // Checkout
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
} as const;

/**
 * Plans d'abonnement (à définir lors de l'intégration Stripe)
 */
export const STRIPE_PRICING_PLANS = {
  // Exemple de structure - à remplacer avec les vrais IDs de prix Stripe
  MONTHLY: {
    id: 'price_monthly', // À remplacer
    name: 'Abonnement Mensuel',
    interval: 'month',
    amount: 9900, // 99€ en centimes
  },
  ANNUAL: {
    id: 'price_annual', // À remplacer
    name: 'Abonnement Annuel',
    interval: 'year',
    amount: 99000, // 990€ en centimes (avec réduction)
  },
} as const;

/**
 * Configuration des URLs de redirection pour Stripe Checkout
 */
export const STRIPE_REDIRECT_URLS = {
  SUCCESS: '/abonnement?status=success',
  CANCEL: '/abonnement?status=cancel',
  BILLING_PORTAL_RETURN: '/parametres/abonnement',
} as const;

/**
 * Durée de l'essai gratuit en jours
 */
export const TRIAL_PERIOD_DAYS = 30;

/**
 * Convertit un statut Stripe en statut interne
 */
export function mapStripeStatusToInternal(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'trialing': 'trialing',
    'active': 'active',
    'past_due': 'past_due',
    'unpaid': 'unpaid',
    'canceled': 'canceled',
    'incomplete': 'incomplete',
    'incomplete_expired': 'expired',
  };
  
  return statusMap[stripeStatus] || 'unknown';
}

/**
 * Vérifie si un statut Stripe correspond à un abonnement actif
 */
export function isActiveStripeStatus(status: string): boolean {
  return status === 'trialing' || status === 'active';
}

/**
 * Vérifie si un statut Stripe correspond à un essai en cours
 */
export function isTrialStripeStatus(status: string): boolean {
  return status === 'trialing';
}