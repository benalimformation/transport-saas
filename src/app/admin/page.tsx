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

type NewProfil = {
  email: string
  nom: string
  role: string
  entreprise_id: string
}

type Toast = {
  id: number
  message: string
  type: 'success' | 'error'
}

export default function AdminPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [profils, setProfils] = useState<Profil[]>([])
  const [filteredProfils, setFilteredProfils] = useState<Profil[]>([])
  const [stats, setStats] = useState({
    totalUsers: 0,
    superAdmins: 0,
    admins: 0,
    otherRoles: 0,
    approximateCompanies: 0
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("Tous")
  const [entrepriseFilter, setEntrepriseFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("Tous")
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newProfil, setNewProfil] = useState<NewProfil>({
    email: "",
    nom: "",
    role: "admin",
    entreprise_id: ""
  })
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [entreprises, setEntreprises] = useState<string[]>([])
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showEditRole, setShowEditRole] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [activeTab, setActiveTab] = useState<'users' | 'companies' | 'audit'>('users')
  const router = useRouter()

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

        const userId = session.user.id
        setCurrentUserId(userId)

        // 3. Récupérer le profil connecté dans profils
        const { data: userProfil, error: profilError } = await supabase
          .from('profils')
          .select('role')
          .eq('id', userId)
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

    checkAuthAndLoadData()
  }, [router])

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
      setFilteredProfils(allProfils)

      // Extraire les entreprises uniques pour le filtre
      const uniqueEntreprises = Array.from(new Set(
        allProfils.map(p => p.entreprise_id).filter(id => id) as string[]
      ))
      setEntreprises(uniqueEntreprises)

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

  async function handleLogout() {
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la déconnexion');
      console.error('Logout error:', err);
    }
  }

  function applyFilters() {
    let result = profils

    // Filtre par terme de recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(p =>
        (p.nom || '').toLowerCase().includes(term) ||
        (p.email || '').toLowerCase().includes(term)
      )
    }

    // Filtre par rôle
    if (roleFilter !== "Tous") {
      result = result.filter(p => p.role === roleFilter)
    }

    // Filtre par entreprise
    if (entrepriseFilter) {
      result = result.filter(p => p.entreprise_id === entrepriseFilter)
    }

    setFilteredProfils(result)
  }

  useEffect(() => {
    applyFilters()
  }, [searchTerm, roleFilter, entrepriseFilter, profils])

  async function handleRoleChange(profilId: string, newRole: string) {
    try {
      // Empêcher le super_admin de modifier son propre rôle
      if (profilId === currentUserId) {
        setError("Vous ne pouvez pas modifier votre propre rôle pour des raisons de sécurité.")
        return
      }

      // Empêcher la création de plusieurs super_admin sans confirmation
      if (newRole === "super_admin") {
        const confirmMultipleSuperAdmin = window.confirm(
          "Attention: Vous êtes sur le point de créer un autre super_admin. " +
          "Cela peut poser des risques de sécurité. Confirmez-vous cette action?"
        )
        if (!confirmMultipleSuperAdmin) {
          return
        }
      }

      const { error } = await supabase
        .from('profils')
        .update({ role: newRole })
        .eq('id', profilId)

      if (error) {
        throw new Error(`Erreur lors de la mise à jour du rôle: ${error.message}`)
      }

      setSuccess(`Rôle mis à jour avec succès pour l'utilisateur ${profilId}`)
      await loadAdminData() // Recharger les données

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du rôle')
      console.error('Role update error:', err)
    }
  }

  async function handleDeleteUser(profilId: string) {
    try {
      // Empêcher la suppression de soi-même
      if (profilId === currentUserId) {
        setError("Vous ne pouvez pas supprimer votre propre compte pour des raisons de sécurité.")
        return
      }

      setDeletingUserId(profilId)

      const { error } = await supabase
        .from('profils')
        .delete()
        .eq('id', profilId)

      if (error) {
        throw new Error(`Erreur lors de la suppression du profil: ${error.message}`)
      }

      setSuccess(`Profil supprimé avec succès (note: cela ne supprime pas le compte Auth Supabase)`)
      setShowDeleteConfirm(null)
      await loadAdminData() // Recharger les données

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la suppression du profil')
      console.error('Delete error:', err)
    } finally {
      setDeletingUserId(null)
    }
  }

  // Fonction pour ajouter un toast
  function addToast(message: string, type: 'success' | 'error') {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])

    // Suppression automatique après 5 secondes
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id))
    }, 5000)
  }

  // Fonction pour exporter en CSV
  function exportToCSV() {
    try {
      // Créer les données CSV à partir des profils filtrés
      const csvData = filteredProfils.map(profil => ({
        nom: profil.nom || 'N/A',
        email: profil.email || 'N/A',
        role: profil.role || 'N/A',
        statut: 'Actif',
        entreprise_id: profil.entreprise_id || 'N/A',
        created_at: profil.created_at ? new Date(profil.created_at).toISOString() : 'N/A'
      }))

      // Créer le contenu CSV
      const headers = 'Nom,Email,Rôle,Statut,Entreprise ID,Créé le'
      const rows = csvData.map(row =>
        `${row.nom},${row.email},${row.role},${row.statut},${row.entreprise_id},${row.created_at}`
      ).join('\n')

      const csvContent = `${headers}\n${rows}`

      // Créer un blob et déclencher le téléchargement
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `utilisateurs_${new Date().toISOString().slice(0, 10)}.csv`)
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      addToast('Export CSV réussi !', 'success')
    } catch (err) {
      addToast('Erreur lors de l\'export CSV', 'error')
      console.error('CSV export error:', err)
    }
  }

  async function handleCreateProfil(e: React.FormEvent) {
    e.preventDefault()

    try {
      // Validation basique
      if (!newProfil.email || !newProfil.nom || !newProfil.role) {
        addToast("Veuillez remplir tous les champs obligatoires", 'error')
        return
      }

      // Vérifier si un utilisateur avec cet email existe déjà
      const { data: existing, error: checkError } = await supabase
        .from('profils')
        .select('id')
        .eq('email', newProfil.email)
        .maybeSingle()

      if (checkError) {
        throw new Error(`Erreur lors de la vérification: ${checkError.message}`)
      }

      if (existing) {
        addToast("Un profil avec cet email existe déjà", 'error')
        return
      }

      // Créer le profil applicatif (sans créer de compte Auth)
      const { error } = await supabase
        .from('profils')
        .insert({
          email: newProfil.email,
          nom: newProfil.nom,
          role: newProfil.role,
          entreprise_id: newProfil.entreprise_id || null
        })

      if (error) {
        throw new Error(`Erreur lors de la création du profil: ${error.message}`)
      }

      addToast(`Profil applicatif créé avec succès`, 'success')
      setShowCreateForm(false)
      setNewProfil({
        email: "",
        nom: "",
        role: "admin",
        entreprise_id: ""
      })
      await loadAdminData() // Recharger les données

    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Erreur lors de la création du profil', 'error')
      console.error('Create profil error:', err)
    }
  }

  function handleReturnToDashboard() {
    router.push('/dashboard')
  }

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
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="max-w-md w-full space-y-8 p-8 bg-gray-900 border border-gray-800 rounded-lg">
          <h2 className="text-2xl font-bold text-center text-red-400">Erreur d'accès</h2>
          <div className="p-4 mb-4 text-sm text-red-300 rounded-lg bg-red-900/30 border border-red-700" role="alert">
            {error}
          </div>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setError(null)}
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={handleReturnToDashboard}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Retour Dashboard
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Barre supérieure professionnelle */}
      <div className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">Administration SaaS</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadAdminData}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
              >
                Actualiser
              </button>
              <button
                onClick={handleReturnToDashboard}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
              >
                Retour Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Messages */}
        {success && (
          <div className="mb-6 p-4 text-sm text-green-400 rounded-lg bg-green-900/30 border border-green-500" role="alert">
            {success}
            <button
              onClick={() => setSuccess(null)}
              className="float-right font-bold text-green-400 hover:text-green-300"
            >
              ×
            </button>
          </div>
        )}

        {/* Filtres et recherche */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-lg font-medium text-white mb-4">Filtres et Recherche</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-1">
                Recherche par nom/email
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-gray-400"
                placeholder="Rechercher..."
              />
            </div>

            <div>
              <label htmlFor="roleFilter" className="block text-sm font-medium text-gray-300 mb-1">
                Filtrer par rôle
              </label>
              <select
                id="roleFilter"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
              >
                <option value="Tous">Tous</option>
                <option value="super_admin">Super Admin</option>
                <option value="admin">Admin</option>
                <option value="exploitant">Exploitant</option>
                <option value="chauffeur">Chauffeur</option>
                <option value="client">Client</option>
              </select>
            </div>

            <div>
              <label htmlFor="entrepriseFilter" className="block text-sm font-medium text-gray-300 mb-1">
                Filtrer par entreprise
              </label>
              <select
                id="entrepriseFilter"
                value={entrepriseFilter}
                onChange={(e) => setEntrepriseFilter(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
              >
                <option value="">Toutes les entreprises</option>
                {entreprises.map(entrepriseId => (
                  <option key={entrepriseId} value={entrepriseId}>
                    {entrepriseId}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => setShowCreateForm(!showCreateForm)}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md"
              >
                {showCreateForm ? 'Annuler' : 'Créer Utilisateur'}
              </button>
            </div>
          </div>
        </div>

        {/* Formulaire de création (si visible) */}
        {showCreateForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-medium text-white mb-4">Créer un nouveau profil applicatif</h2>
            <p className="text-sm text-gray-300 mb-4">
              Note: Cela crée uniquement un profil applicatif, pas un compte Auth Supabase.
            </p>
            <form onSubmit={handleCreateProfil} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="newEmail" className="block text-sm font-medium text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  id="newEmail"
                  type="email"
                  value={newProfil.email}
                  onChange={(e) => setNewProfil({...newProfil, email: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-gray-400"
                  required
                />
              </div>

              <div>
                <label htmlFor="newNom" className="block text-sm font-medium text-gray-300 mb-1">
                  Nom *
                </label>
                <input
                  id="newNom"
                  type="text"
                  value={newProfil.nom}
                  onChange={(e) => setNewProfil({...newProfil, nom: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-gray-400"
                  required
                />
              </div>

              <div>
                <label htmlFor="newRole" className="block text-sm font-medium text-gray-300 mb-1">
                  Rôle *
                </label>
                <select
                  id="newRole"
                  value={newProfil.role}
                  onChange={(e) => setNewProfil({...newProfil, role: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white"
                >
                  <option value="admin">Admin</option>
                  <option value="exploitant">Exploitant</option>
                  <option value="chauffeur">Chauffeur</option>
                  <option value="client">Client</option>
                  <option value="super_admin">Super Admin (attention)</option>
                </select>
              </div>

              <div>
                <label htmlFor="newEntrepriseId" className="block text-sm font-medium text-gray-300 mb-1">
                  Entreprise ID
                </label>
                <input
                  id="newEntrepriseId"
                  type="text"
                  value={newProfil.entreprise_id}
                  onChange={(e) => setNewProfil({...newProfil, entreprise_id: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-white placeholder-gray-400"
                  placeholder="Optionnel"
                />
              </div>

              <div className="md:col-span-2 lg:col-span-4">
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md"
                >
                  Créer Profil Applicatif
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Statistiques améliorées */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-8">
          <div className="bg-gray-900 border border-gray-800 rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-400 truncate">Utilisateurs totaux</dt>
              <dd className="mt-1 text-3xl font-semibold text-white">{stats.totalUsers}</dd>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-400 truncate">Super Admins</dt>
              <dd className="mt-1 text-3xl font-semibold text-purple-400">{stats.superAdmins}</dd>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-400 truncate">Admins</dt>
              <dd className="mt-1 text-3xl font-semibold text-blue-400">{stats.admins}</dd>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-400 truncate">Autres rôles</dt>
              <dd className="mt-1 text-3xl font-semibold text-gray-300">{stats.otherRoles}</dd>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <dt className="text-sm font-medium text-gray-400 truncate">Entreprises</dt>
              <dd className="mt-1 text-3xl font-semibold text-green-400">{stats.approximateCompanies}</dd>
            </div>
          </div>
        </div>

        {/* Compteur de résultats */}
        <div className="mb-4">
          <p className="text-sm text-gray-400">
            Affichage : {filteredProfils.length} résultat(s) sur {profils.length} utilisateur(s)
          </p>
        </div>

        {/* Table des utilisateurs professionnelle */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-white">Liste des utilisateurs</h2>
          </div>
          <div className="border-t border-gray-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="bg-gray-800">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Nom</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Rôle</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Statut</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Entreprise ID</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Créé le</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredProfils.map((profil) => {
                    const isCurrentUser = profil.id === currentUserId;
                    const isSuperAdmin = profil.role === "super_admin";
                    const canDelete = !isCurrentUser && !(isSuperAdmin && profil.id !== currentUserId);

                    return (
                      <tr
                        key={profil.id}
                        className={`${isCurrentUser ? "bg-gray-800" : "bg-gray-900"} hover:bg-gray-800 transition-colors duration-150 ease-in-out`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{profil.nom || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{profil.email || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          {isCurrentUser ? (
                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-900 text-purple-300">
                              {profil.role || 'N/A'} <span className="ml-1">(Vous)</span>
                            </span>
                          ) : (
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              profil.role === 'super_admin' ? 'bg-purple-900 text-purple-300' :
                              profil.role === 'admin' ? 'bg-blue-900 text-blue-300' :
                              profil.role === 'chauffeur' ? 'bg-green-900 text-green-300' :
                              profil.role === 'client' ? 'bg-orange-900 text-orange-300' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {profil.role || 'N/A'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white">
                          <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-900 text-green-300">
                            Actif
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-300">{profil.entreprise_id || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {profil.created_at ? new Date(profil.created_at).toLocaleString() : 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm font-medium">
                          {isCurrentUser ? (
                            <span className="text-gray-500 italic">Actions désactivées</span>
                          ) : (
                            <div className="flex space-x-2">
                              {/* Bouton Modifier - ouvre le sélecteur de rôle */}
                              <button
                                onClick={() => setShowEditRole(showEditRole === profil.id ? null : profil.id)}
                                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 transition-colors"
                              >
                                {showEditRole === profil.id ? 'Annuler' : 'Modifier'}
                              </button>

                              {/* Bouton Supprimer avec protections */}
                              <button
                                onClick={() => canDelete && setShowDeleteConfirm(profil.id)}
                                disabled={!canDelete}
                                className={`px-3 py-1 text-xs font-medium text-white rounded transition-colors ${canDelete ? 'bg-red-600 hover:bg-red-700' : 'bg-red-900 cursor-not-allowed opacity-50'}`}
                                title={!canDelete ? (isSuperAdmin ? "Suppression d'un super administrateur interdite" : "Vous ne pouvez pas supprimer votre propre compte") : ""}
                              >
                                Supprimer
                              </button>

                              {/* Confirmation de suppression */}
                              {showDeleteConfirm === profil.id && (
                                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                                  <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-sm w-full mx-4">
                                    <h3 className="text-lg font-medium text-white mb-4">Confirmer la suppression</h3>
                                    <p className="text-gray-300 mb-6">
                                      Confirmer la suppression définitive de cet utilisateur ?
                                    </p>
                                    <div className="flex space-x-3">
                                      <button
                                        onClick={() => handleDeleteUser(profil.id)}
                                        disabled={deletingUserId === profil.id}
                                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
                                      >
                                        {deletingUserId === profil.id ? 'Suppression...' : 'Confirmer'}
                                      </button>
                                      <button
                                        onClick={() => setShowDeleteConfirm(null)}
                                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors"
                                      >
                                        Annuler
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}