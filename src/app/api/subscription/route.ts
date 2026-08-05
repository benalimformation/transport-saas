import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseProxyClient } from '../../../lib/supabase/proxy';
import { getSubscriptionAccess } from '../../../lib/subscriptionAccess';

export async function GET(request: NextRequest) {
  try {
    // Créer un client Supabase SSR pour le middleware
    const { supabase, getResponse } = createSupabaseProxyClient(request);
    
    // Récupérer l'utilisateur authentifié
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { 
          authorized: false, 
          reason: 'not_authenticated',
          subscriptionStatus: 'unknown',
          error: 'Authentification requise' 
        },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    
    // Récupérer les données d'abonnement via le service centralisé
    const decision = await getSubscriptionAccess({ supabase, userId });
    
    // Récupérer la réponse avec cookies mis à jour
    const response = getResponse();
    
    // Créer une réponse JSON avec les cookies de la réponse Supabase
    const jsonResponse = NextResponse.json(decision, { status: 200 });
    
    // Copier les cookies de la réponse Supabase
    response.cookies.getAll().forEach(({ name, value }) => {
      jsonResponse.cookies.set(name, value);
    });
    
    return jsonResponse;
    
  } catch (error) {
    console.error('Erreur dans la route API subscription:', error);
    return NextResponse.json(
      { 
        authorized: false, 
        reason: 'internal_error',
        subscriptionStatus: 'unknown',
        error: 'Erreur interne du serveur' 
      },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
