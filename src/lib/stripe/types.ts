/**
 * Types TypeScript pour l'intégration Stripe
 * 
 * Ces types définissent les structures de données pour les webhooks Stripe
 * et les interactions avec l'API Stripe.
 */

/**
 * Données de base d'un client Stripe
 */
export interface StripeCustomer {
  id: string;
  email: string | null;
  name: string | null;
  metadata: Record<string, string>;
  created: number;
}

/**
 * Données de base d'un abonnement Stripe
 */
export interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  trial_start: number | null;
  trial_end: number | null;
  cancel_at_period_end: boolean;
  canceled_at: number | null;
  items: {
    data: Array<{
      price: {
        id: string;
        product: string;
        unit_amount: number | null;
        currency: string;
        recurring: {
          interval: string;
          interval_count: number;
        } | null;
      };
    }>;
  };
  metadata: Record<string, string>;
}

/**
 * Données de base d'une facture Stripe
 */
export interface StripeInvoice {
  id: string;
  customer: string;
  subscription: string | null;
  status: string;
  total: number;
  currency: string;
  hosted_invoice_url: string | null;
  invoice_pdf: string | null;
  created: number;
  paid: boolean;
}

/**
 * Données de base d'une session Checkout Stripe
 */
export interface StripeCheckoutSession {
  id: string;
  customer: string | null;
  customer_email: string | null;
  subscription: string | null;
  payment_status: string;
  status: string;
  metadata: Record<string, string>;
  success_url: string;
  cancel_url: string;
  url: string | null;
}

/**
 * Événement webhook Stripe générique
 */
export interface StripeWebhookEvent<T = any> {
  id: string;
  type: string;
  created: number;
  data: {
    object: T;
    previous_attributes?: Partial<T>;
  };
  livemode: boolean;
  pending_webhooks: number;
  request: {
    id: string | null;
    idempotency_key: string | null;
  } | null;
}

/**
 * Payload pour la création d'un client Stripe
 */
export interface CreateStripeCustomerPayload {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
}

/**
 * Payload pour la création d'une session Checkout
 */
export interface CreateCheckoutSessionPayload {
  customerId?: string;
  customerEmail?: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

/**
 * Payload pour la création d'un portail de facturation
 */
export interface CreateBillingPortalSessionPayload {
  customerId: string;
  returnUrl: string;
}

/**
 * Réponse d'erreur de l'API Stripe
 */
export interface StripeErrorResponse {
  error: {
    type: string;
    message: string;
    code?: string;
    param?: string;
  };
}

/**
 * Configuration pour les webhooks Stripe
 */
export interface StripeWebhookConfig {
  endpointSecret: string;
  tolerance: number; // Tolérance en secondes pour la vérification de signature
}

/**
 * Types pour les handlers de webhooks
 */
export type StripeWebhookHandler = (
  event: StripeWebhookEvent,
  signature: string
) => Promise<void>;

/**
 * Map des handlers de webhooks par type d'événement
 */
export type StripeWebhookHandlers = Record<string, StripeWebhookHandler>;