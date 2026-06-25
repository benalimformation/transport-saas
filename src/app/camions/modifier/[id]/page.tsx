"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function ModifierCamionPage() {
  const params = useParams();
  const id = params.id as string;

  const [immatriculation, setImmatriculation] = useState("");
  const [marque, setMarque] = useState("");
  const [modele, setModele] = useState("");
  const [statut, setStatut] = useState("Disponible");

  useEffect(() => {
    async function fetchCamion() {
      const { data, error } = await supabase
        .from("camions")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      setImmatriculation(data.immatriculation || "");
      setMarque(data.marque || "");
      setModele(data.modele || "");
      setStatut(data.statut || "Disponible");
    }

    if (id) {
      fetchCamion();
    }
  }, [id]);

  async function modifierCamion(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase
      .from("camions")
      .update({
        immatriculation,
        marque,
        modele,
        statut,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/camions";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Modifier camion</h1>

      <a
        href="/camions"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Camions
      </a>

      <form
        onSubmit={modifierCamion}
        className="max-w-xl space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-6"
      >
        <input
          type="text"
          value={immatriculation}
          onChange={(e) => setImmatriculation(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="text"
          value={marque}
          onChange={(e) => setMarque(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="text"
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

        <button type="submit" className="rounded bg-blue-600 px-6 py-3">
          Enregistrer les modifications
        </button>
      </form>
    </main>
  );
}