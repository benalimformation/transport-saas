"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
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

  useEffect(() => {
    fetchClients();
  }, []);

  async function fetchClients() {
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
    alert("Entreprise introuvable");
    return;
  }

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("entreprise_id", profil.entreprise_id)
    .order("created_at", { ascending: false });

  if (error) {
    alert(error.message);
    return;
  }

  setClients(data || []);
}

  async function supprimerClient(id: string) {
    const confirmation = confirm("Supprimer ce client ?");

    if (!confirmation) return;

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    fetchClients();
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
        {clients.length === 0 ? (
          <p className="text-gray-400">Aucun client pour le moment.</p>
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