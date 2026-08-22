import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseProxyClient } from '../../../../lib/supabase/proxy';
import { getStripeClient } from '../../../../lib/stripe';
import { getStripePriceId } from '../../../../lib/stripe/config';
import { getStripeCustomerForEntreprise } from '../../../../lib/stripe/customer';

/**
 * Route API pour créer une session Stripe Checkout
 *
 * Cette route permet de créer une session de paiement Stripe pour les abonnements
 * mensuels ou annuels. Elle vérifie l'authentification, récupère les informations
 * de l'entreprise, et crée une session Checkout avec le customer Stripe existant.
 *
 * Méthode: POST uniquement
 * Body attendu: { plan: 'monthly' | 'annual' }
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier la méthode HTTP
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed', message: 'Cette route accepte uniquement les requêtes POST' },
        { status: 405 }
      );
    }

    // 2. Créer un client Supabase SSR pour l'authentification
    const { supabase, getResponse } = createSupabaseProxyClient(request);

    // 3. Récupérer l'utilisateur authentifié
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      return NextResponse.json(
        {
          error: 'Non authentifié',
          message: 'Vous devez être connecté pour créer un abonnement',
          reason: 'not_authenticated'
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // 4. Récupérer le profil utilisateur pour obtenir l'entreprise_id
    const { data: profil, error: profilError } = await supabase
      .from('profils')
      .select('entreprise_id')
      .eq('id', userId)
      .single();

    if (profilError || !profil || !profil.entreprise_id) {
      return NextResponse.json(
        {
          error: 'Profil introuvable',
          message: 'Impossible de trouver votre profil ou entreprise associée',
          reason: 'profile_or_company_missing'
        },
        { status: 404 }
      );
    }

    const entrepriseId = profil.entreprise_id;

    // 5. Récupérer les données d'abonnement de l'entreprise
    const { data: entreprise, error: entrepriseError } = await supabase
      .from('entreprises')
      .select('subscription_status, stripe_customer_id')
      .eq('id', entrepriseId)
      .single();

    if (entrepriseError || !entreprise) {
      return NextResponse.json(
        {
          error: 'Entreprise introuvable',
          message: 'Impossible de trouver les informations de votre entreprise',
          reason: 'company_not_found'
        },
        { status: 404 }
      );
    }

    // 6. Vérifier si l'entreprise a déjà un abonnement actif
    if (entreprise.subscription_status === 'active') {
      return NextResponse.json(
        {
          error: 'Abonnement déjà actif',
          message: 'Votre entreprise a déjà un abonnement actif',
          reason: 'subscription_already_active',
          currentStatus: entreprise.subscription_status
        },
        { status: 409 }
      );
    }

    // 7. Vérifier que stripe_customer_id existe
    if (!entreprise.stripe_customer_id || entreprise.stripe_customer_id.trim() === '') {
      return NextResponse.json(
        {
          error: 'Customer Stripe manquant',
          message: 'Votre entreprise n\'a pas encore de client Stripe associé. Veuillez contacter le support.',
          reason: 'stripe_customer_missing',
          entrepriseId: entrepriseId
        },
        { status: 422 }
      );
    }

    // 8. Valider et parser le body de la requête
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Body invalide', message: 'Le body de la requête doit être un objet JSON' },
        { status: 400 }
      );
    }

    const { plan } = body;

    if (!plan || (plan !== 'monthly' && plan !== 'annual')) {
      return NextResponse.json(
        {
          error: 'Plan invalide',
          message: 'Le plan doit être soit "monthly" soit "annual"',
          validPlans: ['monthly', 'annual']
        },
        { status: 400 }
      );
    }

    // 9. Récupérer les Price IDs depuis la configuration
    const priceId = getStripePriceId(plan);

    // 10. Initialiser le client Stripe
    const stripe = getStripeClient();

    // 11. Créer la session Checkout
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: entreprise.stripe_customer_id,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/abonnement?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/abonnement?checkout=cancel`,
      metadata: {
        entreprise_id: entrepriseId,
        plan: plan,
        user_id: userId,
      },
    });

    // 12. Récupérer la réponse avec cookies mis à jour
    const response = getResponse();

    // 13. Créer une réponse JSON avec l'URL de Checkout
    const jsonResponse = NextResponse.json(
      {
        success: true,
        checkoutUrl: checkoutSession.url,
        sessionId: checkoutSession.id,
        plan: plan,
        entrepriseId: entrepriseId,
        customerId: entreprise.stripe_customer_id
      },
      { status: 200 }
    );

    // 14. Copier les cookies de la réponse Supabase
    response.cookies.getAll().forEach(({ name, value }) => {
      jsonResponse.cookies.set(name, value);
    });

    return jsonResponse;

  } catch (error) {
    console.error('Erreur dans la route API Stripe Checkout:', error);

    let errorMessage = 'Erreur interne du serveur';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Erreurs spécifiques Stripe
      if (error.message.includes('Invalid API Key')) {
        errorMessage = 'Configuration Stripe invalide';
      } else if (error.message.includes('No such customer')) {
        errorMessage = 'Client Stripe introuvable';
        statusCode = 404;
      } else if (error.message.includes('Invalid price')) {
        errorMessage = 'Identifiant de prix Stripe invalide';
        statusCode = 400;
      }
    }

    return NextResponse.json(
      {
        error: 'Erreur serveur',
        message: errorMessage,
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : String(error) : undefined
      },
      { status: statusCode }
    );
  }
}

/**
 * Désactiver le cache pour cette route
 * Les sessions Checkout doivent toujours être fraîches
 */
export const dynamic = 'force-dynamic';