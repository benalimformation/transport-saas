"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Client = {
  id: string;
  nom: string;
  email: string;
  telephone: string;
  adresse: string;
  observation: string | null;
};

type Devis = {
  id: string;
  depart: string;
  arrivee: string;
  prix_ttc: number | null;
  statut: string | null;
};

type Livraison = {
  id: string;
  adresse_depart: string;
  adresse_arrivee: string;
  statut: string;
  date_livraison: string | null;
};

export default function FicheClientPage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState<Client | null>(null);
  const [devis, setDevis] = useState<Devis[]>([]);
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);

  useEffect(() => {
    if (id) chargerClient();
  }, [id]);

  async function chargerClient() {
    const { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("id", id)
      .single();

    const { data: devisData } = await supabase
      .from("devis")
      .select("id, depart, arrivee, prix_ttc, statut")
      .eq("client_id", id);

    const { data: livraisonsData } = await supabase
      .from("livraisons")
      .select("id, adresse_depart, adresse_arrivee, statut, date_livraison")
      .eq("client_id", id);

    setClient(clientData || null);
    setDevis(devisData || []);
    setLivraisons(livraisonsData || []);
  }

  const chiffreAffaires = devis.reduce(
    (total, item) => total + Number(item.prix_ttc || 0),
    0
  );

  if (!client) {
    return (
      <main className="min-h-screen bg-gray-950 p-10 text-white">
        Chargement...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <a
        href="/clients"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Clients
      </a>

      <h1 className="mb-4 text-5xl font-bold">{client.nom}</h1>

      <div className="mb-8 rounded-xl border border-gray-800 bg-gray-900 p-6">
        <p>Email : {client.email || "Non renseigné"}</p>
        <p>Téléphone : {client.telephone || "Non renseigné"}</p>
        <p>Adresse : {client.adresse || "Non renseignée"}</p>

        {client.observation && (
          <p className="mt-4 rounded bg-gray-800 p-4 text-gray-300">
            Observation : {client.observation}
          </p>
        )}
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-slate-900 p-6">
          <p className="text-gray-400">Devis</p>
          <p className="text-4xl font-bold">{devis.length}</p>
        </div>

        <div className="rounded-xl bg-slate-900 p-6">
          <p className="text-gray-400">Livraisons</p>
          <p className="text-4xl font-bold">{livraisons.length}</p>
        </div>

        <div className="rounded-xl bg-green-900 p-6">
          <p className="text-green-200">CA devis</p>
          <p className="text-4xl font-bold">{chiffreAffaires.toFixed(2)} €</p>
        </div>
      </div>

      <section className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        <h2 className="mb-4 text-3xl font-bold">Dernières livraisons</h2>

        {livraisons.length === 0 ? (
          <p className="text-gray-400">Aucune livraison pour ce client.</p>
        ) : (
          <div className="space-y-4">
            {livraisons.map((livraison) => (
              <div
                key={livraison.id}
                className="rounded-lg border border-gray-800 bg-gray-950 p-4"
              >
                <p>
                  {livraison.adresse_depart} → {livraison.adresse_arrivee}
                </p>
                <p>Date : {livraison.date_livraison || "Non renseignée"}</p>
                <p className="text-green-400">Statut : {livraison.statut}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}