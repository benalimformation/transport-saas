"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function NouveauChauffeur() {
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [statut, setStatut] = useState("Disponible");

  async function ajouterChauffeur() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      alert("Vous devez être connecté.");
      window.location.href = "/login";
      return;
    }

    const { data: profil, error: profilError } = await supabase
      .from("profils")
      .select("entreprise_id")
      .eq("id", userId)
      .single();

    if (profilError || !profil?.entreprise_id) {
      alert("Entreprise introuvable pour cet utilisateur.");
      return;
    }

    const { error } = await supabase.from("Chauffeurs").insert({
      nom,
      telephone,
      email,
      statut,
      entreprise_id: profil.entreprise_id,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/chauffeurs";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-4xl font-bold">Nouveau chauffeur</h1>

      <a
        href="/chauffeurs"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour aux chauffeurs
      </a>

      <div className="flex max-w-xl flex-col gap-4">
        <input
          className="rounded bg-gray-900 p-3"
          placeholder="Nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
        />

        <input
          className="rounded bg-gray-900 p-3"
          placeholder="Téléphone"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
        />

        <input
          className="rounded bg-gray-900 p-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <select
          className="rounded bg-gray-900 p-3"
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
        >
          <option>Disponible</option>
          <option>En mission</option>
          <option>Indisponible</option>
        </select>

        <button onClick={ajouterChauffeur} className="rounded bg-green-600 p-3">
          Ajouter le chauffeur
        </button>
      </div>
    </main>
  );
}