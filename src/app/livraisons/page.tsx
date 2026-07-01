"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

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
    const authorizedRoles = ["super_admin", "admin", "exploitant", "chauffeur"];
    if (!authorizedRoles.includes(profil.role)) {
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
          <p className="text-gray-400">Aucune livraison pour cette entreprise.</p>
        ) : (
          livraisons.map((livraison) => (
            <div key={livraison.id} className="border-b border-gray-800 py-5">
              <p className="text-2xl font-bold">
                {livraison.client || "Client non renseigné"}
              </p>

              <p>
                Trajet : {livraison.adresse_depart || "Non renseigné"} →{" "}
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
              <p className="mt-2 text-green-400">
                Statut : {livraison.statut || "Prévue"}
              </p>

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
            </div>
          ))
        )}
      </div>
    </main>
  );
}