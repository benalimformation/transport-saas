"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { MODULE_PERMISSIONS, isAuthorized } from "../../lib/permissions";
type Client = {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
observation: string | null;
  
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
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
      if (!isAuthorized(profil.role, "clients")) {
        setError("Accès refusé. Vous n'avez pas les droits nécessaires pour consulter cette page.");
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 3000);
        return;
      }

      setEntrepriseId(profil.entreprise_id);

      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("entreprise_id", profil.entreprise_id)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setClients(data || []);
    } catch (err) {
      setError("Erreur lors du chargement des clients: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function supprimerClient(id: string) {
    const confirmation = confirm("Supprimer ce client ?");

    if (!confirmation) return;

    try {
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", id)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        throw error;
      }

      fetchClients();
    } catch (err) {
      setError("Erreur lors de la suppression: " + (err as Error).message);
    }
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Clients</h1>

      <a
        href="/dashboard"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Dashboard
      </a>

      <br />

      <a
        href="/clients/nouveau"
        className="mb-8 inline-block rounded bg-green-600 px-4 py-2"
      >
        + Nouveau client
      </a>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        {error ? (
          <div className="text-center py-12">
            <div className="mb-4 text-6xl">❌</div>
            <h3 className="text-xl font-bold mb-2 text-red-400">Erreur</h3>
            <p className="text-gray-400 mb-6">{error}</p>
          </div>
        ) : loading ? (
          <div className="text-center py-12">
            <div className="mb-4 text-6xl">⏳</div>
            <h3 className="text-xl font-bold mb-2">Chargement...</h3>
            <p className="text-gray-400 mb-6">Récupération des clients en cours.</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4 text-6xl">👥</div>
            <h3 className="text-xl font-bold mb-2">Aucun client enregistré</h3>
            <p className="text-gray-400 mb-6">Bénéficiez d'un meilleur suivi en créant votre premier client.</p>
            <a
              href="/clients/nouveau"
              className="inline-block rounded bg-green-600 px-6 py-3 hover:bg-green-700"
            >
              Créer un client
            </a>
          </div>
        ) : (
          clients.map((client) => (
            <div key={client.id} className="border-b border-gray-800 py-4">
              <p className="text-xl font-bold">{client.nom}</p>
              <p>{client.email}</p>
              <p>{client.telephone}</p>
              <p>{client.adresse}</p>
              {client.observation && (
  <p className="mt-2 rounded bg-gray-800 p-3 text-sm text-gray-300">
    Observation : {client.observation}
  </p>
)}

              <button
                onClick={() => supprimerClient(client.id)}
                className="mt-3 rounded bg-red-600 px-4 py-2"
              >
                Supprimer
              </button>

              <a
                href={`/clients/modifier/${client.id}`}
                className="ml-3 inline-block rounded bg-blue-600 px-4 py-2"
              >
                Modifier
              </a>
              <a
  href={`/clients/${client.id}`}
  className="ml-3 inline-block rounded bg-green-600 px-4 py-2"
>
  Voir
</a>
            </div>
          ))
        )}
      </div>
    </main>
  );
}