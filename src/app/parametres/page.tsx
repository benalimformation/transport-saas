"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";
import { isAuthorized } from "../../lib/permissions";

// Type pour les paramètres de l'entreprise (table entreprises)
interface Entreprise {
  id?: string;
  nom: string;
  adresse: string;
  code_postal: string;
  ville: string;
  pays: string;
  telephone: string;
  email: string;
}

/**
 * Composant principal avec Suspense boundary pour useSearchParams
 */
export default function ParametresPage() {
  return (
    <Suspense fallback={<ParametresPageLoading />}>
      <ParametresPageContent />
    </Suspense>
  );
}

/**
 * Affichage de chargement pendant le suspense
 */
function ParametresPageLoading() {
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

/**
 * Contenu principal de la page paramètres
 * Ce composant utilise useSearchParams qui nécessite Suspense
 */
function ParametresPageContent() {
  const router = useRouter();
  const supabase = createClient();

  const [settings, setSettings] = useState<Entreprise>({
    nom: "",
    adresse: "",
    code_postal: "",
    ville: "",
    pays: "FR",
    telephone: "",
    email: "",
  });
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [communes, setCommunes] = useState<string[]>([]);
  const [cityLookupLoading, setCityLookupLoading] = useState(false);

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
        .select("id, nom, adresse, code_postal, ville, pays, telephone, email")
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
        code_postal: entreprise?.code_postal || "",
        ville: entreprise?.ville || "",
        pays: entreprise?.pays || "FR",
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
    const codePostalNettoye = settings.code_postal.trim();
    const villeNettoyee = settings.ville.trim();
    const paysNettoye = settings.pays.trim().toUpperCase();
    const telephoneNettoye = settings.telephone.trim();

    if (!adresseNettoyee || !codePostalNettoye || !villeNettoyee || !paysNettoye || !telephoneNettoye) {
      setError("L'adresse, le code postal, la ville, le pays et le téléphone sont obligatoires.");
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
          code_postal: codePostalNettoye,
          ville: villeNettoyee,
          pays: paysNettoye,
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
        throw new Error("Aucune entreprise n'a été mise à jour.");
      }

      setSuccess("Paramètres enregistrés avec succès!");
      setTimeout(() => setSuccess(null), blockingSettingsTimeout);

      // Rediriger vers le dashboard après succès
      const isOnboarding = new URLSearchParams(window.location.search).get("complete") === "1";
router.replace(isOnboarding ? "/camions/nouveau?onboarding=1" : "/dashboard");

    } catch (err) {
      setError("Erreur lors de l'enregistrement: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const blockingSettingsTimeout = 3000; // 3 secondes

  function handleChange(field: string, value: string | number) {
    setSettings(prev => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
    const codePostal = settings.code_postal.trim();

    if (settings.pays !== "FR" || !/^\d{5}$/.test(codePostal)) {
      setCommunes([]);
      setCityLookupLoading(false);
      return;
    }

    const controller = new AbortController();

    async function fetchCommunes() {
      setCityLookupLoading(true);

      try {
        const response = await fetch(
          `https://geo.api.gouv.fr/communes?codePostal=${encodeURIComponent(codePostal)}&fields=nom&format=json`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: Array<{ nom?: string }> = await response.json();
        const noms = Array.from(
          new Set(
            data
              .map((commune) => commune.nom?.trim())
              .filter((nom): nom is string => Boolean(nom))
          )
        );

        if (controller.signal.aborted) return;

        setCommunes(noms);

        if (noms.length === 1) {
          setSettings(prev => ({ ...prev, ville: noms[0] }));
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.warn("Recherche de commune indisponible:", err);
        setCommunes([]);
      } finally {
        if (!controller.signal.aborted) {
          setCityLookupLoading(false);
        }
      }
    }

    fetchCommunes();

    return () => controller.abort();
  }, [settings.code_postal, settings.pays]);

  if (loading) {
    return <ParametresPageLoading />;
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Paramètres de l'entreprise</h1>
          <a href="/dashboard" className="rounded bg-gray-700 px-4 py-2 hover:bg-gray-600">
            ← Retour Dashboard
          </a>
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
                <label className="block text-sm font-medium mb-2">Adresse</label>
                <input
                  type="text"
                  value={settings.adresse}
                  onChange={(e) => handleChange('adresse', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                  required
                  disabled={isReadOnly}
                  placeholder="Numéro et nom de voie"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Code postal</label>
                <input
                  type="text"
                  value={settings.code_postal}
                  onChange={(e) => handleChange('code_postal', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                  required
                  disabled={isReadOnly}
                  autoComplete="postal-code"
                  placeholder="Code postal"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Ville</label>

                {settings.pays === "FR" && communes.length > 1 ? (
                  <select
                    value={communes.includes(settings.ville) ? settings.ville : ""}
                    onChange={(e) => handleChange('ville', e.target.value)}
                    className="w-full rounded bg-gray-800 p-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                    required
                    disabled={isReadOnly}
                  >
                    <option value="">Sélectionner une commune</option>
                    {communes.map((commune) => (
                      <option key={commune} value={commune}>
                        {commune}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={settings.ville}
                    onChange={(e) => handleChange('ville', e.target.value)}
                    className="w-full rounded bg-gray-800 p-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                    required
                    disabled={isReadOnly}
                    autoComplete="address-level2"
                    placeholder="Ville"
                  />
                )}

                {cityLookupLoading && (
                  <p className="mt-2 text-xs text-gray-400">
                    Recherche de la commune...
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Pays</label>
                <select
                  value={settings.pays}
                  onChange={(e) => handleChange('pays', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white border border-gray-700 focus:border-blue-500 focus:outline-none"
                  required
                  disabled={isReadOnly}
                >
                  <option value="FR">France</option>
                  <option value="BE">Belgique</option>
                  <option value="LU">Luxembourg</option>
                  <option value="DE">Allemagne</option>
                  <option value="ES">Espagne</option>
                  <option value="IT">Italie</option>
                  <option value="NL">Pays-Bas</option>
                  <option value="CH">Suisse</option>
                </select>
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