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
  const [userRole, setUserRole] = useState<string | null>(null);

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

  // Définition des cartes avec leurs permissions par rôle
  const dashboardCards = [
    {
      href: "/clients",
      title: "Clients",
      subtitle: "Gérer les clients",
      allowedRoles: ["super_admin", "admin", "exploitant"]
    },
    {
      href: "/devis",
      title: "Devis",
      subtitle: "Créer et suivre les devis",
      allowedRoles: ["super_admin", "admin", "exploitant", "client"]
    },
    {
      href: "/livraisons",
      title: "Livraisons",
      subtitle: "Suivre les livraisons",
      allowedRoles: ["super_admin", "admin", "exploitant", "chauffeur"]
    },
    {
      href: "/factures",
      title: "Factures",
      subtitle: "Suivre les paiements",
      allowedRoles: ["super_admin", "admin", "exploitant", "client"]
    },
    {
      href: "/depenses",
      title: "Dépenses",
      subtitle: "Suivre les coûts de transport",
      allowedRoles: ["super_admin", "admin", "exploitant"]
    },
    {
      href: "/chauffeurs",
      title: "Chauffeurs",
      subtitle: "Gérer les chauffeurs",
      allowedRoles: ["super_admin", "admin", "exploitant", "chauffeur"]
    },
    {
      href: "/camions",
      title: "Camions",
      subtitle: "Gérer les camions",
      allowedRoles: ["super_admin", "admin", "exploitant", "chauffeur"]
    },
    {
      href: "/planning",
      title: "Planning",
      subtitle: "Voir l'organisation",
      allowedRoles: ["super_admin", "admin", "exploitant"]
    },
    {
      href: "/rentabilite",
      title: "Rentabilité",
      subtitle: "Analyser la rentabilité",
      allowedRoles: ["super_admin", "admin", "exploitant"]
    },
    {
      href: "/utilisateurs",
      title: "Utilisateurs",
      subtitle: "Gérer les accès",
      allowedRoles: ["super_admin", "admin"]
    },
    {
      href: "/admin",
      title: "Administration SaaS",
      subtitle: "Gérer l'administration",
      allowedRoles: ["super_admin"]
    }
  ];

  // Filtrer les cartes autorisées pour le rôle utilisateur
  const allowedCards = userRole
    ? dashboardCards.filter(card => card.allowedRoles.includes(userRole))
    : dashboardCards;

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