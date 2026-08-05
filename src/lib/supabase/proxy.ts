 /**
 * Helper Supabase SSR pour le Proxy Next.js 16
 * 
 * Fournit un client Supabase avec gestion correcte des cookies
 * conforme à la documentation officielle de @supabase/ssr
 * 
 * @see https://github.com/supabase/ssr
 */

import 'server-only'
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Alias de type pour le client Supabase SSR utilisé dans le proxy
 */
export type SupabaseProxyClient = ReturnType<typeof createServerClient>

/**
 * Crée un client Supabase SSR pour le Proxy avec gestion correcte des cookies
 * 
 * Utilise l'interface moderne getAll/setAll comme recommandé par la documentation
 * Gère automatiquement le rafraîchissement des tokens de session
 * 
 * @param request - La requête NextRequest
 * @returns Un objet contenant le client Supabase et un getter pour la réponse à jour
 */
export function createSupabaseProxyClient(request: NextRequest): {
  supabase: SupabaseProxyClient
  getResponse: () => NextResponse
} {
  // Créer une réponse initiale - référence mutable
  let currentResponse = NextResponse.next({ request })

  // Valider les variables d'environnement
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuration Supabase manquante')
  }

  // Créer le client Supabase SSR avec gestion des cookies conforme à la documentation
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        /**
         * Récupère tous les cookies de la requête
         * Interface moderne recommandée par @supabase/ssr
         */
        getAll() {
          return request.cookies.getAll()
        },
        
        /**
         * Définit tous les cookies mis à jour
         * Conforme à la documentation officielle @supabase/ssr
         */
        setAll(cookiesToSet, headers) {
          // Mettre à jour les cookies de la requête
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })

          // Recréer la réponse avec la requête mise à jour (standard officiel)
          currentResponse = NextResponse.next({ request })

          // Appliquer les cookies à la nouvelle réponse
          cookiesToSet.forEach(({ name, value, options }) => {
            currentResponse.cookies.set(name, value, options)
          })

          // Appliquer les headers à la nouvelle réponse
          if (headers) {
            Object.entries(headers).forEach(([key, value]) => {
              currentResponse.headers.set(key, value)
            })
          }
        },
      },
    }
  )

  return { 
    supabase, 
    getResponse: () => currentResponse 
  }
}

/**
 * Récupère l'ID utilisateur authentifié
 *
 * Utilise supabase.auth.getUser() pour obtenir l'utilisateur authentifié
 *
 * @param supabase - Client Supabase SSR
 * @returns L'ID utilisateur ou null si non authentifié
 */
export async function getAuthenticatedUserId(
  supabase: SupabaseProxyClient,
  requestId: string
): Promise<string | null> {
  try {
    // Récupérer l'utilisateur authentifié
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Retourner l'ID utilisateur
    return user?.id ?? null

  } catch (error) {
    return null
  }
}

/**
 * Vérifie si un utilisateur est authentifié et retourne son ID
 * 
 * Combine la création du client et la récupération de l'ID utilisateur
 * 
 * @param request - La requête NextRequest
 * @returns Un objet contenant l'ID utilisateur, le client Supabase et la réponse
 */
export async function getAuthenticatedUser(
  request: NextRequest
): Promise<{
  userId: string | null
  supabase: SupabaseProxyClient
  response: NextResponse
}> {
  // Créer le client et obtenir le getter de réponse
  const { supabase, getResponse } = createSupabaseProxyClient(request)
  
  // Obtenir l'ID utilisateur (cela peut déclencher setAll via getClaims)
  // Note: requestId n'est pas disponible ici, nous devons le passer depuis le proxy principal
  const userId = await getAuthenticatedUserId(supabase, 'HELPER')

  // Récupérer la réponse à jour après l'appel à getClaims
  const response = getResponse()

  return { userId, supabase, response }
}
