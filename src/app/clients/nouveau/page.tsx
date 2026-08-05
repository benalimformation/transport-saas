"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";

export default function NouveauClientPage() {
  const router = useRouter();

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [observation, setObservation] = useState("");

  async function creerClient(e: React.FormEvent) {
    e.preventDefault();

  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  const userId = user?.id;

  if (userError || !userId) {
    alert("Erreur d'authentification: " + (userError?.message || "Utilisateur non connecté"));
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

    const { error } = await supabase.from("clients").insert([
      {
        nom,
        email,
        telephone,
        adresse,
        observation,
        entreprise_id: profil.entreprise_id,
      },
    ]);

    if (error) {
      alert(error.message);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Nouveau client</h1>

      <a href="/clients" className="mb-6 inline-block rounded bg-gray-700 px-4 py-2">
        ← Retour Clients
      </a>

      <form
        onSubmit={creerClient}
        className="max-w-3xl rounded-xl border border-gray-800 bg-gray-900 p-8"
      >
        <input
          type="text"
          placeholder="Nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="mb-4 w-full rounded bg-gray-800 p-4"
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded bg-gray-800 p-4"
        />

        <input
          type="text"
          placeholder="Téléphone"
          value={telephone}
          onChange={(e) => setTelephone(e.target.value)}
          className="mb-4 w-full rounded bg-gray-800 p-4"
        />

        <textarea
          placeholder="Adresse"
          value={adresse}
          onChange={(e) => setAdresse(e.target.value)}
          className="mb-6 w-full rounded bg-gray-800 p-4"
          rows={4}
        />
<textarea
  placeholder="Observations"
  value={observation}
  onChange={(e) => setObservation(e.target.value)}
  className="mb-6 w-full rounded bg-gray-800 p-4"
  rows={4}
/>
        <button type="submit" className="rounded bg-green-600 px-6 py-3">
          Créer le client
        </button>
      </form>
    </main>
  );
}