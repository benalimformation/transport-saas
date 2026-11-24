"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

export default function NouveauCamionPage() {
  const [immatriculation, setImmatriculation] = useState("");
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [statut, setStatut] = useState("Disponible");
  const [isOnboarding, setIsOnboarding] = useState(false);

  useEffect(() => {
    setIsOnboarding(
      new URLSearchParams(window.location.search).get("onboarding") === "1"
    );
  }, []);

  async function ajouterCamion(e: React.FormEvent) {
    e.preventDefault();

    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    const userId = user?.id;

    if (userError || !userId) {
      alert(
        "Erreur d'authentification: " +
          (userError?.message || "Utilisateur non connecté")
      );
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

    const { error } = await supabase.from("camions").insert([
      {
        immatriculation,
        marque,
        modele,
        statut,
        entreprise_id: profil.entreprise_id,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = isOnboarding
      ? "/dashboard"
      : "/camions";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">
        {isOnboarding
          ? "Ajoutez votre premier véhicule"
          : "Nouveau camion"}
      </h1>

      {!isOnboarding && (
        <a
          href="/camions"
          className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
        >
          ← Retour Camions
        </a>
      )}

      <form
        onSubmit={ajouterCamion}
        className="max-w-xl space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-6"
      >
        <div>
          <label
            htmlFor="immatriculation"
            className="mb-2 block text-sm font-medium"
          >
            Immatriculation
          </label>
          <input
            id="immatriculation"
            type="text"
            placeholder="Ex. AA-123-BB"
            value={immatriculation}
            onChange={(e) => setImmatriculation(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
            required
          />
        </div>

        <div>
          <label
            htmlFor="marque"
            className="mb-2 block text-sm font-medium"
          >
            Marque
          </label>
          <input
            id="marque"
            type="text"
            placeholder="Ex. Renault"
            value={marque}
            onChange={(e) => setMarque(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
            required
          />
        </div>

        <div>
          <label
            htmlFor="modele"
            className="mb-2 block text-sm font-medium"
          >
            Modèle
          </label>
          <input
            id="modele"
            type="text"
            placeholder="Ex. Master"
            value={modele}
            onChange={(e) => setModele(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
            required
          />
        </div>

        <div>
          <label
            htmlFor="statut"
            className="mb-2 block text-sm font-medium"
          >
            Statut
          </label>
          <select
            id="statut"
            value={statut}
            onChange={(e) => setStatut(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
          >
            <option>Disponible</option>
            <option>En mission</option>
            <option>Maintenance</option>
          </select>
        </div>

        <button
          type="submit"
          className="rounded bg-green-600 px-6 py-3"
        >
          Enregistrer
        </button>
      </form>
    </main>
  );
}