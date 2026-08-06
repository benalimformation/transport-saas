/* *
 * Service centralisé de vérification d'accès aux ressources basé sur l'abonnement et le RBAC
 * 
 * REFACTORING ARCHITECTURAL - Version 2.0 avec séparation stricte logique/données
 * 
 * Ce service doit être utilisé uniquement côté serveur (Server Components, Route Handlers, Middleware)
 * Protégé par import 'server-only' pour éviter l'importation par des composants clients.
 * 
 * Architecture :
 * 1. Types fermés pour contrôle strict
 * 2. Fonction pure sans dépendances (testable)
 * 3. Fonction serveur avec client SSR
 * 4. Fall-safe par défaut
 * 
 * @module subscriptionAccess
 */

import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { Role } from './permissions';

// ============================================================================
// TYPES FERMÉS STRICTS - Système de typage fermé pour contrôle d'accès
// ============================================================================

/**
 * Statuts d'abonnement autorisés - Système fermé conforme aux spécifications
 */
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'expired'
  | 'incomplete'
  | 'unknown'
  | 'super_admin_exempt';

/**
 * Raisons de décision d'accès - Système fermé conforme aux spécifications
 */
export type SubscriptionReason =
  | 'super_admin'
  | 'trial_valid'
  | 'trial_expired'
  | 'active_subscription'
  | 'subscription_past_due'
  | 'subscription_unpaid'
  | 'subscription_canceled'
  | 'subscription_expired'
  | 'subscription_incomplete'
  | 'company_missing'
  | 'profile_missing'
  | 'unknown_status'
  | 'invalid_trial'
  | 'internal_error';

/**
 * Données brutes récupérées de Supabase nécessaires à l'évaluation
 */
export interface SubscriptionRawData {
  /** Rôle de l'utilisateur */
  role: Role | null;
  
  /** ID de l'entreprise */
  entrepriseId: string | null;
  
  /** Statut de l'abonnement (peut être null) */
  subscriptionStatus: SubscriptionStatus | null;
  
  /** Date de début de l'essai (ISO string ou null) */
  trialStartedAt: string | null;
  
  /** Date de fin de l'essai (ISO string ou null) */
  trialEndsAt: string | null;
}

/**
 * Décision finale d'accès avec toutes les propriétés requises
 * Conforme aux spécifications de SubscriptionDecision
 */
export interface SubscriptionDecision {
  /** L'utilisateur est-il autorisé à accéder aux ressources ? */
  authorized: boolean;
  
  /** Raison technique de la décision */
  reason: SubscriptionReason;
  
  /** Statut actuel de l'abonnement */
  subscriptionStatus: SubscriptionStatus;
  
  /** Rôle de l'utilisateur */
  role: Role | null;
  
  /** ID de l'entreprise */
  entrepriseId: string | null;
  
  /** Date de début de l'essai (ISO string) */
  trialStartedAt: string | null;
  
  /** Date de fin de l'essai (ISO string) */
  trialEndsAt: string | null;
  
  /** Nombre de jours restants dans l'essai (null si pas en période d'essai) */
  trialRemainingDays: number | null;
  
  /** L'essai est-il expiré ? */
  trialExpired: boolean;
  
  /** L'utilisateur dispose-t-il d'un accès valide (essai valide ou abonnement actif) ? */
  hasValidSubscription: boolean;
}

// ============================================================================
// FONCTIONS PURES D'ÉVALUATION - Testables sans Supabase
// ============================================================================

/**
 * Calcule le nombre de jours restants jusqu'à une date de fin
 * Fonction pure et déterministe pour faciliter les tests
 * 
 * @param trialEndsAt - Date de fin de l'essai (ISO string)
 * @param referenceDate - Date de référence pour le calcul (défaut: maintenant)
 * @returns Nombre de jours restants (arrondi au supérieur), ou null si date invalide
 */
export function calculateTrialRemainingDays(
  trialEndsAt: string | null,
  referenceDate: Date = new Date()
): number | null {
  if (!trialEndsAt) {
    return null;
  }
  
  try {
    const endDate = new Date(trialEndsAt);
    
    // Validation de la date
    if (isNaN(endDate.getTime())) {
      return null;
    }
    
    // Normaliser les dates au début de journée UTC pour calculer en jours calendaires
    const startOfReferenceDay = new Date(Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    ));
    
    const startOfEndDay = new Date(Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate()
    ));
    
    const diffMs = startOfEndDay.getTime() - startOfReferenceDay.getTime();
    
    // Si la date est déjà passée, retourner 0
    if (diffMs <= 0) {
      return 0;
    }
    
    // Calcul des jours calendaires (arrondi au supérieur)
    const fullDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    // Cas spécial: si l'essai se termine aujourd'hui (même jour calendaire)
    // mais n'est pas encore expiré (diffMs > 0), retourner 1 jour restant
    // car l'utilisateur voit "1 jour restant" jusqu'à minuit
    if (fullDays === 0 && diffMs > 0) {
      return 1;
    }
    
    return fullDays;
  } catch {
    return null;
  }
}

/**
 * Fonction pure d'évaluation qui détermine l'accès aux ressources
 * Testable sans Supabase - logique métier centrale conforme aux spécifications
 * 
 * @param rawData - Données brutes récupérées de Supabase
 * @param referenceDate - Date de référence pour les calculs (défaut: maintenant)
 * @returns SubscriptionDecision - Décision complète d'accès
 */
export function evaluateSubscription(
  rawData: SubscriptionRawData,
  referenceDate: Date = new Date()
): SubscriptionDecision {
  const {
    role,
    entrepriseId,
    subscriptionStatus,
    trialStartedAt,
    trialEndsAt
  } = rawData;

  // 1. Validation des données minimales nécessaires
  if (!role || !entrepriseId) {
    return {
      authorized: false,
      reason: 'profile_missing',
      subscriptionStatus: 'unknown',
      role,
      entrepriseId,
      trialStartedAt,
      trialEndsAt,
      trialRemainingDays: null,
      trialExpired: false,
      hasValidSubscription: false
    };
  }

  // 2. Exemption RBAC : super_admin a toujours accès
  if (role === 'super_admin') {
    return {
      authorized: true,
      reason: 'super_admin',
      subscriptionStatus: 'super_admin_exempt',
      role,
      entrepriseId,
      trialStartedAt,
      trialEndsAt,
      trialRemainingDays: null,
      trialExpired: false,
      hasValidSubscription: true
    };
  }

  // 3. Vérification des données d'abonnement requises
  if (!subscriptionStatus || !trialStartedAt || !trialEndsAt) {
    return {
      authorized: false,
      reason: 'company_missing',
      subscriptionStatus: subscriptionStatus || 'unknown',
      role,
      entrepriseId,
      trialStartedAt,
      trialEndsAt,
      trialRemainingDays: null,
      trialExpired: false,
      hasValidSubscription: false
    };
  }

  // 4. Calcul des jours restants d'essai
  const trialRemainingDays = calculateTrialRemainingDays(trialEndsAt, referenceDate);
  
  // Gestion spéciale pour date invalide
  if (trialRemainingDays === null) {
    // Date invalide détectée par calculateTrialRemainingDays
    return {
      authorized: false,
      reason: 'invalid_trial',
      subscriptionStatus: 'trialing',
      role,
      entrepriseId,
      trialStartedAt,
      trialEndsAt,
      trialRemainingDays: null,
      trialExpired: false,
      hasValidSubscription: false
    };
  }
  
  const trialExpired = trialRemainingDays === 0;

  // 5. Logique d'autorisation principale stricte selon spécifications
  switch (subscriptionStatus) {
    case 'trialing':
      if (trialRemainingDays > 0) {
        // Essai valide - vérification des dates supplémentaires
        const endDate = new Date(trialEndsAt);
        if (isNaN(endDate.getTime())) {
          return {
            authorized: false,
            reason: 'invalid_trial',
            subscriptionStatus: 'trialing',
            role,
            entrepriseId,
            trialStartedAt,
            trialEndsAt,
            trialRemainingDays: null,
            trialExpired: false,
            hasValidSubscription: false
          };
        }
        
        // Essai valide
        return {
          authorized: true,
          reason: 'trial_valid',
          subscriptionStatus: 'trialing',
          role,
          entrepriseId,
          trialStartedAt,
          trialEndsAt,
          trialRemainingDays,
          trialExpired: false,
          hasValidSubscription: true
        };
      } else {
        // Essai expiré (trialRemainingDays === 0)
        return {
          authorized: false,
          reason: 'trial_expired',
          subscriptionStatus: 'trialing',
          role,
          entrepriseId,
          trialStartedAt,
          trialEndsAt,
          trialRemainingDays: 0,
          trialExpired: true,
          hasValidSubscription: false
        };
      }

    case 'active':
      // Abonnement actif
      return {
        authorized: true,
        reason: 'active_subscription',
        subscriptionStatus: 'active',
        role,
        entrepriseId,
        trialStartedAt,
        trialEndsAt,
        trialRemainingDays: null,
        trialExpired: false,
        hasValidSubscription: true
      };

    case 'past_due':
      return {
        authorized: false,
        reason: 'subscription_past_due',
        subscriptionStatus: 'past_due',
        role,
        entrepriseId,
        trialStartedAt,
        trialEndsAt,
        trialRemainingDays: null,
        trialExpired: false,
        hasValidSubscription: false
      };

    case 'unpaid':
      return {
        authorized: false,
        reason: 'subscription_unpaid',
        subscriptionStatus: 'unpaid',
        role,
        entrepriseId,
        trialStartedAt,
        trialEndsAt,
        trialRemainingDays: null,
        trialExpired: false,
        hasValidSubscription: false
      };

    case 'canceled':
      return {
        authorized: false,
        reason: 'subscription_canceled',
        subscriptionStatus: 'canceled',
        role,
        entrepriseId,
        trialStartedAt,
        trialEndsAt,
        trialRemainingDays: null,
        trialExpired: false,
        hasValidSubscription: false
      };

    case 'expired':
      return {
        authorized: false,
        reason: 'subscription_expired',
        subscriptionStatus: 'expired',
        role,
        entrepriseId,
        trialStartedAt,
        trialEndsAt,
        trialRemainingDays: null,
        trialExpired: false,
        hasValidSubscription: false
      };

    case 'incomplete':
      return {
        authorized: false,
        reason: 'subscription_incomplete',
        subscriptionStatus: 'incomplete',
        role,
        entrepriseId,
        trialStartedAt,
        trialEndsAt,
        trialRemainingDays: null,
        trialExpired: false,
        hasValidSubscription: false
      };

    default:
      // Statut inconnu = refus par défaut (fail-safe)
      return {
        authorized: false,
        reason: 'unknown_status',
        subscriptionStatus: 'unknown',
        role,
        entrepriseId,
        trialStartedAt,
        trialEndsAt,
        trialRemainingDays: null,
        trialExpired: false,
        hasValidSubscription: false
      };
  }
}

// ============================================================================
// TYPE POUR CLIENT SUPABASE SSR
// ============================================================================

/**
 * Type pour le client Supabase SSR retourné par createServerClient
 */
export type SupabaseServerClient = ReturnType<typeof createServerClient>;

// ============================================================================
// FONCTION SERVEUR - Utilisation avec client Supabase SSR
// ============================================================================

/**
 * Options pour la fonction de récupération d'accès
 */
export interface GetSubscriptionAccessOptions {
  /** Client Supabase SSR déjà authentifié */
  supabase: SupabaseServerClient;
  /** ID utilisateur validé (issu des claims JWT) */
  userId: string;
  /** Date de référence pour les calculs (optionnel, défaut: maintenant) */
  referenceDate?: Date;
}

/**
 * Fonction serveur principale: récupère les données et évalue l'accès
 * Doit être utilisée uniquement côté serveur (Server Components, Route Handlers, Middleware)
 * 
 * @param options - Options incluant le client Supabase SSR et l'ID utilisateur
 * @returns Promise<SubscriptionDecision> - Décision complète d'accès
 */
export async function getSubscriptionAccess({
  supabase,
  userId,
  referenceDate = new Date()
}: GetSubscriptionAccessOptions): Promise<SubscriptionDecision> {
  try {
    // Validation des variables d'environnement (fail-safe)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Configuration Supabase manquante');
    }

    // 1. Récupérer le profil utilisateur avec rôle et entreprise_id
    const { data: profil, error: profilError } = await supabase
      .from('profils')
      .select('entreprise_id, role')
      .eq('id', userId)
      .single();

    if (profilError || !profil) {
      return {
        authorized: false,
        reason: 'profile_missing',
        subscriptionStatus: 'unknown',
        role: null,
        entrepriseId: null,
        trialStartedAt: null,
        trialEndsAt: null,
        trialRemainingDays: null,
        trialExpired: false,
        hasValidSubscription: false
      };
    }

    // 2. Récupérer les données d'abonnement de l'entreprise
    const { data: entreprise, error: entrepriseError } = await supabase
      .from('entreprises')
      .select('trial_started_at, trial_ends_at, subscription_status')
      .eq('id', profil.entreprise_id)
      .single();

    if (entrepriseError || !entreprise) {
      return {
        authorized: false,
        reason: 'company_missing',
        subscriptionStatus: 'unknown',
        role: profil.role as Role,
        entrepriseId: profil.entreprise_id,
        trialStartedAt: null,
        trialEndsAt: null,
        trialRemainingDays: null,
        trialExpired: false,
        hasValidSubscription: false
      };
    }

    // 3. Transformer les données brutes en SubscriptionRawData
    const rawData: SubscriptionRawData = {
      role: profil.role as Role,
      entrepriseId: profil.entreprise_id,
      subscriptionStatus: (entreprise.subscription_status as SubscriptionStatus) || null,
      trialStartedAt: entreprise.trial_started_at,
      trialEndsAt: entreprise.trial_ends_at
    };

    // 4. Évaluation pure avec les données récupérées
    return evaluateSubscription(rawData, referenceDate);

  } catch (error) {
    console.error('Erreur lors de la vérification d\'accès aux ressources:', error);
    
    // Erreur inattendue = fail-safe (refus d'accès)
    return {
      authorized: false,
      reason: 'internal_error',
      subscriptionStatus: 'unknown',
      role: null,
      entrepriseId: null,
      trialStartedAt: null,
      trialEndsAt: null,
      trialRemainingDays: null,
      trialExpired: false,
      hasValidSubscription: false
    };
  }
}

// ============================================================================
// FONCTIONS UTILITAIRES SIMPLIFIÉES
// ============================================================================

/**
 * Vérifie rapidement si un utilisateur a un accès valide (raccourci utilitaire)
 * 
 * @param options - Options incluant le client Supabase SSR et l'ID utilisateur
 * @returns Promise<boolean> - true si l'utilisateur a un accès valide
 */
export async function hasValidAccess(options: GetSubscriptionAccessOptions): Promise<boolean> {
  const decision = await getSubscriptionAccess(options);
  return decision.authorized;
}

/**
 * Récupère le nombre de jours restants d'essai pour un utilisateur
 * 
 * @param options - Options incluant le client Supabase SSR et l'ID utilisateur
 * @returns Promise<number | null> - Nombre de jours restants, null si pas en période d'essai
 */
export async function getTrialRemainingDays(options: GetSubscriptionAccessOptions): Promise<number | null> {
  const decision = await getSubscriptionAccess(options);
  return decision.trialRemainingDays;
}

/**
 * Vérifie si un utilisateur est en période d'essai valide
 * 
 * @param options - Options incluant le client Supabase SSR et l'ID utilisateur
 * @returns Promise<boolean> - true si l'utilisateur est en période d'essai valide
 */
export async function isOnValidTrial(options: GetSubscriptionAccessOptions): Promise<boolean> {
  const decision = await getSubscriptionAccess(options);
  return decision.subscriptionStatus === 'trialing' && decision.authorized;
}

/**
 * Vérifie si un utilisateur a un abonnement actif
 * 
 * @param options - Options incluant le client Supabase SSR et l'ID utilisateur
 * @returns Promise<boolean> - true si l'utilisateur a un abonnement actif
 */
export async function hasActiveSubscription(options: GetSubscriptionAccessOptions): Promise<boolean> {
  const decision = await getSubscriptionAccess(options);
  return decision.subscriptionStatus === 'active' && decision.authorized;
}