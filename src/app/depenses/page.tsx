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

export default function DepensesPage() {
  const [depenses, setDepenses] = useState<Depense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

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
      const { data, error } = await supabase
        .from("depenses")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .order("date_depense", { ascending: false });

      if (error) {
        throw error;
      }

      setDepenses(data || []);
    } catch (err) {
      setError("Erreur lors du chargement des dépenses: " + (err as Error).message);
    } finally {
      setLoading(false);
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
      alert("Erreur lors de la suppression: " + (err as Error).message);
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
                      href={`/depenses/nouveau?id=${depense.id}`}
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
