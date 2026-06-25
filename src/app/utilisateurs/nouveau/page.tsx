"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function NouvelUtilisateurPage() {
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("Temporaire123!");
  const [role, setRole] = useState("exploitant");

  async function creerUtilisateur(e: React.FormEvent) {
    e.preventDefault();

    const { data, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      alert(authError.message);
      return;
    }

    const userId = data.user?.id;

    if (!userId) {
      alert("Utilisateur créé mais ID introuvable.");
      return;
    }

    const { error: profilError } = await supabase.from("profils").insert({
      id: userId,
      email,
      nom,
      role,
    });

    if (profilError) {
      alert(profilError.message);
      return;
    }

    alert("Utilisateur créé avec succès");
    window.location.href = "/utilisateurs";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Nouvel utilisateur</h1>

      <a
        href="/utilisateurs"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Utilisateurs
      </a>

      <form
        onSubmit={creerUtilisateur}
        className="max-w-xl space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-6"
      >
        <input
          type="text"
          placeholder="Nom"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="text"
          placeholder="Mot de passe temporaire"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
        >
          <option value="admin">Admin</option>
          <option value="exploitant">Exploitant</option>
          <option value="chauffeur">Chauffeur</option>
          <option value="client">Client</option>
        </select>

        <button type="submit" className="rounded bg-green-600 px-6 py-3">
          Créer utilisateur
        </button>
      </form>
    </main>
  );
}
