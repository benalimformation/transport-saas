"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Chauffeur = {
  id: string;
  nom: string;
};

type Livraison = {
  id: string;
  client: string;
  adresse_depart: string;
  adresse_arrivee: string;
  chauffeur_id: string;
  date_livraison: string | null;
  heure_limite: string | null;
  statut: string;
};

export default function PlanningPage() {
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);

  useEffect(() => {
    chargerPlanning();
  }, []);

  async function chargerPlanning() {
    const { data: chauffeursData, error: chauffeursError } = await supabase
      .from("Chauffeurs")
      .select("id, nom")
      .order("nom", { ascending: true });

    const { data: livraisonsData, error: livraisonsError } = await supabase
      .from("livraisons")
      .select("*")
      .order("date_livraison", { ascending: true })
      .order("heure_limite", { ascending: true });

    if (chauffeursError) {
      alert(chauffeursError.message);
      return;
    }

    if (livraisonsError) {
      alert(livraisonsError.message);
      return;
    }

    setChauffeurs(chauffeursData || []);
    setLivraisons(livraisonsData || []);
  }

  function formatDate(date: string | null) {
    if (!date) return "Date non renseignée";
    return new Date(date).toLocaleDateString("fr-FR");
  }

  function formatHeure(heure: string | null) {
    if (!heure) return "Heure non renseignée";
    return heure.slice(0, 5);
  }

  function couleurStatut(statut: string) {
    if (statut === "Livrée") return "bg-blue-600";
    if (statut === "En cours") return "bg-green-600";
    if (statut === "Prévue") return "bg-yellow-600";
    if (statut === "Annulée") return "bg-gray-600";
    return "bg-slate-600";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Planning Chauffeurs</h1>

      <a
        href="/dashboard"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Dashboard
      </a>

      <div className="grid grid-cols-1 gap-6">
        {chauffeurs.length === 0 ? (
          <p className="text-gray-400">Aucun chauffeur trouvé.</p>
        ) : (
          chauffeurs.map((chauffeur) => {
            const livraisonsChauffeur = livraisons.filter(
              (livraison) => livraison.chauffeur_id === chauffeur.id
            );

            return (
              <section
                key={chauffeur.id}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
              >
                <h2 className="mb-4 text-3xl font-bold">
                  👨‍✈️ {chauffeur.nom}
                </h2>

                {livraisonsChauffeur.length === 0 ? (
                  <p className="text-gray-400">
                    Aucune livraison assignée.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {livraisonsChauffeur.map((livraison) => (
                      <div
                        key={livraison.id}
                        className="rounded-xl border border-gray-800 bg-gray-950 p-5"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xl font-bold">
                            {livraison.client}
                          </p>

                          <span
                            className={`rounded-full px-3 py-1 text-sm font-bold ${couleurStatut(
                              livraison.statut
                            )}`}
                          >
                            {livraison.statut}
                          </span>
                        </div>

                        <p>
                          📍 {livraison.adresse_depart} →{" "}
                          {livraison.adresse_arrivee}
                        </p>

                        <p>📅 {formatDate(livraison.date_livraison)}</p>
                        <p>🕒 Heure limite : {formatHeure(livraison.heure_limite)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </main>
  );
}