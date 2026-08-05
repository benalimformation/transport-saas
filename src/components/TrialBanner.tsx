"use client";

import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { Clock, AlertTriangle, CheckCircle, XCircle, ArrowRight } from "lucide-react";

/**
 * Type correspondant à l'API subscription
 */
interface SubscriptionDecision {
  authorized: boolean;
  reason: string;
  subscriptionStatus: string;
  role: string | null;
  entrepriseId: string | null;
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  trialRemainingDays: number | null;
  trialExpired: boolean;
  hasValidSubscription: boolean;
}

/**
 * Bannière d'essai - Affiche l'état de l'essai et de l'abonnement dans l'espace ERP
 * 
 * Ce composant doit être placé dans les pages protégées pour informer l'utilisateur
 * de son état d'essai et le rediriger vers la page d'abonnement si nécessaire.
 * 
 * @example
 * ```tsx
 * import TrialBanner from "@/components/TrialBanner";
 * 
 * export default function DashboardPage() {
 *   return (
 *     <div>
 *       <TrialBanner />
 *       {/* Reste du contenu *\/}
 *     </div>
 *   );
 * }
 * ```
 */
export default function TrialBanner() {
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  async function loadSubscriptionData() {
    try {
      setLoading(true);

      // Récupérer la session utilisateur
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        setLoading(false);
        return;
      }

      // Appeler l'API route pour récupérer les données d'abonnement
      const response = await fetch('/api/subscription', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      const access: SubscriptionDecision = await response.json();
      setSubscriptionData(access);

    } catch (err) {
      console.error("Erreur lors du chargement des données d'abonnement:", err);
    } finally {
      setLoading(false);
    }
  }

  // Déterminer si la bannière doit être affichée
  function shouldShowBanner() {
    if (loading || !subscriptionData) return false;
    
    const status = subscriptionData.subscriptionStatus;
    const authorized = subscriptionData.authorized;

    // Ne pas afficher pour :
    // - super_admin (exemption RBAC)
    // - abonnement actif
    // - statut inconnu ou erreur
    if (status === "super_admin_exempt" || status === "active") {
      return false;
    }

    // Afficher pour :
    // - Essai en cours (même valide, pour informer)
    // - Essai expiré
    // - Problèmes d'abonnement (past_due, unpaid, etc.)
    return true;
  }

  // Obtenir la configuration d'affichage selon le statut
  function getBannerConfig() {
    if (!subscriptionData) return null;

    const status = subscriptionData.subscriptionStatus;
    const authorized = subscriptionData.authorized;
    const trialRemainingDays = subscriptionData.trialRemainingDays;

    if (status === "trialing" && authorized) {
      // Essai actif
      if (trialRemainingDays !== null && trialRemainingDays <= 3) {
        // Derniers jours - alerte urgente
        return {
          title: `Essai gratuit - ${trialRemainingDays} jour${trialRemainingDays !== 1 ? 's' : ''} restant${trialRemainingDays !== 1 ? 's' : ''}`,
          message: "Votre essai se termine bientôt. Passez à un abonnement pour continuer à utiliser toutes les fonctionnalités.",
          icon: AlertTriangle,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
          showUpgradeButton: true,
          showCloseButton: true,
          urgency: "high"
        };
      } else if (trialRemainingDays !== null && trialRemainingDays <= 7) {
        // Semaine restante - alerte moyenne
        return {
          title: `Essai gratuit - ${trialRemainingDays} jours restants`,
          message: "Profitez de votre essai gratuit. Pensez à souscrire à un abonnement avant la fin de la période.",
          icon: Clock,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          showUpgradeButton: true,
          showCloseButton: true,
          urgency: "medium"
        };
      } else {
        // Essai en cours normal
        return {
          title: "Essai gratuit actif",
          message: `Vous profitez de ${trialRemainingDays !== null ? trialRemainingDays + ' jours' : 'votre période'} d'essai gratuit.`,
          icon: Clock,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          showUpgradeButton: false,
          showCloseButton: true,
          urgency: "low"
        };
      }
    } else if (status === "trialing" && !authorized) {
      // Essai expiré
      return {
        title: "Essai gratuit expiré",
        message: "Votre période d'essai est terminée. Passez à un abonnement pour continuer à utiliser l'application.",
        icon: XCircle,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        showUpgradeButton: true,
        showCloseButton: false, // Ne pas permettre de fermer - problème bloquant
        urgency: "critical"
      };
    } else if (status === "past_due" || status === "unpaid") {
      // Paiement en retard
      return {
        title: "Paiement en attente",
        message: "Votre dernier paiement est en retard. Veuillez régulariser votre situation pour éviter l'interruption de service.",
        icon: AlertTriangle,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        showUpgradeButton: true,
        showCloseButton: false,
        urgency: "critical"
      };
    } else if (status === "canceled" || status === "expired") {
      // Abonnement annulé ou expiré
      return {
        title: "Abonnement interrompu",
        message: "Votre abonnement n'est plus actif. Souscrivez à nouveau pour continuer à utiliser l'application.",
        icon: XCircle,
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
        showUpgradeButton: true,
        showCloseButton: false,
        urgency: "critical"
      };
    } else if (status === "incomplete") {
      // Abonnement incomplet
      return {
        title: "Abonnement incomplet",
        message: "Votre processus d'abonnement n'a pas été finalisé. Veuillez compléter votre souscription.",
        icon: AlertTriangle,
        color: "text-orange-600",
        bgColor: "bg-orange-50",
        borderColor: "border-orange-200",
        showUpgradeButton: true,
        showCloseButton: false,
        urgency: "high"
      };
    }

    // Par défaut, ne rien afficher
    return null;
  }

  // Si la bannière ne doit pas être affichée, retourner null
  if (!shouldShowBanner() || !visible) {
    return null;
  }

  const bannerConfig = getBannerConfig();
  if (!bannerConfig) {
    return null;
  }

  const BannerIcon = bannerConfig.icon;

  return (
    <div className={`rounded-lg border ${bannerConfig.borderColor} ${bannerConfig.bgColor} p-4 mb-6`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-lg ${bannerConfig.bgColor}`}>
            <BannerIcon className={`w-5 h-5 ${bannerConfig.color}`} />
          </div>
          <div className="flex-1">
            <h3 className={`font-semibold ${bannerConfig.color} mb-1`}>
              {bannerConfig.title}
            </h3>
            <p className="text-gray-700 text-sm">
              {bannerConfig.message}
            </p>
            
            {/* Bouton d'upgrade */}
            {bannerConfig.showUpgradeButton && (
              <div className="mt-3">
                <a
                  href="/abonnement"
                  className={`inline-flex items-center px-4 py-2 rounded-md text-sm font-medium ${
                    bannerConfig.urgency === "critical" 
                      ? "bg-red-600 text-white hover:bg-red-700" 
                      : bannerConfig.urgency === "high"
                      ? "bg-orange-600 text-white hover:bg-orange-700"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  } transition-colors`}
                >
                  Gérer mon abonnement
                  <ArrowRight className="ml-2 w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Bouton de fermeture (si autorisé) */}
        {bannerConfig.showCloseButton && (
          <button
            onClick={() => setVisible(false)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fermer la bannière"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Barre de progression pour les essais (si jours restants) */}
      {subscriptionData?.trialRemainingDays !== null && subscriptionData?.subscriptionStatus === "trialing" && (
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Jours restants</span>
            <span>{subscriptionData.trialRemainingDays} / 30 jours</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                subscriptionData.trialRemainingDays <= 3 ? "bg-red-500" :
                subscriptionData.trialRemainingDays <= 7 ? "bg-orange-500" :
                "bg-green-500"
              }`}
              style={{ width: `${(subscriptionData.trialRemainingDays / 30) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Hook personnalisé pour récupérer les données d'abonnement
 * 
 * @returns {Object} Données d'abonnement et état de chargement
 */
export function useSubscriptionData() {
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData.session?.user.id;

        if (!userId) {
          setLoading(false);
          return;
        }

        // Appeler l'API route pour récupérer les données d'abonnement
        const response = await fetch('/api/subscription', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error(`Erreur HTTP ${response.status}: ${response.statusText}`);
        }

        const access: SubscriptionDecision = await response.json();
        setSubscriptionData(access);
      } catch (err) {
        console.error("Erreur lors du chargement des données d'abonnement:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return { subscriptionData, loading };
}

/**
 * Composant minimal pour afficher uniquement les jours restants d'essai
 * 
 * @example
 * ```tsx
 * <TrialDaysRemaining />
 * ```
 */
export function TrialDaysRemaining() {
  const { subscriptionData, loading } = useSubscriptionData();

  if (loading || !subscriptionData || subscriptionData.subscriptionStatus !== "trialing") {
    return null;
  }

  const days = subscriptionData.trialRemainingDays;
  if (days === null) return null;

  return (
    <div className="inline-flex items-center text-sm text-gray-600">
      <Clock className="w-4 h-4 mr-1" />
      <span>{days} jour{days !== 1 ? 's' : ''} restant{days !== 1 ? 's' : ''}</span>
    </div>
  );
}