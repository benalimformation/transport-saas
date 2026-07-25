"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { isAuthorized } from "../../lib/permissions";

// Type pour les paramètres de l'entreprise (table entreprises)
interface Entreprise {
  id?: string;
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
}

export default function ParametresPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const completeParam = searchParams.get('complete');
  const isCompleteFlow = completeParam === '1';

  const [settings, setSettings] = useState<Entreprise>({
    nom: "",
    adresse: "",
    telephone: "",
    email: "",
  });
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    setLoading(true);
    setError(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        window.location.href = "/login";
        return;
      }

      // Récupérer le profil utilisateur pour avoir l'entreprise_id
      const { data: profil, error: profilError } = await supabase
        .from("profils")
        .select("entreprise_id, role")
        .eq("id", userId)
        .single();

      if (profilError || !profil) {
        setError("Profil utilisateur introuvable.");
        return;
      }

      // Vérifier les permissions - seul super_admin, admin, exploitant peut éditer
      const canEdit = isAuthorized(profil.role, "parametres");
      setIsReadOnly(!canEdit);

      if (!canEdit) {
        setError("Accès en lecture seule. Vous n'avez pas les droits nécessaires pour modifier ces paramètres.");
      }

      setEntrepriseId(profil.entreprise_id);

      // Récupérer les données de l'entreprise depuis la table entreprises
      const { data: entreprise, error: entrepriseError } = await supabase
        .from("entreprises")
        .select("id, nom, adresse, telephone, email")
        .eq("id", profil.entreprise_id)
        .single();

      if (entrepriseError && entrepriseError.code !== "PGRST116") {
        // PGRST116 = aucune ligne trouvée, OK pour les nouvelles entreprises
        if (entrepriseError.code !== "PGRST116") {
          throw entrepriseError;
        }
      }

      // Définir les données existantes ou par défaut
      setSettings({
        id: entreprise?.id,
        nom: entreprise?.nom || "",
        adresse: entreprise?.adresse || "",
        telephone: entreprise?.telephone || "",
        email: entreprise?.email || "",
      });

    } catch (err) {
      setError("Erreur lors du chargement des paramètres: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly || !entrepriseId) return;

    // Validation obligatoire avant setLoading
    const adresseNettoyee = settings.adresse.trim();
    const telephoneNettoye = settings.telephone.trim();

    if (!adresseNettoyee || !telephoneNettoye) {
      setError("L’adresse et le téléphone sont obligatoires.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Mettre à jour les données de l'entreprise
      const { data: updatedEntreprise, error: updateError } = await supabase
        .from("entreprises")
        .update({
          nom: settings.nom.trim(),
          adresse: adresseNettoyee,
          telephone: telephoneNettoye,
          email: settings.email.trim() || null
        })
        .eq("id", entrepriseId)
        .select("id")
        .single();

      if (updateError) {
        throw updateError;
      }

      if (!updatedEntreprise?.id) {
        throw new Error("Aucune entreprise n’a été mise à jour.");
      }

      setSuccess("Paramètres enregistrés avec succès!");
      setTimeout(() => setSuccess(null), 3000);

      // Si c'était un flux de complétion, rediriger vers le dashboard
      if (isCompleteFlow) {
        router.replace('/dashboard');
        router.refresh();
      }

    } catch (err) {
      setError("Erreur lors de l'enregistrement: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: string, value: string | number) {
    setSettings(prev => ({ ...prev, [field]: value }));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-950 p-10 text-white">
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="mb-4 text-2xl">Chargement...</div>
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Paramètres de l'entreprise</h1>
          {!isCompleteFlow && (
            <a href="/dashboard" className="rounded bg-gray-700 px-4 py-2 hover:bg-gray-600">
              ← Retour Dashboard
            </a>
          )}
        </div>

        {error && (
          <div className="mb-6 rounded bg-red-900 p-4 text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 rounded bg-green-900 p-4 text-green-300">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section: Entreprise */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-6 text-xl font-semibold">Entreprise</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Nom de l'entreprise</label>
                <input
                  type="text"
                  value={settings.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                  required
                  disabled={isReadOnly}
                  placeholder="Nom de votre entreprise"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Adresse complète</label>
                <input
                  type="text"
                  value={settings.adresse}
                  onChange={(e) => handleChange('adresse', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                  required
                  disabled={isReadOnly}
                  placeholder="Adresse de votre entreprise"
                />
              </div>
            </div>
          </div>

          {/* Section: Coordonnées */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-6 text-xl font-semibold">Coordonnées</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2">Téléphone</label>
                <input
                  type="tel"
                  value={settings.telephone}
                  onChange={(e) => handleChange('telephone', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                  required
                  disabled={isReadOnly}
                  placeholder="Numéro de téléphone"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                  required
                  disabled={isReadOnly}
                  placeholder="Email de contact"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => window.location.href = '/dashboard'}
              className="rounded bg-gray-700 px-6 py-3 hover:bg-gray-600 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading || isReadOnly}
              className="rounded bg-blue-600 px-6 py-3 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Enregistrement...' : isReadOnly ? 'Lecture seule' : 'Enregistrer les paramètres'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}