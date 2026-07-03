import { supabase } from "./supabase";

/**
 * Fetch company parameters for document generation
 * @param entrepriseId - The company ID (from profils.entreprise_id)
 * @returns Company parameters or null if not found
 */
export async function getCompanyParams(entrepriseId: string) {
  const { data: params, error } = await supabase
    .from("parametres_entreprise")
    .select("*")
    .eq("entreprise_id", entrepriseId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      // No parameters found, return null
      return null;
    }
    console.error("Error fetching company parameters:", error);
    return null;
  }

  return {
    nom: params.nom || "TRANSPORT SAAS",
    adresse: params.adresse || "",
    telephone: params.telephone || "",
    email: params.email || "",
    site_web: params.site_web || "",
    siret: params.siret || "",
    tva_intra: params.tva_intra || "",
    iban: params.iban || "",
    bic: params.bic || "",
    conditions_paiement: params.conditions_paiement || "Paiement à 30 jours",
    tva_defaut: params.tva_defaut || 20,
    prefixe_factures: params.prefixe_factures || "FACT-",
    mentions_legales: params.mentions_legales || "Document généré automatiquement par Transport SaaS",
    couleur_primaire: params.couleur_primaire || "#3b82f6",
    logo_url: params.logo_url || ""
  };
}

/**
 * Get logo buffer from storage URL
 * @param logoUrl - The logo URL from storage
 * @returns Buffer with logo data or null
 */
export async function getLogoBuffer(logoUrl: string): Promise<Buffer | null> {
  if (!logoUrl) return null;

  try {
    const { data, error } = await supabase
      .storage
      .from('entreprise-logos')
      .download(logoUrl);

    if (error) {
      console.error("Error downloading logo:", error);
      return null;
    }

    return Buffer.from(await data.arrayBuffer());
  } catch (err) {
    console.error("Error getting logo buffer:", err);
    return null;
  }
}