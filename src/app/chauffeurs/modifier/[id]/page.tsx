"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function ModifierChauffeurPage() {
  const params = useParams();
  const id = params.id as string;

  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [statut, setStatut] = useState("Disponible");

  async function chargerChauffeur() {
    const { data, error } = await supabase
      .from("Chauffeurs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    setNom(data.nom || "");
    setTelephone(data.telephone || "");
    setEmail(data.email || "");
    setStatut(data.statut || "Disponible");
  }

  async function modifierChauffeur() {
    const { error } = await supabase
      .from("Chauffeurs")
      .update({
        nom,
        telephone,
        email,
        statut,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/chauffeurs";
  }

  useEffect(() => {
    chargerChauffeur();
  }, []);

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Modifier un chauffeur</h1>
<a href="/chauffeurs" className="mb-6 inline-block rounded bg-gray-700 px-4 py-2">
  ← Retour aux chauffeurs
</a>
      <div className="flex max-w-xl flex-col gap-4">
        <input className="rounded bg-gray-900 p-3" value={nom} onChange={(e) => setNom(e.target.value)} />
        <input className="rounded bg-gray-900 p-3" value={telephone} onChange={(e) => setTelephone(e.target.value)} />
        <input className="rounded bg-gray-900 p-3" value={email} onChange={(e) => setEmail(e.target.value)} />

        <select className="rounded bg-gray-900 p-3" value={statut} onChange={(e) => setStatut(e.target.value)}>
          <option>Disponible</option>
          <option>En mission</option>
          <option>Indisponible</option>
        </select>

        <button onClick={modifierChauffeur} className="rounded bg-blue-600 p-3">
          Enregistrer les modifications
        </button>
      </div>
    </main>
  );
}