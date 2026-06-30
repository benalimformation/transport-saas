"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../../lib/supabase"

type Profil = {
  id: string
  email: string | null
  nom: string | null
  role: string | null
  entreprise_id: string | null
  created_at: string | null
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [profils, setProfils] = useState<Profil[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    superAdmins: 0,
    admins: 0,
    otherRoles: 0,
    approximateCompanies: 0
  })
  const router = useRouter()

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la déconnexion');
      console.error('Logout error:', err);
    }
  }

  useEffect(() => {
    async function checkAuthAndLoadData() {
      try {
        // 1. Vérifier la session utilisateur
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          // 2. Si aucune session : rediriger vers /login
          router.push('/login')
          return
        }

        // 3. Récupérer le profil connecté dans profils
        const { data: userProfil, error: profilError } = await supabase
          .from('profils')
          .select('role')
          .eq('id', session.user.id)
          .single()

        if (profilError) {
          throw new Error(`Erreur lors de la récupération du profil: ${profilError.message}`)
        }

        // 4. Vérifier le rôle super_admin
        if (!userProfil || userProfil.role !== "super_admin") {
          // Accès refusé - redirection vers dashboard
          setError("Accès refusé. Vous devez être super_admin pour accéder à cette page.")
          setTimeout(() => {
            router.push('/dashboard')
          }, 3000)
          return
        }

        // 5. Si role === "super_admin" : charger les données admin
        await loadAdminData()

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
        console.error('Admin page error:', err)
      } finally {
        setLoading(false)
      }
    }

  async function loadAdminData() {
      try {
        // Charger tous les profils
        const { data: allProfils, error } = await supabase
          .from('profils')
          .select("*")

        if (error) {
          throw new Error(`Erreur lors du chargement des profils: ${error.message}`)
        }

        if (!allProfils) {
          return
        }

        setProfils(allProfils)

        // Calculer les statistiques côté frontend
        const totalUsers = allProfils.length
        const superAdmins = allProfils.filter(p => p.role === "super_admin").length
        const admins = allProfils.filter(p => p.role === "admin").length
        const otherRoles = totalUsers - superAdmins - admins

        // Calculer le nombre approximatif d'entreprises (entreprise_id distincts)
        const uniqueCompanyIds = new Set(allProfils
          .map(p => p.entreprise_id)
          .filter(id => id !== null && id !== undefined) as string[])

        setStats({
          totalUsers,
          superAdmins,
          admins,
          otherRoles,
          approximateCompanies: uniqueCompanyIds.size
        })

      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des données admin')
        console.error('Error loading admin data:', err)
      }
    }

    checkAuthAndLoadData()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement de l'espace administration...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold text-center text-red-600">Erreur d'accès</h2>
          <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
            {error}
          </div>
          <p className="text-center text-gray-600">
            Vous allez être redirigé vers le tableau de bord...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Administration SaaS</h1>
          <button
            onClick={handleLogout}
            className="rounded bg-red-600 px-4 py-2 hover:bg-red-700 text-white"
          >
            Déconnexion
          </button>
        </div>

        {/* Statistiques */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Utilisateurs totaux</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.totalUsers}</dd>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Super Admins</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.superAdmins}</dd>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Admins</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.admins}</dd>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Autres rôles</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.otherRoles}</dd>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-500 truncate">Entreprises (approx.)</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.approximateCompanies}</dd>
            </div>
          </div>
        </div>

        {/* Liste des profils */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900 mb-4">Liste des profils</h2>
          </div>
          <div className="border-t border-gray-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rôle</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entreprise ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Créé le</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {profils.map((profil) => (
                    <tr key={profil.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{profil.nom || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{profil.email || 'N/A'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          profil.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                          profil.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {profil.role || 'N/A'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{profil.entreprise_id || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {profil.created_at ? new Date(profil.created_at).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}