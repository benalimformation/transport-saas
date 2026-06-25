"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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
      .select("entreprise_id")
      .eq("id", userId)
      .single();

    if (profilError || !profil?.entreprise_id) {
      alert("Entreprise introuvable pour cet utilisateur.");
      return;
    }

    await chargerKPI(profil.entreprise_id);
  }

  async function chargerKPI(idEntreprise: string) {
    const { data: facturesData, error: facturesError } = await supabase
      .from("factures")
      .select("montant_ttc, statut")
      .eq("entreprise_id", idEntreprise);

    if (facturesError) {
      alert(facturesError.message);
      return;
    }

    const factures = (facturesData || []) as Facture[];

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
        <a href="/clients" className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:bg-gray-800">
          <h2 className="text-2xl font-bold">Clients</h2>
          <p className="mt-2 text-gray-400">Gérer les clients</p>
        </a>

        <a href="/devis" className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:bg-gray-800">
          <h2 className="text-2xl font-bold">Devis</h2>
          <p className="mt-2 text-gray-400">Créer et suivre les devis</p>
        </a>

        <a href="/livraisons" className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:bg-gray-800">
          <h2 className="text-2xl font-bold">Livraisons</h2>
          <p className="mt-2 text-gray-400">Suivre les livraisons</p>
        </a>

        <a href="/factures" className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:bg-gray-800">
          <h2 className="text-2xl font-bold">Factures</h2>
          <p className="mt-2 text-gray-400">Suivre les paiements</p>
        </a>

        <a href="/depenses" className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:bg-gray-800">
          <h2 className="text-2xl font-bold">Dépenses</h2>
          <p className="mt-2 text-gray-400">Suivre les coûts de transport</p>
        </a>

        <a href="/chauffeurs" className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:bg-gray-800">
          <h2 className="text-2xl font-bold">Chauffeurs</h2>
          <p className="mt-2 text-gray-400">Gérer les chauffeurs</p>
        </a>

        <a href="/camions" className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:bg-gray-800">
          <h2 className="text-2xl font-bold">Camions</h2>
          <p className="mt-2 text-gray-400">Gérer les camions</p>
        </a>

        <a href="/planning" className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:bg-gray-800">
          <h2 className="text-2xl font-bold">Planning</h2>
          <p className="mt-2 text-gray-400">Voir l'organisation</p>
        </a>

        <a href="/rentabilite" className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:bg-gray-800">
          <h2 className="text-2xl font-bold">Rentabilité</h2>
          <p className="mt-2 text-gray-400">Analyser la rentabilité</p>
        </a>

        <a href="/utilisateurs" className="rounded-xl border border-gray-800 bg-gray-900 p-6 hover:bg-gray-800">
          <h2 className="text-2xl font-bold">Utilisateurs</h2>
          <p className="mt-2 text-gray-400">Gérer les accès</p>
        </a>
      </div>
    </main>
  );
}