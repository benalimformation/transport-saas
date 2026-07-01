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
  const [filtreStatut, setFiltreStatut] = useState<string | null>(null);
  const [filtreDateDebut, setFiltreDateDebut] = useState<string | null>(null);
  const [filtreDateFin, setFiltreDateFin] = useState<string | null>(null);
  const [totalDevis, setTotalDevis] = useState<number>(0);
  const [totalMontant, setTotalMontant] = useState<number>(0);
  const [totalAcceptes, setTotalAcceptes] = useState<number>(0);
  const [totalRefuses, setTotalRefuses] = useState<number>(0);
  const [loading, setLoading] = useState(false);

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
      .select("entreprise_id, role")
      .eq("id", userId)
      .single();

    if (profilError || !profil) {
      alert("Profil utilisateur introuvable.");
      return;
    }

    if (profilError || !profil?.entreprise_id) {
      alert("Entreprise introuvable pour cet utilisateur.");
      return;
    }

    // Vérifier que l'utilisateur a les droits nécessaires
    const authorizedRoles = ["super_admin", "admin", "exploitant"];
    if (!authorizedRoles.includes(profil.role)) {
      alert("Accès refusé. Vous n'avez pas les droits nécessaires pour consulter cette page.");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 3000);
      return;
    }

    setEntrepriseId(profil.entreprise_id);
    chargerDevis(profil.entreprise_id);
  }

  async function chargerDevis(idEntreprise: string) {
    setLoading(true);

    try {
      let query = supabase
        .from("devis")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .order("created_at", { ascending: false });

      // Appliquer les filtres si définis
      if (filtreStatut) {
        query = query.eq("statut", filtreStatut);
      }
      if (filtreDateDebut) {
        query = query.gte("date_transport", filtreDateDebut);
      }
      if (filtreDateFin) {
        query = query.lte("date_transport", filtreDateFin);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setDevis(data || []);

      // Calculer les indicateurs
      const total = data?.length || 0;
      const montantTotal = data?.reduce((sum, devis) => sum + (devis.prix_ttc || devis.prix || 0), 0) || 0;
      const acceptes = data?.filter(d => d.statut === "Accepté").length || 0;
      const refuses = data?.filter(d => d.statut === "Refusé").length || 0;

      setTotalDevis(total);
      setTotalMontant(montantTotal);
      setTotalAcceptes(acceptes);
      setTotalRefuses(refuses);
    } catch (err) {
      alert("Erreur lors du chargement des devis: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function appliquerFiltres() {
    if (entrepriseId) {
      chargerDevis(entrepriseId);
    }
  }

  function reinitialiserFiltres() {
    setFiltreStatut(null);
    setFiltreDateDebut(null);
    setFiltreDateFin(null);
    setTotalDevis(0);
    setTotalMontant(0);
    setTotalAcceptes(0);
    setTotalRefuses(0);
    if (entrepriseId) {
      chargerDevis(entrepriseId);
    }
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

      {/* Section des filtres */}
      <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Statut</label>
            <select
              value={filtreStatut || ""}
              onChange={(e) => setFiltreStatut(e.target.value || null)}
              className="w-full rounded bg-gray-800 p-3"
            >
              <option value="">Tous les statuts</option>
              <option value="Brouillon">Brouillon</option>
              <option value="Envoyé">Envoyé</option>
              <option value="Accepté">Accepté</option>
              <option value="Refusé">Refusé</option>
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

        {/* Tableau de bord */}
        {devis.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-lg bg-gray-800 p-4 text-center">
              <p className="text-sm text-gray-400">Total devis</p>
              <p className="text-2xl font-bold text-white">{totalDevis}</p>
            </div>
            <div className="rounded-lg bg-blue-900 p-4 text-center">
              <p className="text-sm text-blue-300">Montant total</p>
              <p className="text-xl font-bold text-blue-400">{formatPrix(totalMontant)}</p>
            </div>
            <div className="rounded-lg bg-green-900 p-4 text-center">
              <p className="text-sm text-green-300">Acceptés</p>
              <p className="text-2xl font-bold text-green-400">{totalAcceptes}</p>
            </div>
            <div className="rounded-lg bg-red-900 p-4 text-center">
              <p className="text-sm text-red-300">Refusés</p>
              <p className="text-2xl font-bold text-red-400">{totalRefuses}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-2 text-gray-400">Chargement des devis...</p>
          </div>
        ) : (
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
        )}
      </div>
    </main>
  );
}
