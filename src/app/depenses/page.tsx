"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Depense = {
  id: string;
  date_depense: string;
  categorie: string | null;
  description: string | null;
  montant: number;
  entreprise_id: string;
};

// Catégories standardisées pour le transport
const CATEGORIES_TRANSPORT = [
  "Carburant",
  "Péages",
  "Entretien",
  "Réparations",
  "Assurance",
  "Parking",
  "Lavage",
  "Pneus",
  "Administratif",
  "Autre"
];

export default function DepensesPage() {
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [filtreCategorie, setFiltreCategorie] = useState<string | null>(null);
  const [filtreDateDebut, setFiltreDateDebut] = useState<string | null>(null);
  const [filtreDateFin, setFiltreDateFin] = useState<string | null>(null);
  const [totalFiltre, setTotalFiltre] = useState<number>(0);

  useEffect(() => {
    initialiserPage();
  }, []);

  async function initialiserPage() {
    setLoading(true);
    setError(null);

    try {
      // Vérifier la session utilisateur
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        window.location.href = "/login";
        return;
      }

      // Récupérer l'entreprise_id depuis profils
      const { data: profil, error: profilError } = await supabase
        .from("profils")
        .select("entreprise_id")
        .eq("id", userId)
        .single();

      if (profilError || !profil?.entreprise_id) {
        setError("Entreprise introuvable pour cet utilisateur.");
        return;
      }

      setEntrepriseId(profil.entreprise_id);
      await chargerDepenses(profil.entreprise_id);
    } catch (err) {
      setError("Erreur lors de l'initialisation: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function chargerDepenses(idEntreprise: string) {
    setLoading(true);
    setError(null);

    try {
      // Charger les dépenses avec filtre entreprise_id
      let query = supabase
        .from("depenses")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .order("date_depense", { ascending: false });

      // Appliquer les filtres si ils sont définis
      if (filtreCategorie) {
        query = query.eq("categorie", filtreCategorie);
      }
      if (filtreDateDebut) {
        query = query.gte("date_depense", filtreDateDebut);
      }
      if (filtreDateFin) {
        query = query.lte("date_depense", filtreDateFin);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setDepenses(data || []);

      // Calculer le total des dépenses filtrées
      const total = data?.reduce((sum, depense) => sum + (depense.montant || 0), 0) || 0;
      setTotalFiltre(total);
    } catch (err) {
      setError("Erreur lors du chargement des dépenses: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function appliquerFiltres() {
    if (entrepriseId) {
      chargerDepenses(entrepriseId);
    }
  }

  function reinitialiserFiltres() {
    setFiltreCategorie(null);
    setFiltreDateDebut(null);
    setFiltreDateFin(null);
    setTotalFiltre(0);
    if (entrepriseId) {
      chargerDepenses(entrepriseId);
    }
  }

  async function supprimerDepense(id: string) {
    const confirmation = confirm("Supprimer cette dépense ?");

    if (!confirmation) return;

    try {
      const { error } = await supabase
        .from("depenses")
        .delete()
        .eq("id", id)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        throw error;
      }

      if (entrepriseId) {
        await chargerDepenses(entrepriseId);
      }
    } catch (err) {
      setError("Erreur lors de la suppression: " + (err as Error).message);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  function formatMontant(montant: number) {
    return `${montant.toFixed(2)} €`;
  }

  if (loading && !entrepriseId) {
    return (
      <main className="min-h-screen bg-gray-950 p-10 text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="mb-4 text-2xl">Chargement...</div>
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-950 p-10 text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="bg-red-900 border border-red-700 rounded-lg p-6 max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4 text-red-400">Erreur</h2>
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
            >
              Réessayer
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-5xl font-bold">Dépenses</h1>
        <div className="flex gap-4">
          <a href="/dashboard" className="rounded bg-gray-700 px-4 py-2 hover:bg-gray-600">
            ← Retour Dashboard
          </a>
          <a href="/depenses/nouveau" className="rounded bg-green-600 px-4 py-2 hover:bg-green-700">
            + Nouvelle dépense
          </a>
        </div>
      </div>

      {/* Section des filtres */}
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-2">Catégorie</label>
            <select
              value={filtreCategorie || ""}
              onChange={(e) => setFiltreCategorie(e.target.value || null)}
              className="w-full rounded bg-gray-800 p-3"
            >
              <option value="">Toutes les catégories</option>
              {CATEGORIES_TRANSPORT.map((categorie) => (
                <option key={categorie} value={categorie}>{categorie}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date début</label>
            <input
              type="date"
              value={filtreDateDebut || ""}
              onChange={(e) => setFiltreDateDebut(e.target.value || null)}
              className="w-full rounded bg-gray-800 p-3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Date fin</label>
            <input
              type="date"
              value={filtreDateFin || ""}
              onChange={(e) => setFiltreDateFin(e.target.value || null)}
              className="w-full rounded bg-gray-800 p-3"
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={appliquerFiltres}
              className="rounded bg-blue-600 px-4 py-3 hover:bg-blue-700 flex-1"
            >
              Appliquer
            </button>
            <button
              onClick={reinitialiserFiltres}
              className="rounded bg-gray-600 px-4 py-3 hover:bg-gray-700 flex-1"
            >
              Réinitialiser
            </button>
          </div>
        </div>

        {/* Affichage du total filtré */}
        {totalFiltre > 0 && (
          <div className="mt-4 p-4 rounded-lg bg-gray-800">
            <p className="text-xl font-bold text-green-400">
              Total filtré: {formatMontant(totalFiltre)}
            </p>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-gray-400">Chargement des dépenses...</p>
          </div>
        ) : depenses.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">Aucune dépense enregistrée pour le moment.</p>
            <a href="/depenses/nouveau" className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 hover:bg-blue-700">
              Créer votre première dépense
            </a>
          </div>
        ) : (
          <div className="space-y-6">
            {depenses.map((depense) => (
              <div key={depense.id} className="border-b border-gray-800 pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-lg font-semibold">{formatMontant(depense.montant)}</p>
                    <p className="text-gray-400 text-sm">{formatDate(depense.date_depense)}</p>
                    {depense.categorie && (
                      <span className="inline-block mt-2 px-3 py-1 rounded-full bg-gray-800 text-xs">
                        {depense.categorie}
                      </span>
                    )}
                    {depense.description && (
                      <p className="mt-2 text-gray-300">{depense.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => supprimerDepense(depense.id)}
                      className="rounded bg-red-600 px-3 py-1 text-sm hover:bg-red-700"
                    >
                      Supprimer
                    </button>
                    <a
                      href={`/depenses/modifier/${depense.id}`}
                      className="rounded bg-blue-600 px-3 py-1 text-sm hover:bg-blue-700"
                    >
                      Modifier
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
