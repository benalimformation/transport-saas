import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getStripeClient } from '../../../../lib/stripe';
import { createSupabaseServiceClient } from '../../../../lib/supabase/service';

const ALLOWED_STATUSES = new Set([
  'trialing', 'active', 'past_due', 'canceled', 'unpaid',
  'incomplete', 'incomplete_expired', 'paused'
]);

type Reservation = {
  success: boolean;
  reservation_token: string | null;
  message: string;
};
type Result = { success: boolean; message: string };

async function syncSubscription(subscription: Stripe.Subscription, stripe: Stripe): Promise<void> {
  const supabase = createSupabaseServiceClient();
  const subscriptionId = subscription.id;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer.id;

  for (let attempt = 1; attempt <= 3; attempt++) {
    const { data: entreprise, error } = await supabase
      .from('entreprises')
      .select('id, stripe_subscription_id, stripe_sync_version')
      .eq('stripe_customer_id', customerId)
      .single();

    if (error || !entreprise) {
      throw new Error(
        `Entreprise introuvable pour le customer Stripe ${customerId}: ${error?.message ?? 'aucune correspondance'}`
      );
    }

    // Relire Stripe à chaque tentative pour éviter les snapshots anciens.
    const latestSubscription = await stripe.subscriptions.retrieve(subscriptionId);

    if (!ALLOWED_STATUSES.has(latestSubscription.status)) {
      throw new Error(`Statut Stripe non pris en charge : ${latestSubscription.status}`);
    }

    if (
      entreprise.stripe_subscription_id &&
      entreprise.stripe_subscription_id !== subscriptionId
    ) {
      let currentSubscription: Stripe.Subscription;

      try {
        currentSubscription = await stripe.subscriptions.retrieve(
          entreprise.stripe_subscription_id
        );
      } catch (error) {
        if (
          error instanceof Stripe.errors.StripeInvalidRequestError &&
          error.statusCode === 404
        ) {
          throw new Error(
            `Remplacement interdit : abonnement actuel introuvable chez Stripe (${entreprise.stripe_subscription_id})`
          );
        }

        throw error;
      }

      if (latestSubscription.created <= currentSubscription.created) {
        console.warn(`Ancien abonnement Stripe ignoré : ${subscriptionId}`);
        return;
      }

      if (
        currentSubscription.status !== 'canceled' &&
        currentSubscription.status !== 'incomplete_expired'
      ) {
        console.warn(`Remplacement refusé : abonnement actuel encore actif.`);
        return;
      }
    }

    const periodEnd = latestSubscription.items.data[0]?.current_period_end;

    const { data: result, error: rpcError } = await supabase.rpc(
      'sync_stripe_subscription_atomic',
      {
        p_customer_id: customerId,
        p_subscription_id: subscriptionId,
        p_status: latestSubscription.status,
        p_current_period_end: periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null,
        p_cancel_at: latestSubscription.cancel_at
          ? new Date(latestSubscription.cancel_at * 1000).toISOString()
          : null,
        p_expected_subscription_id: entreprise.stripe_subscription_id,
        p_expected_version: entreprise.stripe_sync_version
      }
    );

    if (rpcError) {
      throw new Error(`Échec RPC Stripe : ${rpcError.message}`);
    }

    if (result === 'updated') {
      return;
    }

    if (result !== 'conflict') {
      throw new Error(`Résultat RPC Stripe inattendu : ${String(result)}`);
    }

    console.warn(`Conflit de synchronisation Stripe, tentative ${attempt}/3`);
  }

  throw new Error(
    `Synchronisation Stripe impossible après 3 tentatives : ${subscriptionId}`
  );
}
async function processEvent(event: Stripe.Event, stripe: Stripe): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === 'subscription' && session.subscription) {
        const id = typeof session.subscription === 'string'
          ? session.subscription : session.subscription.id;
       await syncSubscription(await stripe.subscriptions.retrieve(id), stripe);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
     await syncSubscription(event.data.object as Stripe.Subscription, stripe);
      break;
    case 'invoice.paid':
case 'invoice.payment_failed': {
  const invoice = event.data.object as Stripe.Invoice;

  const subscriptionRef =
    invoice.parent?.type === 'subscription_details'
      ? invoice.parent.subscription_details?.subscription
      : null;

  if (!subscriptionRef) {
    console.warn(
      `Facture Stripe ${invoice.id} sans abonnement associé`
    );
    break;
  }

  const subscriptionId =
    typeof subscriptionRef === 'string'
      ? subscriptionRef
      : subscriptionRef.id;

  await syncSubscription(
    await stripe.subscriptions.retrieve(subscriptionId),
    stripe
  );

  break;
}
    default:
      console.log(`Événement Stripe non géré : ${event.type}`);
  }
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!signature) return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });
  if (!webhookSecret || !stripeSecretKey ||
      !(stripeSecretKey.startsWith('sk_test_') || stripeSecretKey.startsWith('sk_live_'))) {
    return NextResponse.json({ error: 'Configuration Stripe invalide' }, { status: 500 });
  }

  let stripe: ReturnType<typeof getStripeClient>;

try {
  stripe = getStripeClient();
} catch (error) {
  console.error("Initialisation Stripe impossible :", error);
  return NextResponse.json(
    { error: "Configuration Stripe invalide" },
    { status: 500 }
  );
}

let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signature, webhookSecret);
  } catch (error) {
    console.error('Signature Stripe invalide :', error);
    return NextResponse.json({ error: 'Signature invalide' }, { status: 400 });
  }

  if (event.livemode !== stripeSecretKey.startsWith('sk_live_')) {
    return NextResponse.json({ error: 'Mode Stripe incohérent' }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();
  let token: string;
  try {
    const { data, error } = await supabase.rpc('reserve_stripe_event', {
      p_event_id: event.id,
      p_event_type: event.type,
      p_livemode: event.livemode
    });
    if (error) throw error;
    const reservation = (data as Reservation[] | null)?.[0];
    if (!reservation) throw new Error('Réponse de réservation vide');
    if (!reservation.success) {
      if (reservation.message === 'already_completed') {
        return NextResponse.json({ received: true, duplicate: true }, { status: 200 });
      }
      if (reservation.message === 'currently_locked') {
        // Une réponse non-2xx permet une nouvelle tentative Stripe si le premier traitement échoue.
        return NextResponse.json({ error: 'Événement en cours de traitement' }, { status: 503 });
      }
      throw new Error(`Réservation refusée : ${reservation.message}`);
    }
    if (!reservation.reservation_token) throw new Error('Jeton de réservation manquant');
    token = reservation.reservation_token;
  } catch (error) {
    console.error('Réservation webhook Stripe impossible :', error);
    return NextResponse.json({ error: 'Réservation impossible' }, { status: 500 });
  }

  try {
    await processEvent(event, stripe);
    const { data, error } = await supabase.rpc('complete_stripe_event', {
      p_event_id: event.id,
      p_reservation_token: token
    });
    if (error) throw error;
    const result = (data as Result[] | null)?.[0];
    if (!result?.success) throw new Error(`Confirmation impossible : ${result?.message ?? 'réponse vide'}`);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('Traitement webhook Stripe échoué :', error);
    try {
      const { data, error: failError } = await supabase.rpc('fail_stripe_event', {
        p_event_id: event.id,
        p_reservation_token: token,
        p_error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Erreur inconnue'
      });
      const result = (data as Result[] | null)?.[0];
      if (failError || !result?.success) {
        console.error('Impossible de marquer le webhook en échec :', failError ?? result?.message);
      }
    } catch (failError) {
      console.error('Échec RPC fail_stripe_event :', failError);
    }
    return NextResponse.json({ error: 'Traitement impossible' }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';
