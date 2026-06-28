"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

function NouveauDepenseContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const depenseId = searchParams.get('id');

  const [montant, setMontant] = useState("");
  const [dateDepense, setDateDepense] = useState("");
  const [categorie, setCategorie] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [modeEdition, setModeEdition] = useState(false);

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

      // Si on est en mode édition (id présent dans l'URL)
      if (depenseId) {
        setModeEdition(true);
        await chargerDepense(depenseId, profil.entreprise_id);
      }
    } catch (err) {
      setError("Erreur lors de l'initialisation: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function chargerDepense(id: string, idEntreprise: string) {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("depenses")
        .select("*")
        .eq("id", id)
        .eq("entreprise_id", idEntreprise)
        .single();

      if (error) {
        throw error;
      }

      if (data) {
        setMontant(data.montant.toString());
        setDateDepense(data.date_depense.split('T')[0]); // Format YYYY-MM-DD
        setCategorie(data.categorie || "");
        setDescription(data.description || "");
      }
    } catch (err) {
      setError("Erreur lors du chargement de la dépense: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function soumettreFormulaire(e: React.FormEvent) {
    e.preventDefault();

    if (!entrepriseId) {
      setError("Entreprise non identifiée.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const montantNumerique = parseFloat(montant);
      if (isNaN(montantNumerique) || montantNumerique <= 0) {
        setError("Le montant doit être un nombre positif.");
        return;
      }

      const depenseData = {
        montant: montantNumerique,
        date_depense: dateDepense,
        categorie: categorie || null,
        description: description || null,
        entreprise_id: entrepriseId,
      };

      let error;
      if (modeEdition && depenseId) {
        // Mise à jour de la dépense existante
        const { error: updateError } = await supabase
          .from("depenses")
          .update(depenseData)
          .eq("id", depenseId)
          .eq("entreprise_id", entrepriseId);

        error = updateError;
      } else {
        // Création d'une nouvelle dépense
        const { error: insertError } = await supabase
          .from("depenses")
          .insert([depenseData]);

        error = insertError;
      }

      if (error) {
        throw error;
      }

      router.push("/depenses");
    } catch (err) {
      setError("Erreur lors de l'enregistrement: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-5xl font-bold">
          {modeEdition ? "Modifier Dépense" : "Nouvelle Dépense"}
        </h1>
        <div className="flex gap-4">
          <a href="/depenses" className="rounded bg-gray-700 px-4 py-2 hover:bg-gray-600">
            ← Retour Dépenses
          </a>
          <a href="/dashboard" className="rounded bg-gray-700 px-4 py-2 hover:bg-gray-600">
            Retour Dashboard
          </a>
        </div>
      </div>

      <form
        onSubmit={soumettreFormulaire}
        className="max-w-3xl rounded-xl border border-gray-800 bg-gray-900 p-8"
      >
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Montant (€)</label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            placeholder="0.00"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="w-full rounded bg-gray-800 p-4"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Date</label>
          <input
            type="date"
            value={dateDepense}
            onChange={(e) => setDateDepense(e.target.value)}
            className="w-full rounded bg-gray-800 p-4"
            required
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Catégorie</label>
          <input
            type="text"
            placeholder="Ex: Carburant, Entretien, Péage"
            value={categorie}
            onChange={(e) => setCategorie(e.target.value)}
            className="w-full rounded bg-gray-800 p-4"
          />
        </div>

        <div className="mb-8">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            placeholder="Détails de la dépense"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded bg-gray-800 p-4"
            rows={4}
          />
        </div>

        {loading ? (
          <button
            type="button"
            disabled
            className="flex items-center justify-center w-full rounded bg-blue-600 px-6 py-3 hover:bg-blue-700"
          >
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
            Enregistrement...
          </button>
        ) : (
          <button
            type="submit"
            className="w-full rounded bg-green-600 px-6 py-3 hover:bg-green-700"
          >
            {modeEdition ? "Mettre à jour la dépense" : "Créer la dépense"}
          </button>
        )}
      </form>
    </main>
  );
}

export default function NouveauDepensePage() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <NouveauDepenseContent />
    </Suspense>
  );
}
