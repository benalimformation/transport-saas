"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { MODULE_PERMISSIONS, isAuthorized } from "../../lib/permissions";
import { getStatusBadgeClass } from "../../lib/statusBadge";

type Livraison = {
  id: string;
  client: string;
  adresse_depart: string;
  adresse_arrivee: string;
  chauffeur_id: string | null;
  camion_id: string | null;
  date_livraison: string | null;
  heure_limite: string | null;
  statut: string | null;
  signature_chauffeur: string | null;
  signature_destinataire: string | null;
  entreprise_id: string | null;
    prix_ht: number | null;
  tva: number | null;
  prix_ttc: number | null;
};

type Chauffeur = {
  id: string;
  nom: string;
};

type Camion = {
  id: string;
  immatriculation: string;
};

export default function LivraisonsPage() {
  const [livraisons, setLivraisons] = useState<Livraison[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [camions, setCamions] = useState<Camion[]>([]);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  useEffect(() => {
    initialiserPage();
  }, []);

  async function initialiserPage() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      window.location.href = "/login";
      return;
    }

    const { data: profil, error: profilError } = await supabase
      .from("profils")
      .select("entreprise_id, role")
      .eq("id", userId)
      .single();

    if (profilError || !profil) {
      alert("Profil utilisateur introuvable.");
      return;
    }

    if (profilError || !profil?.entreprise_id) {
      alert("Entreprise introuvable pour cet utilisateur.");
      return;
    }

    // Vérifier que l'utilisateur a les droits nécessaires
    if (!isAuthorized(profil.role, "livraisons")) {
      alert("Accès refusé. Vous n'avez pas les droits nécessaires pour consulter cette page.");
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 3000);
      return;
    }

    setEntrepriseId(profil.entreprise_id);
    await fetchData(profil.entreprise_id);
  }

  async function fetchData(idEntreprise: string) {
    const { data: livraisonsData, error: livraisonsError } = await supabase
      .from("livraisons")
      .select("*")
      .eq("entreprise_id", idEntreprise)
      .order("date_livraison", { ascending: true });

    if (livraisonsError) {
      alert(livraisonsError.message);
      return;
    }

    const { data: chauffeursData, error: chauffeursError } = await supabase
      .from("Chauffeurs")
      .select("id, nom")
      .eq("entreprise_id", idEntreprise);

    if (chauffeursError) {
      alert(chauffeursError.message);
      return;
    }

    const { data: camionsData, error: camionsError } = await supabase
      .from("camions")
      .select("id, immatriculation")
      .eq("entreprise_id", idEntreprise);

    if (camionsError) {
      alert(camionsError.message);
      return;
    }

    setLivraisons(livraisonsData || []);
    setChauffeurs(chauffeursData || []);
    setCamions(camionsData || []);
  }

  async function supprimerLivraison(id: string) {
    // Vérifier d'abord si la livraison est déjà facturée
    const factureExists = await checkFactureExists(id);
    if (factureExists) {
      alert("❌ Impossible de supprimer une livraison déjà facturée. Supprimez d'abord la facture associée.");
      return;
    }

    if (!confirm("Supprimer cette livraison ?")) return;

    try {
      const { error } = await supabase
        .from("livraisons")
        .delete()
        .eq("id", id)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        throw error;
      }

      setLivraisons((ancienneListe) =>
        ancienneListe.filter((livraison) => livraison.id !== id)
      );
    } catch (err) {
      alert("Erreur suppression : " + (err as Error).message);
    }
  }

  async function changerStatutLivraison(id: string, statut: string) {
    try {
      const { error } = await supabase
        .from("livraisons")
        .update({ statut })
        .eq("id", id)
        .eq("entreprise_id", entrepriseId);

      if (error) {
        throw error;
      }

      if (entrepriseId) {
        fetchData(entrepriseId);
      }
    } catch (err) {
      alert("Erreur lors de la mise à jour: " + (err as Error).message);
    }
  }

  async function checkFactureExists(livraisonId: string): Promise<boolean> {
    if (!entrepriseId) return false;

    const { count, error } = await supabase
      .from("factures")
      .select("*", { count: "exact", head: true })
      .eq("livraison_id", livraisonId)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      console.error("Erreur vérification facture:", error);
      return false;
    }

    return (count || 0) > 0;
  }

  async function creerFactureDepuisLivraison(livraisonId: string) {
    if (!entrepriseId) {
      alert("Entreprise introuvable.");
      return;
    }

    try {
      // Vérifier si une facture existe déjà
      const factureExists = await checkFactureExists(livraisonId);
      if (factureExists) {
        alert("Une facture existe déjà pour cette livraison.");
        return;
      }

      // Récupérer les données de la livraison
      const { data: livraison, error: livraisonError } = await supabase
        .from("livraisons")
        .select("*")
        .eq("id", livraisonId)
        .eq("entreprise_id", entrepriseId)
        .single();

      if (livraisonError || !livraison) {
        alert("Livraison introuvable.");
        return;
      }

      // Créer la facture avec les données de la livraison
      const numero = `FAC-${Date.now()}`;
      const { error: factureError } = await supabase
        .from("factures")
        .insert([
          {
            numero,
            entreprise_id: livraison.entreprise_id,
            livraison_id: livraison.id,
            client: livraison.client,
            montant_ht: livraison.prix_ht || 0,
            tva: livraison.tva || 0,
            montant_ttc: livraison.prix_ttc || 0,
            statut: "Non payée",
            date_facture: new Date().toISOString().split("T")[0],
            date_echeance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // 30 jours plus tard
          },
        ]);

      if (factureError) {
        alert("Erreur lors de la création de la facture: " + factureError.message);
        return;
      }

      // Rediriger vers la page des factures
      window.location.href = "/factures";

    } catch (err) {
      alert("Erreur lors de la création de la facture: " + (err as Error).message);
    }
  }

  async function getFactureForLivraison(livraisonId: string): Promise<{ exists: boolean; factureId?: string; numero?: string }> {
    if (!entrepriseId) return { exists: false };

    try {
      const { data, error } = await supabase
        .from("factures")
        .select("id, numero")
        .eq("livraison_id", livraisonId)
        .eq("entreprise_id", entrepriseId)
        .single();

      if (error || !data) {
        return { exists: false };
      }

      return {
        exists: true,
        factureId: data.id,
        numero: data.numero || `FAC-${data.id.slice(0, 8).toUpperCase()}`
      };
    } catch (err) {
      console.error("Erreur vérification facture:", err);
      return { exists: false };
    }
  }


  function nomChauffeur(id: string | null) {
    if (!id) return "Non affecté";
    return chauffeurs.find((chauffeur) => chauffeur.id === id)?.nom || "Non affecté";
  }

  function immatriculationCamion(id: string | null) {
    if (!id) return "Non affecté";
    return camions.find((camion) => camion.id === id)?.immatriculation || "Non affecté";
  }

  function formatDate(date: string | null) {
    if (!date) return "Non renseignée";
    return new Date(date).toLocaleDateString("fr-FR");
  }

  function formatHeure(heure: string | null) {
    if (!heure) return "Non renseignée";
    return heure.slice(0, 5);
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Livraisons</h1>

      <a href="/dashboard" className="mb-6 inline-block rounded bg-gray-700 px-4 py-2">
        ← Retour Dashboard
      </a>

      <br />

      <a href="/livraisons/nouveau" className="mb-8 inline-block rounded bg-green-600 px-4 py-2">
        + Nouvelle livraison
      </a>

      <div className="rounded-xl border border-gray-800 bg-gray-900 p-6">
        {livraisons.length === 0 ? (
          <div className="text-center py-12">
            <div className="mb-4 text-6xl">🚛</div>
            <h3 className="text-xl font-bold mb-2">Aucune livraison</h3>
            <p className="text-gray-400 mb-6">Les livraisons créées seront visibles ici.</p>
            <a
              href="/livraisons/nouveau"
              className="inline-block rounded bg-green-600 px-6 py-3 hover:bg-green-700"
            >
              Créer une livraison
            </a>
          </div>
        ) : (
          livraisons.map((livraison) => (
            <div key={livraison.id} className="border-b border-gray-800 py-5">
              <p className="text-2xl font-bold">
                {livraison.client || "Client non renseigné"}
              </p>

              {/* Liens vers documents associés */}
              <div className="mb-2 flex gap-3 text-sm">
                {/* Lien vers facture si disponible */}
                {livraison.statut === "Livrée" && (
                  <button
                    onClick={async () => {
                      const result = await getFactureForLivraison(livraison.id);
                      if (result.exists && result.factureId) {
                        window.location.href = `/factures`;
                      }
                    }}
                    className="text-green-400 hover:text-green-300"
                  >
                    💰 Facture
                  </button>
                )}
              </div>

              <p>
                Trajet : {livraison.adresse_depart || "Non renseigné"} →
                {livraison.adresse_arrivee || "Non renseigné"}
              </p>

              <p>Date : {formatDate(livraison.date_livraison)}</p>
              <p>Heure limite : {formatHeure(livraison.heure_limite)}</p>
              <p>Chauffeur : {nomChauffeur(livraison.chauffeur_id)}</p>
              <p>Camion : {immatriculationCamion(livraison.camion_id)}</p>
<p>Prix HT : {livraison.prix_ht ?? 0} €</p>
<p>TVA : {livraison.tva ?? 0} €</p>
<p className="font-bold text-green-400">
  Prix TTC : {livraison.prix_ttc ?? 0} €
</p>
              <div className="mt-2 flex items-center gap-3">
                <span className={getStatusBadgeClass(livraison.statut || "Prévue")}>
                  {livraison.statut || "Prévue"}
                </span>
              </div>

              {livraison.signature_chauffeur && livraison.signature_destinataire ? (
                <p className="mt-1 font-bold text-green-500">✓ Livraison signée</p>
              ) : (
                <p className="mt-1 font-bold text-orange-400">⏳ En attente de signature</p>
              )}

              <button
                onClick={() => supprimerLivraison(livraison.id)}
                className="mt-3 rounded bg-red-600 px-4 py-2"
              >
                Supprimer
              </button>

              <a
                href={`/livraisons/modifier/${livraison.id}`}
                className="ml-3 inline-block rounded bg-blue-600 px-4 py-2"
              >
                Modifier
              </a>

              <button
                type="button"
                onClick={() =>
                  window.open(`/api/livraisons/pdf/${livraison.id}?t=${Date.now()}`, "_blank")
                }
                className="ml-3 rounded bg-purple-600 px-4 py-2"
              >
                Bon transport PDF
              </button>

              <button
                type="button"
                onClick={() =>
                  window.open(`/api/livraisons/cmr/${livraison.id}?t=${Date.now()}`, "_blank")
                }
                className="ml-3 rounded bg-yellow-600 px-4 py-2"
              >
                CMR PDF
              </button>

              {livraison.statut === "Prévue" && (
                <button
                  onClick={() => changerStatutLivraison(livraison.id, "En cours")}
                  className="ml-3 rounded bg-orange-500 px-4 py-2"
                >
                  Démarrer
                </button>
              )}

              {livraison.statut === "En cours" && (
                <button
                  onClick={() => changerStatutLivraison(livraison.id, "Livrée")}
                  className="ml-3 rounded bg-green-600 px-4 py-2"
                >
                  Terminer
                </button>
              )}

              {livraison.statut === "Livrée" && (
                <button
                  onClick={() => creerFactureDepuisLivraison(livraison.id)}
                  className="ml-3 rounded bg-purple-600 px-4 py-2"
                >
                  Créer la facture
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </main>
  );
}