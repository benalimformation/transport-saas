"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Facture = {
  id: string;
  numero: string | null;
  client: string | null;
  montant_ttc: number | null;
  statut: string | null;
  date_facture: string | null;
  date_echeance: string | null;
  date_paiement: string | null;
  entreprise_id: string | null;
};

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [filtreStatut, setFiltreStatut] = useState<string | null>(null);
  const [filtreDateDebut, setFiltreDateDebut] = useState<string | null>(null);
  const [filtreDateFin, setFiltreDateFin] = useState<string | null>(null);
  const [totalFactures, setTotalFactures] = useState<number>(0);
  const [totalPayees, setTotalPayees] = useState<number>(0);
  const [totalNonPayees, setTotalNonPayees] = useState<number>(0);

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

      // Récupérer l'entreprise_id et le rôle depuis profils
      const { data: profil, error: profilError } = await supabase
        .from("profils")
        .select("entreprise_id, role")
        .eq("id", userId)
        .single();

      if (profilError || !profil) {
        setError("Profil utilisateur introuvable.");
        return;
      }

      if (profilError || !profil?.entreprise_id) {
        setError("Entreprise introuvable pour cet utilisateur.");
        return;
      }

      // Vérifier que l'utilisateur a les droits nécessaires
      const authorizedRoles = ["super_admin", "admin", "exploitant"];
      if (!authorizedRoles.includes(profil.role)) {
        setError("Accès refusé. Vous n'avez pas les droits nécessaires pour consulter cette page.");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 3000);
        return;
      }

      setEntrepriseId(profil.entreprise_id);
      await chargerFactures(profil.entreprise_id);
    } catch (err) {
      setError("Erreur lors de l'initialisation: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function chargerFactures(idEntreprise: string) {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("factures")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .order("date_facture", { ascending: false });

      // Appliquer les filtres si définis
      if (filtreStatut) {
        query = query.eq("statut", filtreStatut);
      }
      if (filtreDateDebut) {
        query = query.gte("date_facture", filtreDateDebut);
      }
      if (filtreDateFin) {
        query = query.lte("date_facture", filtreDateFin);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setFactures(data || []);

      // Calculer les totaux
      const total = data?.reduce((sum, facture) => sum + (facture.montant_ttc || 0), 0) || 0;
      const totalPaye = data?.filter(f => f.statut === "Payée")
        .reduce((sum, facture) => sum + (facture.montant_ttc || 0), 0) || 0;
      const totalNonPaye = total - totalPaye;

      setTotalFactures(total);
      setTotalPayees(totalPaye);
      setTotalNonPayees(totalNonPaye);
    } catch (err) {
      setError("Erreur lors du chargement des factures: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function appliquerFiltres() {
    if (entrepriseId) {
      chargerFactures(entrepriseId);
    }
  }

  function reinitialiserFiltres() {
    setFiltreStatut(null);
    setFiltreDateDebut(null);
    setFiltreDateFin(null);
    setTotalFactures(0);
    setTotalPayees(0);
    setTotalNonPayees(0);
    if (entrepriseId) {
      chargerFactures(entrepriseId);
    }
  }

  async function supprimerFacture(id: string) {
    if (!confirm("Supprimer cette facture ?")) return;

    try {
      const { error } = await supabase
        .from("factures")
        .delete()
        .eq("id", id)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        throw error;
      }

      if (entrepriseId) {
        await chargerFactures(entrepriseId);
      }
    } catch (err) {
      setError("Erreur lors de la suppression: " + (err as Error).message);
    }
  }

  async function marquerPayee(id: string) {
    try {
      const { error } = await supabase
        .from("factures")
        .update({
          statut: "Payée",
          date_paiement: new Date().toISOString().slice(0, 10),
        })
        .eq("id", id)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        throw error;
      }

      if (entrepriseId) {
        await chargerFactures(entrepriseId);
      }
    } catch (err) {
      setError("Erreur lors de la mise à jour: " + (err as Error).message);
    }
  }

  function formatDate(date: string | null) {
    if (!date) return "Non renseignée";
    return new Date(date).toLocaleDateString("fr-FR");
  }

  function formatPrix(montant: number | null) {
    if (montant === null || montant === undefined) return "0.00 €";
    return `${montant.toFixed(2)} €`;
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Factures</h1>

      <a
        href="/dashboard"
        className="mb-4 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Dashboard
      </a>

      <br />

      <a
        href="/factures/nouveau"
        className="mb-8 inline-block rounded bg-green-600 px-4 py-2"
      >
        + Nouvelle facture
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
              <option value="Payée">Payée</option>
              <option value="Non payée">Non payée</option>
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

        {/* Affichage des totaux */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg bg-gray-800 p-4 text-center">
            <p className="text-sm text-gray-400">Total factures</p>
            <p className="text-xl font-bold text-white">{formatPrix(totalFactures)}</p>
          </div>
          <div className="rounded-lg bg-green-900 p-4 text-center">
            <p className="text-sm text-green-300">Payées</p>
            <p className="text-xl font-bold text-green-400">{formatPrix(totalPayees)}</p>
          </div>
          <div className="rounded-lg bg-red-900 p-4 text-center">
            <p className="text-sm text-red-300">Non payées</p>
            <p className="text-xl font-bold text-red-400">{formatPrix(totalNonPayees)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {factures.length === 0 ? (
          <p className="text-gray-400">Aucune facture pour le moment.</p>
        ) : (
          factures.map((facture) => (
            <div
              key={facture.id}
              className="rounded-xl border border-gray-800 bg-gray-900 p-5"
            >
              <h2 className="text-2xl font-bold">
                {facture.numero || "Sans numéro"}
              </h2>

              <p>Client : {facture.client || "Non renseigné"}</p>
              <p>Montant TTC : {formatPrix(facture.montant_ttc)}</p>
              <p>Date facture : {formatDate(facture.date_facture)}</p>
              <p>Échéance : {formatDate(facture.date_echeance)}</p>

              <p
                className={
                  facture.statut === "Payée"
                    ? "mt-2 font-bold text-green-400"
                    : "mt-2 font-bold text-orange-400"
                }
              >
                Statut : {facture.statut || "Non payée"}
              </p>

              {facture.date_paiement && (
                <p className="text-sm text-gray-400">
                  Payée le : {formatDate(facture.date_paiement)}
                </p>
              )}

              <div className="mt-4 flex gap-3">
                {facture.statut !== "Payée" && (
                  <button
                    onClick={() => marquerPayee(facture.id)}
                    className="rounded bg-green-600 px-4 py-2"
                  >
                    Marquer payée
                  </button>
                )}

                <button
                  onClick={() => supprimerFacture(facture.id)}
                  className="rounded bg-red-600 px-4 py-2"
                >
                  Supprimer
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </main>
  );
}