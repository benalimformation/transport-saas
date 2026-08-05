"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { Truck, Users, FileText, Package, DollarSign, BarChart3 } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const supabase = createClient();

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
        .select('id, nom, role, entreprise_id')
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

      // Vérifier que l'entreprise existe et a des informations complètes
      const { data: entreprise, error: entrepriseError } = await supabase
        .from('entreprises')
        .select('adresse, telephone')
        .eq('id', profil.entreprise_id)
        .single();

      if (entrepriseError || !entreprise) {
        throw new Error("Entreprise introuvable pour cet utilisateur.");
      }

      const companyIncomplete = !entreprise.adresse?.trim() || !entreprise.telephone?.trim();

      if (companyIncomplete) {
        // Redirection vers paramètres pour compléter les informations obligatoires
        router.replace('/parametres?complete=1');
        router.refresh();
        return;
      }

      // Redirection selon le rôle
      if (profil.role === "super_admin") {
        router.replace('/admin');
      } else {
        router.replace('/dashboard');
      }
      router.refresh();

    } catch (err) {
      alert(err instanceof Error ? err.message : 'Une erreur est survenue lors de la connexion');
      // Déconnexion en cas d'erreur
      await supabase.auth.signOut();
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6 lg:gap-8 items-center">
          {/* Left column - Hero premium compact */}
          <div className="text-white py-6 lg:py-0">
            <div className="mb-4">
              <span className="text-3xl font-bold text-white">Transport</span>
              <span className="text-3xl font-bold text-green-500">ERP</span>
            </div>

            <h1 className="text-3xl lg:text-4xl xl:text-5xl font-bold mb-2 leading-tight">
              <span className="text-white">Toute votre activité transport.</span><br />
              <span className="text-green-400">Une seule interface.</span>
            </h1>
 
            <p className="text-base text-gray-200 mb-2 max-w-xl">
              Pilotez vos devis, chauffeurs, véhicules, livraisons, facturation et rentabilité depuis une seule plateforme.
            </p>

            {/* Image hero premium - visible immédiatement */}
            <div className="relative mb-3 rounded-xl overflow-hidden shadow-lg h-64 lg:h-72">
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent z-10"></div>
              <div className="absolute inset-0 bg-[url('/image/login-transport-hero.png')] bg-cover bg-[center_right_85%]"></div>
            </div>

            {/* Badges de modules compacts */}
            <div className="mb-2">
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                {[
                  { icon: Truck, label: "Véhicules" },
                  { icon: Users, label: "Chauffeurs" },
                  { icon: FileText, label: "Devis" },
                  { icon: Package, label: "Livraisons" },
                  { icon: DollarSign, label: "Facturation" },
                  { icon: BarChart3, label: "Rentabilité" }
                ].map((item, index) => (
                  <div key={index} className="flex flex-col items-center p-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="w-6 h-6 flex items-center justify-center mb-1">
                      <item.icon className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="text-xs text-gray-300 text-center font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column - Form (inchangé) */}
          <div className="bg-gray-800 rounded-2xl p-6 lg:p-8 shadow-2xl">
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
