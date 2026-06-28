"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Devis = {
  id: string;
  client: string;
  depart: string;
  arrivee: string;
  poids: number | null;
  palettes: number | null;
  date_transport: string | null;
  prix: number | null;
  prix_ht: number | null;
  tva: number | null;
  prix_ttc: number | null;
  statut: string | null;
  entreprise_id: string | null;
};

export default function DevisPage() {
  const [devis, setDevis] = useState<Devis[]>([]);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  useEffect(() => {
    initialiserPage();
  }, []);

  async function initialiserPage() {
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

    setEntrepriseId(profil.entreprise_id);
    chargerDevis(profil.entreprise_id);
  }

  async function chargerDevis(idEntreprise: string) {
    const { data, error } = await supabase
      .from("devis")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("created_at", { ascending: false });

    if (error) {
      alert(error.message);
      return;
    }

    setDevis(data || []);
  }

  async function supprimerDevis(id: string) {
    if (!confirm("Supprimer ce devis ?")) return;

    try {
      const { error } = await supabase
        .from("devis")
        .delete()
        .eq("id", id)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        throw error;
      }

      if (entrepriseId) {
        chargerDevis(entrepriseId);
      }
    } catch (err) {
      alert("Erreur lors de la suppression: " + (err as Error).message);
    }
  }

  async function creerLivraison(item: Devis) {
    if (!entrepriseId) {
      alert("Entreprise introuvable.");
      return;
    }

    const { data, error } = await supabase
      .from("livraisons")
      .insert([
        {
          client: item.client,
          adresse_depart: item.depart,
          adresse_arrivee: item.arrivee,
          date_livraison: item.date_transport,
          statut: "Prévue",
          entreprise_id: item.entreprise_id || entrepriseId,
          prix_ht: item.prix_ht || 0,
          tva: item.tva || 0,
          prix_ttc: item.prix_ttc || item.prix || 0,
        },
      ])
      .select()
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = `/livraisons/modifier/${data.id}`;
  }

  function formatDate(date: string | null) {
    if (!date) return "Non renseignée";
    return new Date(date).toLocaleDateString("fr-FR");
  }

  function formatPrix(prix: number | null) {
    if (prix === null || prix === undefined) return "Non renseigné";
    return `${prix.toFixed(2)} €`;
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Devis</h1>

      <a
        href="/dashboard"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Dashboard
      </a>

      <br />

      <a
        href="/devis/nouveau"
        className="mb-8 inline-block rounded bg-green-600 px-4 py-2"
      >
        + Nouveau devis
      </a>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        {devis.length === 0 ? (
          <p className="text-gray-400">Aucun devis pour cette entreprise.</p>
        ) : (
          devis.map((item) => (
            <div key={item.id} className="border-b border-gray-800 py-5">
              <div className="mb-3 flex items-center gap-3">
                <p className="text-2xl font-bold">{item.client}</p>

                <span className="rounded-full bg-slate-700 px-3 py-1 text-sm font-bold">
                  {item.statut || "Brouillon"}
                </span>
              </div>

              <p>
                Trajet : {item.depart} → {item.arrivee}
              </p>

              <p>Date transport : {formatDate(item.date_transport)}</p>
              <p>Poids : {item.poids || 0} tonnes</p>
              <p>Palettes : {item.palettes || 0}</p>

              <p>Prix HT : {formatPrix(item.prix_ht)}</p>
              <p>TVA : {formatPrix(item.tva)}</p>

              <p className="mt-2 text-xl font-bold text-green-400">
                Prix TTC : {formatPrix(item.prix_ttc || item.prix)}
              </p>

              <button
                onClick={() => supprimerDevis(item.id)}
                className="mt-3 rounded bg-red-600 px-4 py-2"
              >
                Supprimer
              </button>

              <a
                href={`/devis/modifier/${item.id}`}
                className="ml-3 inline-block rounded bg-blue-600 px-4 py-2"
              >
                Modifier
              </a>

              <button
                onClick={() => creerLivraison(item)}
                className="ml-3 rounded bg-green-600 px-4 py-2"
              >
                Créer livraison
              </button>

              <a
                href={`/api/devis/pdf/${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-3 inline-block rounded bg-purple-600 px-4 py-2"
              >
                PDF
              </a>
            </div>
          ))
        )}
      </div>
    </main>
  );
}