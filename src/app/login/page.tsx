"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    async function verifierSession() {
      const { data } = await supabase.auth.getSession();

      if (data.session) {
        window.location.href = "/dashboard";
      }
    }

    verifierSession();
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-black text-white">
      <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4">
        <h1 className="text-center text-5xl font-bold">Connexion</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full rounded bg-zinc-900 p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Mot de passe"
          className="w-full rounded bg-zinc-900 p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" className="w-full rounded bg-blue-600 p-3">
          Se connecter
        </button>
      </form>
    </main>
  );
}