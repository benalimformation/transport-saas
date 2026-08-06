/**
 * Proxy Next.js 16 - Protection centralisée des routes basée sur l'authentification et l'abonnement
 *
 * Cette version utilise @supabase/ssr avec createServerClient conforme à la documentation officielle.
 * Gestion correcte des cookies avec getAll/setAll et validation cryptographique via getClaims().
 *
 * @see https://github.com/supabase/ssr
 * @see https://nextjs.org/docs/app/building-your-application/routing/middleware
 */

import { NextResponse, type NextRequest } from 'next/server'
import { getSubscriptionAccess } from './lib/subscriptionAccess'
import { getAuthenticatedUser, getAuthenticatedUserId, createSupabaseProxyClient } from './lib/supabase/proxy'

/**
 * Routes publiques - Accessibles sans authentification
 */
const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/abonnement'
]

/**
 * Vérifie si une URL correspond à une route publique
 */
function isPublicRoute(url: string): boolean {
  const pathname = new URL(url).pathname
  return PUBLIC_ROUTES.some(route => pathname === route)
}

/**
 * Vérifie si une URL correspond à une route API
 */
function isApiRoute(url: string): boolean {
  return new URL(url).pathname.startsWith('/api/')
}

/**
 * Handler principal du proxy
 *
 * Logique :
 * 1. Routes publiques → accès autorisé (avec cookies rafraîchis)
 * 2. Récupération utilisateur authentifié via getClaims()
 * 3. Si non authentifié → page: redirection /login, API: 401 JSON
 * 4. Vérification accès abonnement
 * 5. Si accès refusé → page: redirection /abonnement, API: 402/403 JSON
 * 6. Sinon → accès autorisé (avec cookies rafraîchis)
 */
export async function proxy(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = url.pathname
  const requestId = Date.now().toString(36) + Math.random().toString(36).substring(2)

  const cookies = request.cookies.getAll()

  try {

    // 1. Routes publiques - Accès autorisé sans vérification d'authentification
    if (isPublicRoute(request.url)) {
      // Retourner une réponse simple sans appeler getAuthenticatedUser
      // pour éviter toute redirection en cas d'erreur de session
      return NextResponse.next()
    }
    // 2. Récupérer l'utilisateur authentifié avec cookies rafraîchis
    // Note: Nous devons passer requestId au helper pour les logs
    const { supabase, getResponse } = createSupabaseProxyClient(request)
    const userId = await getAuthenticatedUserId(supabase, requestId)
    const supabaseResponse = getResponse()

    // 3. Si pas d'utilisateur authentifié
    if (!userId) {
      // Pour les pages, rediriger vers /login
      if (!isApiRoute(request.url)) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', pathname)

        // Créer une redirection qui préserve les cookies Supabase
        const redirectResponse = NextResponse.redirect(loginUrl)

        // Copier les cookies de la réponse Supabase vers la redirection
        supabaseResponse.cookies.getAll().forEach((cookie: any) => {
          redirectResponse.cookies.set(cookie.name, cookie.value)
        })

        return redirectResponse
      }

      // Pour les API, retourner 401 JSON (pas de redirection)
      const apiResponse = NextResponse.json(
        { error: 'Non authentifié', message: 'Veuillez vous connecter' },
        { status: 401 }
      )

      // Copier les cookies de la réponse Supabase vers la réponse API
      supabaseResponse.cookies.getAll().forEach((cookie: any) => {
        apiResponse.cookies.set(cookie.name, cookie.value)
      })

      return apiResponse
    }

    // 4. Vérifier l'accès aux ressources via le service centralisé
    const access = await getSubscriptionAccess({ supabase, userId })

    // Stocker les informations d'abonnement dans les headers pour les composants serveur
    // (préparation pour la mission Stripe - pas de redirection supprimée)
    const responseWithHeaders = supabaseResponse.clone()
    responseWithHeaders.headers.set('x-subscription-authorized', access.authorized.toString())
    responseWithHeaders.headers.set('x-subscription-reason', access.reason)
    responseWithHeaders.headers.set('x-subscription-status', access.subscriptionStatus)
    responseWithHeaders.headers.set('x-subscription-entreprise-id', access.entrepriseId || '')
    responseWithHeaders.headers.set('x-subscription-trial-remaining-days', access.trialRemainingDays?.toString() || '')
    responseWithHeaders.headers.set('x-subscription-trial-expired', access.trialExpired.toString())
    responseWithHeaders.headers.set('x-subscription-has-valid-subscription', access.hasValidSubscription.toString())

    // 5. Si accès refusé
    if (!access.authorized) {
      // Pour les pages, rediriger vers /abonnement
      if (!isApiRoute(request.url)) {
        const abonnementUrl = new URL('/abonnement', request.url)
        abonnementUrl.searchParams.set('reason', access.reason || 'access_denied')

        const redirectResponse = NextResponse.redirect(abonnementUrl)

        // Copier les cookies de la réponse Supabase vers la redirection
        supabaseResponse.cookies.getAll().forEach((cookie: any) => {
          redirectResponse.cookies.set(cookie.name, cookie.value)
        })

        return redirectResponse
      }

      // Pour les API, déterminer le code HTTP approprié
      let statusCode = 403 // Forbidden par défaut

      if (access.reason === 'trial_expired') {
        statusCode = 402 // Payment Required
      } else if (
        access.reason === 'subscription_past_due' ||
        access.reason === 'subscription_unpaid'
      ) {
        statusCode = 402 // Payment Required
      }

      const apiResponse = NextResponse.json(
        {
          error: 'Accès refusé',
          reason: access.reason,
          subscriptionStatus: access.subscriptionStatus
        },
        { status: statusCode }
      )

      // Copier les cookies de la réponse Supabase vers la réponse API
      supabaseResponse.cookies.getAll().forEach((cookie: any) => {
        apiResponse.cookies.set(cookie.name, cookie.value)
      })

      return apiResponse
    }

    // 6. Accès autorisé → continuer avec cookies rafraîchis
    return supabaseResponse

  } catch (error) {
    // En cas d'erreur inattendue : comportement fail-safe
    console.error('Erreur critique dans le proxy:', error)

    // Pour les pages, rediriger vers /login avec erreur générique
    if (!isApiRoute(request.url)) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('error', 'system_error')
      return NextResponse.redirect(loginUrl)
    }

    // Pour les API, retourner 503 Service Unavailable
    return NextResponse.json(
      { error: 'Erreur système', message: 'Service temporairement indisponible' },
      { status: 503 }
    )
  }
}

/**
 * Configuration du matcher pour limiter les routes où le proxy s'applique
 *
 * Le proxy s'applique à toutes les routes SAUF :
 * - Les fichiers statiques Next.js (_next/static, _next/image)
 * - Les favicons
 * - Les fichiers d'image, CSS, JS, etc.
 *
 * Pattern conforme à la documentation officielle Next.js 16 et Supabase
 */
export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * 1. Les fichiers statiques Next.js (_next/static, _next/image)
     * 2. Les favicons
     * 3. Les fichiers d'assets (.png|jpg|jpeg|gif|svg|css|js|txt|xml|ico|webp)$)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|svg|css|js|txt|xml|ico|webp)$).*)',
  ],
}