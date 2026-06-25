"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function NouveauCamionPage() {
  const [immatriculation, setImmatriculation] = useState("");
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [statut, setStatut] = useState("Disponible");

  async function ajouterCamion(e: React.FormEvent) {
    e.preventDefault();

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      alert("Utilisateur non connecté");
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

    window.location.href = "/camions";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">
        Nouveau camion
      </h1>

      <a
        href="/camions"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Camions
      </a>

      <form
        onSubmit={ajouterCamion}
        className="max-w-xl space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-6"
      >
        <input
          type="text"
          placeholder="Immatriculation"
          value={immatriculation}
          onChange={(e) => setImmatriculation(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="text"
          placeholder="Marque"
          value={marque}
          onChange={(e) => setMarque(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="text"
          placeholder="Modèle"
          value={modele}
          onChange={(e) => setModele(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
        >
          <option>Disponible</option>
          <option>En mission</option>
          <option>Maintenance</option>
        </select>

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