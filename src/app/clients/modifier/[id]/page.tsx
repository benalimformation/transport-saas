"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function ModifierClientPage() {
  const params = useParams();
  const router = useRouter();

  const id = params.id as string;

  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [adresse, setAdresse] = useState("");
  const [observation, setObservation] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      chargerClient();
    }
  }, [id]);

  async function chargerClient() {
    const { data, error } = await supabase
      .from("clients")
      .select("nom, email, telephone, adresse, observation")
      .eq("id", id)
      .single();

    if (error || !data) {
      alert("Impossible de charger le client");
      return;
    }

    setNom(data.nom || "");
    setEmail(data.email || "");
    setTelephone(data.telephone || "");
    setAdresse(data.adresse || "");
    setObservation(data.observation || "");
  }

  async function modifierClient(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    const { error } = await supabase
  .from("clients")
  .update({
    nom,
    email,
    telephone,
    adresse,
    observation,
  })
  .eq("id", id);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    router.push("/clients");
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Modifier client</h1>

      <a
        href="/clients"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Clients
      </a>

      <form
        onSubmit={modifierClient}
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
        <button
          type="submit"
          disabled={loading}
          className="rounded bg-green-600 px-6 py-3 disabled:opacity-50"
        >
          {loading ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </form>
    </main>
  );
}