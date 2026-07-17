"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { Check, Shield, Cloud, FileText } from 'lucide-react';

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

    try {
      // Récupérer l'utilisateur connecté
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("Utilisateur non trouvé après connexion");
      }

      // Récupérer le profil de l'utilisateur dans la table profils
      const { data: profil, error: profilError } = await supabase
        .from('profils')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profilError && profilError.code !== 'PGRST116') {
        // Erreur autre que "aucun résultat trouvé"
        throw new Error(`Erreur lors de la récupération du profil: ${profilError.message}`);
      }

      if (!profil) {
        // Aucun profil trouvé
        throw new Error("Aucun profil utilisateur trouvé. Veuillez contacter l'administrateur.");
      }

      // Redirection selon le rôle
      if (profil.role === "super_admin") {
        window.location.href = "/admin";
      } else {
        window.location.href = "/dashboard";
      }

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Une erreur est survenue lors de la connexion');
      // Déconnexion en cas d'erreur
      await supabase.auth.signOut();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left column - Marketing */}
          <div className="text-white py-12 lg:py-0">
            <div className="mb-8">
              <span className="text-3xl font-bold text-white">TRANSPORT</span>
              <span className="text-3xl font-bold text-green-500">ERP</span>
            </div>

            <h1 className="text-4xl lg:text-5xl font-bold mb-6">
              Connectez-vous à votre espace
            </h1>

            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              Votre essai gratuit de 30 jours vous attend.
            </p>

            <div className="space-y-3 text-gray-300 mb-8">
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>Sans carte bancaire</span>
              </div>
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>Sans engagement</span>
              </div>
              <div className="flex items-center">
                <Check className="w-5 h-5 text-green-500 mr-3" />
                <span>Résiliable à tout moment</span>
          </div>
          </div>
        

            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center">
                <Shield className="w-4 h-4 text-green-500 mr-2" />
                <span>Développé pour les transporteurs français</span>
              </div>
              <div className="flex items-center">
                <Cloud className="w-4 h-4 text-green-500 mr-2" />
                <span>Hébergement sécurisé</span>
              </div>
              <div className="flex items-center">
                <FileText className="w-4 h-4 text-green-500 mr-2" />
                <span>CMR et bons de transport intégrés</span>
              </div>
            </div>
          </div>

          {/* Right column - Form */}
          <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Accéder à mon compte
            </h2>
            <p className="text-gray-400 text-center mb-8 text-sm">
              Connectez-vous pour gérer votre activité de transport.
            </p>

            <form className="space-y-6" onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
                    Adresse email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                    Mot de passe
                  </label>
                  <input
                    id="password"
                    
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                >
                  Se connecter
                </button>
              </div>

              <div className="text-center text-sm text-gray-400">
                <p>
                  Pas encore de compte ?{' '}
                  <a href="/register" className="font-medium text-green-500 hover:text-green-400">
                    Créer un compte gratuitement
                  </a>
                </p>
                <p className="mt-2">
                  <a href="/forgot-password" className="font-medium text-green-500 hover:text-green-400">
                    Mot de passe oublié ?
                  </a>
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
