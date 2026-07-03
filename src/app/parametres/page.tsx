"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { isAuthorized } from "../../lib/permissions";

// Type for company settings
interface ParametresEntreprise {
  id?: string;
  entreprise_id: string;
  nom: string;
  adresse: string;
  telephone: string;
  email: string;
  site_web: string;
  siret: string;
  tva_intra: string;
  iban: string;
  bic: string;
  conditions_paiement: string;
  tva_defaut: number;
  prefixe_devis: string;
  prefixe_factures: string;
  mentions_legales: string;
  couleur_primaire: string;
  logo_url: string;
}

export default function ParametresPage() {
  const [settings, setSettings] = useState<ParametresEntreprise>({
    entreprise_id: "",
    nom: "",
    adresse: "",
    telephone: "",
    email: "",
    site_web: "",
    siret: "",
    tva_intra: "",
    iban: "",
    bic: "",
    conditions_paiement: "Paiement à 30 jours",
    tva_defaut: 20,
    prefixe_devis: "DEV-",
    prefixe_factures: "FACT-",
    mentions_legales: "Document généré automatiquement par Transport SaaS",
    couleur_primaire: "#3b82f6",
    logo_url: ""
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
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

      // Get user profile to check permissions and get entreprise_id
      const { data: profil, error: profilError } = await supabase
        .from("profils")
        .select("entreprise_id, role")
        .eq("id", userId)
        .single();

      if (profilError || !profil) {
        setError("Profil utilisateur introuvable.");
        return;
      }

      // Check authorization - only super_admin, admin, exploitant can edit
      const canEdit = isAuthorized(profil.role, "parametres");
      setIsReadOnly(!canEdit);

      if (!canEdit) {
        setError("Accès en lecture seule. Vous n'avez pas les droits nécessaires pour modifier ces paramètres.");
      }

      // Get company settings
      const { data: parametres, error: parametresError } = await supabase
        .from("parametres_entreprise")
        .select("*")
        .eq("entreprise_id", profil.entreprise_id)
        .single();

      if (parametresError && parametresError.code !== "PGRST116") {
        // PGRST116 = no rows found, which is okay for new companies
        if (parametresError.code !== "PGRST116") {
          throw parametresError;
        }
      }

      // Set existing data or defaults
      setSettings({
        entreprise_id: profil.entreprise_id,
        nom: parametres?.nom || "",
        adresse: parametres?.adresse || "",
        telephone: parametres?.telephone || "",
        email: parametres?.email || "",
        site_web: parametres?.site_web || "",
        siret: parametres?.siret || "",
        tva_intra: parametres?.tva_intra || "",
        iban: parametres?.iban || "",
        bic: parametres?.bic || "",
        conditions_paiement: parametres?.conditions_paiement || "Paiement à 30 jours",
        tva_defaut: parametres?.tva_defaut || 20,
        prefixe_devis: parametres?.prefixe_devis || "DEV-",
        prefixe_factures: parametres?.prefixe_factures || "FACT-",
        mentions_legales: parametres?.mentions_legales || "Document généré automatiquement par Transport SaaS",
        couleur_primaire: parametres?.couleur_primaire || "#3b82f6",
        logo_url: parametres?.logo_url || ""
      });

      if (parametres?.logo_url) {
        setLogoPreview(parametres.logo_url);
      }

    } catch (err) {
      setError("Erreur lors du chargement des paramètres: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isReadOnly) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        window.location.href = "/login";
        return;
      }

      // Upload logo if new file selected
      let logoUrl = settings.logo_url;
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `logos/${settings.entreprise_id}-${Date.now()}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('entreprise-logos')
          .upload(fileName, logoFile);

        if (uploadError) {
          throw uploadError;
        }

        logoUrl = uploadData.path;
      }

      // Check if settings already exist
      const { data: existingParams, error: checkError } = await supabase
        .from("parametres_entreprise")
        .select("id")
        .eq("entreprise_id", settings.entreprise_id)
        .single();

      let updateError = null;

      if (existingParams) {
        // Update existing settings
        const { error } = await supabase
          .from("parametres_entreprise")
          .update({
            nom: settings.nom,
            adresse: settings.adresse,
            telephone: settings.telephone,
            email: settings.email,
            site_web: settings.site_web,
            siret: settings.siret,
            tva_intra: settings.tva_intra,
            iban: settings.iban,
            bic: settings.bic,
            conditions_paiement: settings.conditions_paiement,
            tva_defaut: settings.tva_defaut,
            prefixe_devis: settings.prefixe_devis,
            prefixe_factures: settings.prefixe_factures,
            mentions_legales: settings.mentions_legales,
            couleur_primaire: settings.couleur_primaire,
            logo_url: logoUrl
          })
          .eq("id", existingParams.id);

        updateError = error;
      } else {
        // Create new settings
        const { error } = await supabase
          .from("parametres_entreprise")
          .insert({
            entreprise_id: settings.entreprise_id,
            nom: settings.nom,
            adresse: settings.adresse,
            telephone: settings.telephone,
            email: settings.email,
            site_web: settings.site_web,
            siret: settings.siret,
            tva_intra: settings.tva_intra,
            iban: settings.iban,
            bic: settings.bic,
            conditions_paiement: settings.conditions_paiement,
            tva_defaut: settings.tva_defaut,
            prefixe_devis: settings.prefixe_devis,
            prefixe_factures: settings.prefixe_factures,
            mentions_legales: settings.mentions_legales,
            couleur_primaire: settings.couleur_primaire,
            logo_url: logoUrl
          });

        updateError = error;
      }

      if (updateError) {
        throw updateError;
      }

      setSuccess("Paramètres enregistrés avec succès!");
      setTimeout(() => setSuccess(null), 3000);

    } catch (err) {
      setError("Erreur lors de l'enregistrement: " + (err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function handleChange(field: string, value: string | number) {
    setSettings(prev => ({ ...prev, [field]: value }));
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nom de l'entreprise</label>
                <input
                  type="text"
                  value={settings.nom}
                  onChange={(e) => handleChange('nom', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Adresse</label>
                <input
                  type="text"
                  value={settings.adresse}
                  onChange={(e) => handleChange('adresse', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  required
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          {/* Section: Coordonnées */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-6 text-xl font-semibold">Coordonnées</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Téléphone</label>
                <input
                  type="tel"
                  value={settings.telephone}
                  onChange={(e) => handleChange('telephone', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Site web</label>
                <input
                  type="url"
                  value={settings.site_web}
                  onChange={(e) => handleChange('site_web', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          {/* Section: Informations légales */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-6 text-xl font-semibold">Informations légales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">SIRET</label>
                <input
                  type="text"
                  value={settings.siret}
                  onChange={(e) => handleChange('siret', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">TVA Intracommunautaire</label>
                <input
                  type="text"
                  value={settings.tva_intra}
                  onChange={(e) => handleChange('tva_intra', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          {/* Section: Facturation */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-6 text-xl font-semibold">Facturation</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">IBAN</label>
                <input
                  type="text"
                  value={settings.iban}
                  onChange={(e) => handleChange('iban', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">BIC</label>
                <input
                  type="text"
                  value={settings.bic}
                  onChange={(e) => handleChange('bic', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">TVA par défaut (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.tva_defaut}
                  onChange={(e) => handleChange('tva_defaut', parseFloat(e.target.value))}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Délai de paiement</label>
                <input
                  type="text"
                  value={settings.conditions_paiement}
                  onChange={(e) => handleChange('conditions_paiement', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Préfixe devis</label>
                <input
                  type="text"
                  value={settings.prefixe_devis}
                  onChange={(e) => handleChange('prefixe_devis', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Préfixe facture</label>
                <input
                  type="text"
                  value={settings.prefixe_factures}
                  onChange={(e) => handleChange('prefixe_factures', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  required
                  disabled={isReadOnly}
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Mentions légales</label>
                <textarea
                  value={settings.mentions_legales}
                  onChange={(e) => handleChange('mentions_legales', e.target.value)}
                  className="w-full rounded bg-gray-800 p-3 text-white"
                  rows={3}
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </div>

          {/* Section: Branding */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="mb-6 text-xl font-semibold">Branding</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="block w-full text-sm text-gray-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-gray-800 file:text-gray-300
                    hover:file:bg-gray-700"
                  disabled={isReadOnly}
                />
                {logoPreview && (
                  <div className="mt-4">
                    <img src={logoPreview} alt="Logo preview" className="h-20 w-auto" />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Couleur principale</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.couleur_primaire}
                    onChange={(e) => handleChange('couleur_primaire', e.target.value)}
                    className="h-10 w-16 cursor-pointer rounded bg-gray-800"
                    disabled={isReadOnly}
                  />
                  <span>{settings.couleur_primaire}</span>
                </div>
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