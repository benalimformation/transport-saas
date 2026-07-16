"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Livraison = {
  id: string;
  client: string;
  prix_ht: number;
  tva: number;
  prix_ttc: number;
  entreprise_id: string;
};

export default function NouvelleFacturePage() {
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [livraisonId, setLivraisonId] = useState("");
  const [loading, setLoading] = useState(false);
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
      await chargerLivraisons(profil.entreprise_id);
    } catch (err) {
      setError("Erreur lors de l'initialisation: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function chargerLivraisons(idEntreprise: string) {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("livraisons")
        .select("id, client, prix_ht, tva, prix_ttc, entreprise_id")
        .eq("entreprise_id", idEntreprise)
        .eq("statut", "Livrée")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setLivraisons(data || []);
    } catch (err) {
      setError("Erreur lors du chargement des livraisons: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function creerFacture(e: React.FormEvent) {
    e.preventDefault();

    const livraison = livraisons.find(
      (item) => item.id === livraisonId
    );

    if (!livraison) {
      alert("Choisissez une livraison");
      return;
    }

    setLoading(true);
console.log("Livraison sélectionnée :", livraison);
    const numero = `FAC-${Date.now()}`;

    const { error } = await supabase
      .from("factures")
      .insert([
 {
  numero,
  entreprise_id: livraison.entreprise_id,
  livraison_id: livraison.id,
  client: livraison.client,
  montant_ht: livraison.prix_ht,
  tva: livraison.tva,
  montant_ttc: livraison.prix_ttc,
  statut: "Non payée",
  date_facture: new Date().toISOString().split("T")[0],
}
      ]);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">
        Nouvelle facture
      </h1>

      <a
        href="/factures"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Factures
      </a>

      <form
        onSubmit={creerFacture}
        className="max-w-xl space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-6"
      >
        <select
          value={livraisonId}
          onChange={(e) => setLivraisonId(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        >
          <option value="">
            Choisir une livraison
          </option>

          {livraisons.map((livraison) => (
            <option
              key={livraison.id}
              value={livraison.id}
            >
              {livraison.client} - {livraison.prix_ttc} €
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-green-600 px-6 py-3"
        >
          {loading
            ? "Création..."
            : "Créer la facture"}
        </button>
      </form>
    </main>
  );
}