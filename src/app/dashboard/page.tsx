"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { getDashboardCardsForRole, Role } from "../../lib/permissions";

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
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-5xl font-bold">Dashboard</h1>

        <button
          onClick={deconnexion}
          className="rounded bg-red-600 px-4 py-2 hover:bg-red-700"
        >
          Déconnexion
        </button>
      </div>

      {/* Welcome card for new users (no clients yet) */}
      {!hasClients && (
        <div className="mb-8 rounded-xl border border-gray-700 bg-gray-900 p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <span className="text-3xl">👋</span>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-2">Bienvenue dans Transport SaaS ERP</h2>
              <p className="text-gray-300 mb-4">
                Votre espace est prêt. Créez votre premier dossier pour découvrir le fonctionnement complet du logiciel.
              </p>
              <div className="space-y-2 text-sm text-gray-400 mb-4">
                <div className="flex items-center">
                  <span className="mr-2">{hasClients ? '✅' : '□'}</span>
                  <span>Créer un premier client</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">{hasDevis ? '✅' : '□'}</span>
                  <span>Créer un premier devis</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">{hasLivraisons ? '✅' : '□'}</span>
                  <span>Transformer en livraison</span>
                </div>
                <div className="flex items-center">
                  <span className="mr-2">{hasFactures ? '✅' : '□'}</span>
                  <span>Générer la première facture</span>
                </div>
              </div>
              {/* Adaptive button based on progress */}
              {!hasClients && (
                <a
                  href="/clients/nouveau"
                  className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
                >
                  Créer mon premier client
                </a>
              )}
              {hasClients && !hasDevis && (
                <a
                  href="/devis/nouveau"
                  className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
                >
                  Créer mon premier devis
                </a>
              )}
              {hasClients && hasDevis && !hasLivraisons && (
                <a
                  href="/livraisons/nouveau"
                  className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
                >
                  Créer ma première livraison
                </a>
              )}
              {hasClients && hasDevis && hasLivraisons && !hasFactures && (
                <a
                  href="/factures/nouveau"
                  className="inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
                >
                  Créer ma première facture
                </a>
              )}
              {hasClients && hasDevis && hasLivraisons && hasFactures && (
                <div className="text-center">
                  <p className="text-green-400 font-medium mb-2">🎉 Tous les éléments sont en place !</p>
                  <p className="text-gray-400 text-sm mb-4">Votre espace est maintenant opérationnel.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-gray-400">CA TTC</p>
          <h2 className="text-3xl font-bold text-green-400">
            {formatPrix(caTTC)}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-gray-400">Encaissé</p>
          <h2 className="text-3xl font-bold text-blue-400">
            {formatPrix(encaisse)}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-gray-400">À encaisser</p>
          <h2 className="text-3xl font-bold text-orange-400">
            {formatPrix(resteEncaisser)}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-gray-400">Dépenses</p>
          <h2 className="text-3xl font-bold text-red-400">
            {formatPrix(totalDepenses)}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-gray-400">Bénéfice encaissé</p>
          <h2 className="text-3xl font-bold text-emerald-400">
            {formatPrix(benefice)}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-gray-400">Factures impayées</p>
          <h2 className="text-3xl font-bold text-red-400">
            {facturesImpayees}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
          <p className="text-gray-400">Livraisons en cours</p>
          <h2 className="text-3xl font-bold text-yellow-400">
            {livraisonsEnCours}
          </h2>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {allowedCards.map((card) => (
          <a
            key={card.href}
            href={card.href}
            className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:bg-gray-800"
          >
            <h2 className="text-2xl font-bold">{card.title}</h2>
            <p className="mt-2 text-gray-400">{card.subtitle}</p>
          </a>
        ))}
      </div>
    </main>
  );
}