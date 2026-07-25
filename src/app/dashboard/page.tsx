"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getDashboardCardsForRole, Role } from "../../lib/permissions";
import DashboardShell from "../../components/dashboard/DashboardShell";
import DashboardSection from "../../components/dashboard/DashboardSection";
import { DashboardCard } from "../../components/dashboard/DashboardSection";
import KpiCard from "../../components/dashboard/KpiCard";
import { Truck, Package, CreditCard, TrendingUp, AlertCircle, Users, Calendar, BarChart, PackageCheck, Eye, UserX, Car, FileText, ShieldCheck } from "lucide-react";
import RadarTransport from "../../components/dashboard/RadarTransport";
import PriorityAlerts from "../../components/dashboard/PriorityAlerts";

type Facture = {
  montant_ttc: number | null;
  statut: string | null;
};

type Livraison = {
  id: string;
  statut: string | null;
};

type Depense = {
  montant: number | null;
};

export default function DashboardPage() {
  const [caTTC, setCaTTC] = useState(0);
  const [encaisse, setEncaisse] = useState(0);
  const [resteEncaisser, setResteEncaisser] = useState(0);
  const [facturesImpayees, setFacturesImpayees] = useState(0);
  const [livraisonsEnCours, setLivraisonsEnCours] = useState(0);
  const [totalDepenses, setTotalDepenses] = useState(0);
  const [benefice, setBenefice] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [hasClients, setHasClients] = useState<boolean>(false);
  const [hasDevis, setHasDevis] = useState<boolean>(false);
  const [hasFactures, setHasFactures] = useState<boolean>(false);
  const [hasLivraisons, setHasLivraisons] = useState<boolean>(false);

  useEffect(() => {
    initialiserDashboard();
  }, []);

  async function initialiserDashboard() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      window.location.href = "/login";
      return;
    }

    const { data: profil, error: profilError } = await supabase
      .from("profils")
      .select("entreprise_id, role")
      .eq("id", userId)
      .single();

    if (profilError || !profil?.entreprise_id) {
      alert("Entreprise introuvable pour cet utilisateur.");
      return;
    }

    setUserRole(profil.role);
    await chargerKPI(profil.entreprise_id);
  }

  async function chargerKPI(idEntreprise: string) {
    // Check if this is a new account (no clients yet)
    const { data: clientsData, error: clientsError } = await supabase
      .from("clients")
      .select("id")
      .eq("entreprise_id", idEntreprise)
      .limit(1);

    if (clientsError) {
      alert(clientsError.message);
      return;
    }

    const hasClients = clientsData && clientsData.length > 0;
    setHasClients(hasClients);

    // Check for devis (minimal query)
    const { data: devisData, error: devisError } = await supabase
      .from("devis")
      .select("id")
      .eq("entreprise_id", idEntreprise)
      .limit(1);

    const hasDevis = devisData && devisData.length > 0;

    const { data: facturesData, error: facturesError } = await supabase
      .from("factures")
      .select("montant_ttc, statut")
      .eq("entreprise_id", idEntreprise);

    if (facturesError) {
      alert(facturesError.message);
      return;
    }

    const factures = (facturesData || []) as Facture[];
    const hasFactures = factures.length > 0;

    const totalCA = factures.reduce(
      (somme, facture) => somme + (facture.montant_ttc || 0),
      0
    );

    const totalEncaisse = factures
      .filter((facture) => facture.statut === "Payée")
      .reduce((somme, facture) => somme + (facture.montant_ttc || 0), 0);

    const nbFacturesImpayees = factures.filter(
      (facture) => facture.statut !== "Payée"
    ).length;

    const { data: livraisonsData, error: livraisonsError } = await supabase
      .from("livraisons")
      .select("id, statut")
      .eq("entreprise_id", idEntreprise);

    if (livraisonsError) {
      alert(livraisonsError.message);
      return;
    }

    const livraisons = (livraisonsData || []) as Livraison[];
    const hasLivraisons = livraisons.length > 0;

    const nbLivraisonsEnCours = livraisons.filter(
      (livraison) => livraison.statut !== "Livrée"
    ).length;

    const { data: depensesData, error: depensesError } = await supabase
      .from("depenses")
      .select("montant")
      .eq("entreprise_id", idEntreprise);

    if (depensesError) {
      alert(depensesError.message);
      return;
    }

    const depenses = (depensesData || []) as Depense[];

    const totalDepensesCalcule = depenses.reduce(
      (somme, depense) => somme + (depense.montant || 0),
      0
    );

    // Set progress tracking
    setHasDevis(!!hasDevis);
    setHasFactures(!!hasFactures);
    setHasLivraisons(!!hasLivraisons);

    setCaTTC(totalCA);
    setEncaisse(totalEncaisse);
    setResteEncaisser(totalCA - totalEncaisse);
    setFacturesImpayees(nbFacturesImpayees);
    setLivraisonsEnCours(nbLivraisonsEnCours);
    setTotalDepenses(totalDepensesCalcule);
    setBenefice(totalEncaisse - totalDepensesCalcule);
  }

  async function deconnexion() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function formatPrix(montant: number) {
    return `${montant.toFixed(2)} €`;
  }

  // Utiliser la bibliothèque centralisée de permissions
  const allowedCards = getDashboardCardsForRole(userRole as Role | null);

  return (
    <DashboardShell>
      <div className="space-y-6">
        {/* 1. Bandeau principal avec ShieldCheck */}
        <div className="rounded-xl border border-gray-800 bg-gradient-to-r from-gray-900 to-gray-950 p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-green-500/30 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                  </div>
                </div>
                <div className="absolute -inset-1 bg-green-500/5 rounded-full blur"></div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Votre exploitation est sous contrôle</h2>
                <p className="text-gray-400 mt-2">Tous les systèmes sont opérationnels • Dernière mise à jour : aujourd'hui</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 bg-gray-900/50 px-3 py-2 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                <span className="text-sm text-gray-300">Statut : Normal</span>
              </div>
              <div className="hidden lg:block text-sm text-gray-500">Dashboard Premium</div>
            </div>
          </div>
        </div>

        {/* 2. Rangée de 6 indicateurs opérationnels - basés sur les données réelles */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {/* Livraisons prévues */}
          <KpiCard
            title="Livraisons prévues"
            value={livraisonsEnCours}
            subtitle={livraisonsEnCours > 0 ? `${livraisonsEnCours} en cours` : "Aucune livraison"}
            icon={PackageCheck}
            statusColor={livraisonsEnCours > 0 ? "green" : "blue"}
            href="/livraisons"
          />
          
          {/* Factures impayées */}
          <KpiCard
            title="Factures impayées"
            value={facturesImpayees}
            subtitle={facturesImpayees > 0 ? `${facturesImpayees} à recouvrer` : "Tout est payé"}
            icon={CreditCard}
            statusColor={facturesImpayees > 0 ? "red" : "green"}
            href="/factures"
          />
          
          {/* Clients actifs */}
          <KpiCard
            title="Clients"
            value={hasClients ? "✓" : "0"}
            subtitle={hasClients ? "Actifs" : "Aucun client"}
            icon={Users}
            statusColor={hasClients ? "green" : "blue"}
            href="/clients"
          />
          
          {/* CA TTC */}
          <KpiCard
            title="CA TTC"
            value={formatPrix(caTTC)}
            subtitle={`${formatPrix(encaisse)} encaissé`}
            icon={TrendingUp}
            statusColor={caTTC > 0 ? "green" : "blue"}
            href="/factures"
          />
          
          {/* Bénéfice */}
          <KpiCard
            title="Bénéfice"
            value={formatPrix(benefice)}
            subtitle={benefice >= 0 ? "Positif" : "Négatif"}
            icon={BarChart}
            statusColor={benefice > 0 ? "green" : benefice < 0 ? "red" : "blue"}
            href="/depenses"
          />
          
          {/* Devis en cours */}
          <KpiCard
            title="Devis"
            value={hasDevis ? "✓" : "0"}
            subtitle={hasDevis ? "En attente" : "Aucun devis"}
            icon={FileText}
            statusColor={hasDevis ? "orange" : "blue"}
            href="/devis"
          />
        </div>

        {/* 3. Grille principale desktop */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Tournées du jour */}
          <DashboardSection title="Tournées du jour" subtitle="Planification des livraisons">
            <div className="h-44 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-lg group-hover:border-gray-700 transition-colors duration-300">
              <div className="text-center">
                <p className="text-sm text-gray-500 font-medium">Carte des tournées</p>
                <p className="text-xs text-gray-600 mt-1">Contenu au Sprint suivant</p>
              </div>
            </div>
          </DashboardSection>

          {/* Radar Transport - widget signature */}
          <DashboardSection title="Radar Transport" subtitle="État du trafic et alertes">
            <RadarTransport />
          </DashboardSection>

          {/* Alertes prioritaires */}
          <DashboardSection title="Alertes prioritaires" subtitle="Actions requises">
            <PriorityAlerts />
          </DashboardSection>
        </div>

        {/* 4. Rangée suivante */}
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Performance du mois */}
          <DashboardSection title="Performance du mois" subtitle="Indicateurs clés">
            <div className="h-44 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-lg group-hover:border-gray-700 transition-colors duration-300">
              <div className="text-center">
                <p className="text-sm text-gray-500 font-medium">Graphiques de performance</p>
                <p className="text-xs text-gray-600 mt-1">Contenu au Sprint suivant</p>
              </div>
            </div>
          </DashboardSection>

          {/* Activité en temps réel */}
          <DashboardSection title="Activité en temps réel" subtitle="Flux des opérations">
            <div className="h-44 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-lg group-hover:border-gray-700 transition-colors duration-300">
              <div className="text-center">
                <p className="text-sm text-gray-500 font-medium">Flux d'activité</p>
                <p className="text-xs text-gray-600 mt-1">Contenu au Sprint suivant</p>
              </div>
            </div>
          </DashboardSection>

          {/* Répartition des livraisons */}
          <DashboardSection title="Répartition des livraisons" subtitle="Par région et type">
            <div className="h-44 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-lg group-hover:border-gray-700 transition-colors duration-300">
              <div className="text-center">
                <p className="text-sm text-gray-500 font-medium">Carte de répartition</p>
                <p className="text-xs text-gray-600 mt-1">Contenu au Sprint suivant</p>
              </div>
            </div>
          </DashboardSection>
        </div>

        {/* 5. Rangée basse */}
        <div className="grid gap-5 lg:grid-cols-2">
          {/* Conseil du jour */}
          <DashboardSection title="Conseil du jour" subtitle="Optimisation et bonnes pratiques">
            <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-lg group-hover:border-gray-700 transition-colors duration-300">
              <div className="text-center px-4">
                <p className="text-sm text-gray-500 font-medium">Conseil personnalisé</p>
                <p className="text-xs text-gray-600 mt-1">Contenu au Sprint suivant</p>
              </div>
            </div>
          </DashboardSection>

          {/* Actions rapides */}
          <DashboardSection title="Actions rapides" subtitle="Opérations fréquentes">
            <div className="h-32 flex items-center justify-center border-2 border-dashed border-gray-800 rounded-lg group-hover:border-gray-700 transition-colors duration-300">
              <div className="text-center px-4">
                <p className="text-sm text-gray-500 font-medium">Boutons d'action</p>
                <p className="text-xs text-gray-600 mt-1">Contenu au Sprint suivant</p>
              </div>
            </div>
          </DashboardSection>
        </div>

        {/* 6. Barre de statut inférieure */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-6">
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                <span className="text-gray-300">Système : Opérationnel</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                <span className="text-gray-300">Base de données : Connectée</span>
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                <span className="text-gray-300">API : Répond</span>
              </div>
            </div>
            <div className="text-gray-400 text-xs">
              Dashboard Sprint 1 • Structure de base
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}