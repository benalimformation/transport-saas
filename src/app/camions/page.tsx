"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Camion = {
  id: string;
  immatriculation: string;
  marque: string | null;
  modele: string | null;
  statut: string | null;
  entreprise_id: string | null;
};

export default function CamionsPage() {
  const [camions, setCamions] = useState<Camion[]>([]);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    const authorizedRoles = ["super_admin", "admin", "exploitant", "chauffeur"];
    if (!authorizedRoles.includes(profil.role)) {
      alert("Accès refusé. Vous n'avez pas les droits nécessaires pour consulter cette page.");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 3000);
      return;
    }

    setEntrepriseId(profil.entreprise_id);
    fetchCamions(profil.entreprise_id);
  }

  async function fetchCamions(idEntreprise: string) {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("camions")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setCamions(data || []);
    } catch (err) {
      setError("Erreur lors du chargement des camions: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function supprimerCamion(id: string) {
    if (!confirm("Supprimer ce camion ?")) return;

    try {
      const { error } = await supabase
        .from("camions")
        .delete()
        .eq("id", id)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        throw error;
      }

      if (entrepriseId) fetchCamions(entrepriseId);
    } catch (err) {
      setError("Erreur lors de la suppression: " + (err as Error).message);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Camions</h1>

      <a
        href="/dashboard"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Dashboard
      </a>

      <br />

      <a
        href="/camions/nouveau"
        className="mb-8 inline-block rounded bg-green-600 px-4 py-2"
      >
        + Nouveau camion
      </a>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        {camions.length === 0 ? (
          <p className="text-gray-400">Aucun camion pour cette entreprise.</p>
        ) : (
          camions.map((camion) => (
            <div key={camion.id} className="border-b border-gray-800 py-4">
              <p className="text-xl font-bold">{camion.immatriculation}</p>
              <p>{camion.marque || "Marque non renseignée"}</p>
              <p>{camion.modele || "Modèle non renseigné"}</p>

              <button
                onClick={() => supprimerCamion(camion.id)}
                className="mt-3 rounded bg-red-600 px-4 py-2"
              >
                Supprimer
              </button>

              <a
                href={`/camions/modifier/${camion.id}`}
                className="ml-3 inline-block rounded bg-blue-600 px-4 py-2"
              >
                Modifier
              </a>

              <p className="mt-3 text-green-400">
                {camion.statut || "Statut non renseigné"}
              </p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}