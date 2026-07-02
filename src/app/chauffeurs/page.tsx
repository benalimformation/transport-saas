"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { MODULE_PERMISSIONS, isAuthorized } from "../../lib/permissions";

type Chauffeur = {
  id: string;
  nom: string;
  telephone: string;
  email: string;
  statut: string;
  entreprise_id: string | null;
};

export default function ChauffeursPage() {
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
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
    if (!isAuthorized(profil.role, "chauffeurs")) {
      alert("Accès refusé. Vous n'avez pas les droits nécessaires pour consulter cette page.");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 3000);
      return;
    }

    setEntrepriseId(profil.entreprise_id);
    fetchChauffeurs(profil.entreprise_id);
  }

  async function fetchChauffeurs(idEntreprise: string) {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("Chauffeurs")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .order("nom", { ascending: true });

      if (error) {
        throw error;
      }

      setChauffeurs(data || []);
    } catch (err) {
      setError("Erreur lors du chargement des chauffeurs: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function supprimerChauffeur(id: string) {
    if (!confirm("Supprimer ce chauffeur ?")) return;

    try {
      const { error } = await supabase
        .from("Chauffeurs")
        .delete()
        .eq("id", id)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        throw error;
      }

      if (entrepriseId) {
        fetchChauffeurs(entrepriseId);
      }
    } catch (err) {
      setError("Erreur lors de la suppression: " + (err as Error).message);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Chauffeurs</h1>

      <a
        href="/dashboard"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Dashboard
      </a>

      <br />

      <a
        href="/chauffeurs/nouveau"
        className="mb-8 inline-block rounded bg-green-600 px-4 py-2"
      >
        + Nouveau chauffeur
      </a>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        {chauffeurs.length === 0 ? (
          <p className="text-gray-400">Aucun chauffeur pour cette entreprise.</p>
        ) : (
          chauffeurs.map((chauffeur) => (
            <div key={chauffeur.id} className="border-b border-gray-800 py-4">
              <p className="text-xl font-bold">{chauffeur.nom}</p>
              <p>{chauffeur.telephone}</p>
              <p>{chauffeur.email}</p>

              <button
                onClick={() => supprimerChauffeur(chauffeur.id)}
                className="mt-3 rounded bg-red-600 px-4 py-2"
              >
                Supprimer
              </button>

              <a
                href={`/chauffeurs/modifier/${chauffeur.id}`}
                className="ml-3 inline-block rounded bg-blue-600 px-4 py-2"
              >
                Modifier
              </a>

              <p className="mt-3 text-green-400">{chauffeur.statut}</p>
            </div>
          ))
        )}
      </div>
    </main>
  );
}