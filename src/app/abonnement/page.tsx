"use client";

import { Suspense, useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Shield, Clock, AlertCircle, CheckCircle, XCircle, CreditCard, Calendar, Users, Truck } from "lucide-react";
import { useSearchParams } from "next/navigation";

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
 * Composant principal avec Suspense boundary pour useSearchParams
 */
export default function AbonnementPage() {
  return (
    <Suspense fallback={<AbonnementPageLoading />}>
      <AbonnementPageContent />
    </Suspense>
  );
}

/**
 * Affichage de chargement pendant le suspense
 */
function AbonnementPageLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Chargement de vos informations d'abonnement...</p>
      </div>
    </div>
  );
}

/**
 * Contenu principal de la page d'abonnement
 * Ce composant utilise useSearchParams qui nécessite Suspense
 */
function AbonnementPageContent() {
  const [subscriptionData, setSubscriptionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // useSearchParams doit être utilisé dans un composant enveloppé par Suspense
  const searchParams = useSearchParams();
  const reason = searchParams.get("reason");

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  async function loadSubscriptionData() {
    try {
      setLoading(true);
      setError(null);

      // Récupérer la session utilisateur
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        // Utilisateur non connecté - afficher page générique
        setSubscriptionData({
          authorized: false,
          subscriptionStatus: "not_authenticated",
          subscriptionInactiveReason: "not_authenticated",
          trialRemainingDays: null,
          hasValidSubscription: false
        });
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
      setError("Impossible de charger les informations d'abonnement. Veuillez rafraîchir la page.");
    } finally {
      setLoading(false);
    }
  }

  // Fonction pour formater les dates
  function formatDate(dateString: string | null): string {
    if (!dateString) return "Non définie";
    try {
      return new Date(dateString).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric"
      });
    } catch {
      return "Date invalide";
    }
  }

  // Déterminer le type d'état pour l'affichage
  function getStatusType() {
    if (!subscriptionData) return "unknown";

    const status = subscriptionData.subscriptionStatus;
    const authorized = subscriptionData.authorized;

    if (status === "super_admin_exempt") return "super_admin";
    if (status === "trialing" && authorized) return "trialing_active";
    if (status === "trialing" && !authorized) return "trialing_expired";
    if (status === "active") return "active";
    if (status === "past_due") return "past_due";
    if (status === "unpaid") return "unpaid";
    if (status === "canceled") return "canceled";
    if (status === "expired") return "expired";
    if (status === "incomplete") return "incomplete";
    
    return "unknown";
  }

  // Obtenir la configuration d'affichage selon le statut
  function getStatusConfig() {
    const statusType = getStatusType();

    switch (statusType) {
      case "super_admin":
        return {
          title: "Compte Super Admin",
          description: "Vous avez un accès complet à toutes les fonctionnalités.",
          icon: Shield,
          color: "text-purple-600",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
          showUpgradeButton: false,
          showContactButton: false,
          showDaysRemaining: false
        };

      case "trialing_active":
        return {
          title: "Essai gratuit actif",
          description: "Profitez de toutes les fonctionnalités pendant votre période d'essai.",
          icon: Clock,
          color: "text-blue-600",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
          showUpgradeButton: true,
          showContactButton: false,
          showDaysRemaining: true
        };

      case "trialing_expired":
        return {
          title: "Essai gratuit expiré",
          description: "Votre période d'essai est terminée. Passez à un abonnement pour continuer.",
          icon: XCircle,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          showUpgradeButton: true,
          showContactButton: true,
          showDaysRemaining: false
        };

      case "active":
        return {
          title: "Abonnement actif",
          description: "Votre abonnement est actif. Merci pour votre confiance !",
          icon: CheckCircle,
          color: "text-green-600",
          bgColor: "bg-green-50",
          borderColor: "border-green-200",
          showUpgradeButton: false,
          showContactButton: false,
          showDaysRemaining: false
        };

      case "past_due":
        return {
          title: "Paiement en retard",
          description: "Votre dernier paiement est en retard. Veuillez régulariser votre situation.",
          icon: AlertCircle,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
          showUpgradeButton: true,
          showContactButton: true,
          showDaysRemaining: false
        };

      case "unpaid":
        return {
          title: "Paiement non reçu",
          description: "Un paiement est attendu pour votre abonnement.",
          icon: CreditCard,
          color: "text-yellow-600",
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          showUpgradeButton: true,
          showContactButton: true,
          showDaysRemaining: false
        };

      case "canceled":
        return {
          title: "Abonnement annulé",
          description: "Votre abonnement a été annulé. Vous pouvez souscrire à nouveau à tout moment.",
          icon: XCircle,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          showUpgradeButton: true,
          showContactButton: false,
          showDaysRemaining: false
        };

      case "expired":
        return {
          title: "Abonnement expiré",
          description: "Votre abonnement a expiré. Renouvelez-le pour continuer à utiliser l'application.",
          icon: Calendar,
          color: "text-red-600",
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          showUpgradeButton: true,
          showContactButton: false,
          showDaysRemaining: false
        };

      case "incomplete":
        return {
          title: "Abonnement incomplet",
          description: "Votre processus d'abonnement n'a pas été finalisé.",
          icon: AlertCircle,
          color: "text-orange-600",
          bgColor: "bg-orange-50",
          borderColor: "border-orange-200",
          showUpgradeButton: true,
          showContactButton: true,
          showDaysRemaining: false
        };

      default:
        return {
          title: "Statut inconnu",
          description: "Impossible de déterminer votre statut d'abonnement.",
          icon: AlertCircle,
          color: "text-gray-600",
          bgColor: "bg-gray-50",
          borderColor: "border-gray-200",
          showUpgradeButton: false,
          showContactButton: true,
          showDaysRemaining: false
        };
    }
  }

  // Obtenir le message d'erreur selon la raison
  function getReasonMessage() {
    if (!reason) return null;

    const messages: Record<string, string> = {
      "trial_expired": "Votre période d'essai de 30 jours est terminée.",
      "subscription_past_due": "Votre paiement est en retard.",
      "subscription_unpaid": "Un paiement est attendu pour votre abonnement.",
      "subscription_canceled": "Votre abonnement a été annulé.",
      "subscription_expired": "Votre abonnement a expiré.",
      "subscription_incomplete": "Votre processus d'abonnement n'est pas complet.",
      "subscription_data_missing": "Les données d'abonnement sont manquantes.",
      "company_not_found": "Votre entreprise n'a pas été trouvée.",
      "user_not_found": "Votre compte utilisateur n'a pas été trouvé.",
      "profile_not_found": "Votre profil n'a pas été trouvé.",
      "not_authenticated": "Vous devez être connecté pour accéder à cette page."
    };

    return messages[reason] || "Accès refusé pour une raison inconnue.";
  }

  if (loading) {
    return <AbonnementPageLoading />;
  }

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  const reasonMessage = getReasonMessage();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <span className="text-xl font-bold text-gray-900">TRANSPORT</span>
                <span className="text-xl font-bold text-green-600">ERP</span>
              </div>
              <div className="hidden md:block">
                <h1 className="text-lg font-semibold text-gray-900">Gestion d'abonnement</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <a 
                href="/dashboard" 
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Retour au dashboard
              </a>
              <button
                onClick={() => supabase.auth.signOut().then(() => window.location.href = "/")}
                className="text-gray-600 hover:text-gray-900 text-sm font-medium"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Message d'erreur si présent */}
        {reasonMessage && (
          <div className="mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <p className="text-red-800 font-medium">{reasonMessage}</p>
            </div>
            <p className="text-red-600 text-sm mt-1">
              Vous avez été redirigé vers cette page car vous n'avez pas accès aux fonctionnalités demandées.
            </p>
          </div>
        )}

        {/* Carte principale d'état */}
        <div className={`rounded-xl border ${statusConfig.borderColor} ${statusConfig.bgColor} p-8 mb-8`}>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-lg ${statusConfig.bgColor}`}>
                <StatusIcon className={`w-8 h-8 ${statusConfig.color}`} />
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${statusConfig.color} mb-2`}>
                  {statusConfig.title}
                </h2>
                <p className="text-gray-700 mb-4 max-w-2xl">
                  {statusConfig.description}
                </p>
                
                {/* Jours restants d'essai */}
                {statusConfig.showDaysRemaining && subscriptionData?.trialRemainingDays !== null && (
                  <div className="flex items-center space-x-2">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <span className="text-blue-700 font-medium">
                      {subscriptionData.trialRemainingDays} jour{subscriptionData.trialRemainingDays !== 1 ? 's' : ''} restant{subscriptionData.trialRemainingDays !== 1 ? 's' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Grille d'informations */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Statut d'abonnement */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <CreditCard className="w-5 h-5 text-gray-500 mr-2" />
              Statut d'abonnement
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Statut actuel:</span>
                <span className={`font-medium ${statusConfig.color}`}>
                  {subscriptionData?.subscriptionStatus || "Inconnu"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Accès autorisé:</span>
                <span className={`font-medium ${subscriptionData?.authorized ? 'text-green-600' : 'text-red-600'}`}>
                  {subscriptionData?.authorized ? "Oui" : "Non"}
                </span>
              </div>
            </div>
          </div>

          {/* Informations entreprise */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Users className="w-5 h-5 text-gray-500 mr-2" />
              Votre entreprise
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Type de compte:</span>
                <span className="font-medium text-gray-900">
                  {subscriptionData?.subscriptionStatus === "super_admin_exempt" ? "Super Admin" : "Entreprise"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Mode d'accès:</span>
                <span className="font-medium text-gray-900">
                  {subscriptionData?.hasValidSubscription ? "Abonnement valide" : "Accès limité"}
                </span>
              </div>
            </div>
          </div>

          {/* Actions disponibles */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <Truck className="w-5 h-5 text-gray-500 mr-2" />
              Actions
            </h3>
            <div className="space-y-3">
              {statusConfig.showUpgradeButton && (
                <button
                  disabled
                  className="w-full bg-green-600 text-white py-2 px-4 rounded-md font-medium opacity-50 cursor-not-allowed"
                >
                  Passer à un abonnement (bientôt disponible)
                </button>
              )}
              
              {statusConfig.showContactButton && (
                <button
                  onClick={() => window.location.href = "mailto:support@transporterp.com"}
                  className="w-full bg-gray-100 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-200 transition-colors"
                >
                  Contacter le support
                </button>
              )}

              <button
                onClick={loadSubscriptionData}
                className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md font-medium hover:bg-gray-50 transition-colors"
              >
                Actualiser les informations
              </button>
            </div>
          </div>
        </div>

        {/* Informations détaillées */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Détails techniques</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Données d'abonnement</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Statut:</span>
                  <code className="text-gray-900 bg-gray-50 px-2 py-1 rounded">
                    {subscriptionData?.subscriptionStatus || "N/A"}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Raison du refus:</span>
                  <code className="text-gray-900 bg-gray-50 px-2 py-1 rounded">
                    {subscriptionData?.subscriptionInactiveReason || "N/A"}
                  </code>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-2">Informations de débogage</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">ID utilisateur:</span>
                  <code className="text-gray-900 bg-gray-50 px-2 py-1 rounded text-xs">
                    {subscriptionData?.userId ? `${subscriptionData.userId.substring(0, 8)}...` : "Non connecté"}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Timestamp:</span>
                  <code className="text-gray-900 bg-gray-50 px-2 py-1 rounded">
                    {new Date().toLocaleTimeString("fr-FR")}
                  </code>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Note importante */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-2">Information importante</h4>
              <p className="text-blue-700 mb-2">
                Le système de paiement Stripe n'est pas encore intégré. Cette page affiche l'état théorique 
                de votre abonnement basé sur les données enregistrées dans la base de données.
              </p>
              <p className="text-blue-600 text-sm">
                Une fois Stripe intégré, vous pourrez gérer votre abonnement, mettre à jour votre méthode de paiement,
                et consulter votre historique de facturation directement depuis cette page.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} Transport ERP. Tous droits réservés.</p>
            <p className="mt-1">Page d'abonnement • Version de développement</p>
          </div>
        </div>
      </footer>
    </div>
  );
}