"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profil = {
  id: string;
  email: string | null;
  nom: string | null;
  role: string | null;
  created_at: string | null;
};

export default function UtilisateursPage() {
  const [profils, setProfils] = useState<Profil[]>([]);
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
        setError("Entreprise introuvable pour cet utilisateur.");
        return;
      }

      setEntrepriseId(profil.entreprise_id);
      await chargerProfils(profil.entreprise_id);
    } catch (err) {
      setError("Erreur lors de l'initialisation: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function chargerProfils(idEntreprise: string) {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("profils")
        .select("*")
        .eq("entreprise_id", idEntreprise)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setProfils(data || []);
    } catch (err) {
      setError("Erreur lors du chargement des utilisateurs: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function changerRole(id: string, role: string) {
    if (!entrepriseId) {
      setError("ID d'entreprise manquant pour la mise à jour.");
      return;
    }

    try {
      const { error } = await supabase
        .from("profils")
        .update({ role })
        .eq("id", id)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        throw error;
      }

      if (entrepriseId) {
        await chargerProfils(entrepriseId);
      }
    } catch (err) {
      setError("Erreur lors de la mise à jour: " + (err as Error).message);
    }
  }

  function formatDate(date: string | null) {
    if (!date) return "Non renseignée";
    return new Date(date).toLocaleDateString("fr-FR");
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Utilisateurs</h1>
      <a
  href="/utilisateurs/nouveau"
  className="mb-6 inline-block rounded bg-green-600 px-4 py-2"
>
  + Nouvel utilisateur
</a>

      <a
        href="/dashboard"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Dashboard
      </a>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        {profils.length === 0 ? (
          <p className="text-gray-400">Aucun utilisateur trouvé.</p>
        ) : (
          <div className="space-y-4">
            {profils.map((profil) => (
              <div
                key={profil.id}
                className="rounded-xl border border-gray-800 bg-gray-950 p-5"
              >
                <p className="text-2xl font-bold">
                  {profil.nom || "Nom non renseigné"}
                </p>

                <p className="text-gray-300">{profil.email}</p>

                <p className="mt-2">
                  Rôle actuel :{" "}
                  <span className="font-bold text-green-400">
                    {profil.role || "exploitant"}
                  </span>
                </p>

                <p className="text-sm text-gray-400">
                  Créé le : {formatDate(profil.created_at)}
                </p>

                <select
                  value={profil.role || "exploitant"}
                  onChange={(e) => changerRole(profil.id, e.target.value)}
                  className="mt-4 rounded bg-gray-800 p-3"
                >
                  <option value="admin">Admin</option>
                  <option value="exploitant">Exploitant</option>
                  <option value="chauffeur">Chauffeur</option>
                  <option value="client">Client</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}