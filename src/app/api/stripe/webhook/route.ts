import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '../../../../lib/stripe';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';

// Liste des statuts autorisés par la base de données
const ALLOWED_STATUSES = new Set([
  'trialing',
  'active',
  'past_due',
  'canceled',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'paused'
]);

/**
 * Synchronise une subscription Stripe avec la base de données
 * @param subscription La subscription Stripe à synchroniser
 */
async function syncSubscription(subscription: Stripe.Subscription) {
  const supabase = createSupabaseServiceClient();

  // Récupérer l'ID du customer Stripe
  const customerId = subscription.customer as string;

  // Récupérer l'ID de la subscription Stripe
  const subscriptionId = subscription.id;

  // Récupérer le statut de la subscription
  const status = subscription.status;

  // Vérifier que le statut est autorisé
  if (!ALLOWED_STATUSES.has(status)) {
    console.error(`Statut de subscription non autorisé: ${status}`);
    return;
  }

  // Récupérer current_period_end de manière compatible avec la version API Stripe
  let currentPeriodEnd: Date | null = null;
  if (subscription.items.data.length > 0) {
    // Pour les versions récentes de l'API Stripe
    currentPeriodEnd = new Date(subscription.items.data[0].current_period_end * 1000);
  }
  const cancelAt = subscription.cancel_at
    ? new Date(subscription.cancel_at * 1000).toISOString()
    : null;

  // Trouver l'entreprise correspondante
  const { data: entreprise, error } = await supabase
    .from('entreprises')
    .select('id, stripe_subscription_id, subscription_status')
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !entreprise) {
    console.error(`Aucune entreprise trouvée pour le customer Stripe: ${customerId}`);
    return;
  }
// Ne pas laisser un ancien abonnement Stripe écraser l'abonnement déjà suivi.
// Un nouvel abonnement peut toutefois prendre le relais si l'ancien est terminé.
const canReplaceExistingSubscription =
  entreprise.subscription_status === 'canceled' ||
  entreprise.subscription_status === 'incomplete_expired';

if (
  entreprise.stripe_subscription_id &&
  entreprise.stripe_subscription_id !== subscriptionId &&
  !canReplaceExistingSubscription
) {
  console.warn(
    `Subscription Stripe ignorée: ${subscriptionId}. L'entreprise ${entreprise.id} suit déjà ${entreprise.stripe_subscription_id}.`
  );
  return;
}

  // Mettre à jour l'entreprise
  const { error: updateError } = await supabase
    .from('entreprises')
    .update({
      stripe_subscription_id: subscriptionId,
      subscription_status: status,
      current_period_end: currentPeriodEnd,
      cancel_at: cancelAt
    })
    .eq('id', entreprise.id);

  if (updateError) {
    console.error(`Erreur lors de la mise à jour de l'entreprise ${entreprise.id}:`, updateError);
  }
}

export async function POST(request: NextRequest) {
  try {
    // Lire le raw body
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');

    if (!signature) {
      return NextResponse.json(
        { error: 'Signature manquante' },
        { status: 400 }
      );
    }

    // Lire le secret webhook
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET non configuré');
      return NextResponse.json(
        { error: 'Configuration serveur invalide' },
        { status: 500 }
      );
    }

    // Initialiser le client Stripe
    const stripe = getStripeClient();

    // Construire l'événement
    let event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error('Erreur de vérification de la signature:', err);
      return NextResponse.json(
        { error: 'Signature invalide' },
        { status: 400 }
      );
    }

    // Traiter l'événement
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          await syncSubscription(subscription);
        }
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        const subscription = event.data.object as Stripe.Subscription;
        await syncSubscription(subscription);
        break;

      case 'invoice.paid':
      case 'invoice.payment_failed':
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.lines.data[0].subscription) {
          const subscription = await stripe.subscriptions.retrieve(invoice.lines.data[0].subscription as string);
          await syncSubscription(subscription);
        }
        break;

      default:
        // Événement non géré
        console.log(`Événement non géré: ${event.type}`);
    }

    // Réponse réussie
    return NextResponse.json(
      { received: true },
      { status: 200 }
    );

  } catch (error) {
    console.error('Erreur dans le webhook Stripe:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}

// Désactiver le cache pour cette route
// Les webhooks doivent toujours être traités immédiatement
export const dynamic = 'force-dynamic';