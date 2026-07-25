"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from "../../lib/supabase"
import { Check, Shield, Cloud, FileText } from 'lucide-react'

export default function RegisterPage() {
  const [nom, setNom] = useState('')
  const [nomEntreprise, setNomEntreprise] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      if (!nom.trim() || !nomEntreprise.trim()) {
  throw new Error("Le nom et le nom de l’entreprise sont obligatoires")
}

      // Vérifier que les mots de passe correspondent
      if (password !== confirmPassword) {
        throw new Error("Les mots de passe ne correspondent pas.")
      }

      // 1. Vérifier et purger toute session existante avant création
      const { data: currentSessionData } = await supabase.auth.getSession();
      if (currentSessionData.session) {
        const { error: initialSignOutError } = await supabase.auth.signOut();
        if (initialSignOutError) {
          throw new Error("Impossible de purger la session précédente. Veuillez vous déconnecter manuellement avant de créer un nouveau compte.");
        }
      }

      // Create user with email, password, and metadata for company creation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {nom_entreprise: nomEntreprise.trim(),
nom_utilisateur: nom.trim(),
          }
        }
      })

      if (authError) {
        throw authError
      }

      if (!authData.user) {
        throw new Error("User not created")
      }

      // The trigger handle_new_company_user() will automatically create:
      // 1. A company in public.entreprises with a proper UUID
      // 2. A profile in public.profils with role='admin' and correct entreprise_id
      // All operations are performed with SECURITY DEFINER and are atomic

      // 2. Vérifier et purger toute session créée par signUp
      const { data: postSignupSessionData } = await supabase.auth.getSession();
      if (postSignupSessionData.session) {
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          throw new Error("Impossible de purger la session après l'inscription. Veuillez vous déconnecter manuellement.");
        }
      }

      setSuccess(true)

      // Redirect to login after successful registration
      setTimeout(() => {
        router.replace('/login')
      }, 2000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during registration')
    } finally {
      setLoading(false)
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
              Commencez votre essai gratuit
            </h1>

            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              30 jours pour découvrir tous les outils de gestion de votre entreprise de transport.
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

          {/* Right column - Form */}
          <div className="bg-gray-800 rounded-2xl p-8 shadow-2xl">
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Créer un compte
            </h2>
            <p className="text-gray-400 text-center mb-8 text-sm">
              Commencez votre essai gratuit de 30 jours.
            </p>

            {error && (
              <div className="p-4 mb-6 text-sm text-red-400 rounded-lg bg-red-900/30 border border-red-800" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="p-4 mb-6 text-sm text-green-400 rounded-lg bg-green-900/30 border border-green-800" role="alert">
               Compte créé avec succès. Connectez-vous pour commencer votre essai gratuit de 30 jours.
              </div>
            )}

            <form className="space-y-6" onSubmit={handleRegister}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="nom" className="block text-sm font-medium text-gray-300 mb-1">
                    Nom complet
                  </label>
                  <input
                    id="nom"
                    name="nom"
                    type="text"
                    required
                    value={nom}
                    onChange={(e) => setNom(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400"
                    placeholder="Votre nom complet"
                  />
                </div>

                <div>
                  <label htmlFor="nomEntreprise" className="block text-sm font-medium text-gray-300 mb-1">
                    Nom de l'entreprise
                  </label>
                  <input
                    id="nomEntreprise"
                    name="nomEntreprise"
                    type="text"
                    required
                    value={nomEntreprise}
                    onChange={(e) => setNomEntreprise(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400"
                    placeholder="Nom de votre entreprise"
                  />
                </div>

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
                  </label><input
  id="password"
  name="password"
  type="password"
  autoComplete="new-password"
  required
  minLength={8}
  value={password}
  onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400"
                    placeholder="••••••••••••"
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1">
                    Confirmer le mot de passe
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg bg-gray-700 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 text-white placeholder-gray-400"
                    placeholder="••••••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {loading ? (
                    <>
                      <span className="mr-2">Création en cours</span>
                      <span className="animate-pulse">...</span>
                    </>
                  ) : (
                    'Créer mon compte'
                  )}
                </button>
              </div>

              <div className="text-center text-sm text-gray-400">
                <p>
                  Déjà un compte ?{' '}
                  <a href="/login" className="font-medium text-green-500 hover:text-green-400">
                    Se connecter
                  </a>
                </p>
              </div>
            </form>
      </div>
    </div>
      </div>
      </div>
    </div>
  );
}
