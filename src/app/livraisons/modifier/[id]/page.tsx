"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

type Chauffeur = {
  id: string;
  nom: string;
};

type Camion = {
  id: string;
  immatriculation: string;
};

export default function ModifierLivraisonPage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState("");
  const [adresseDepart, setAdresseDepart] = useState("");
  const [adresseArrivee, setAdresseArrivee] = useState("");
  const [chauffeurId, setChauffeurId] = useState("");
  const [camionId, setCamionId] = useState("");
  const [statut, setStatut] = useState("Prévue");

  const [signatureChauffeur, setSignatureChauffeur] = useState("");
  const [signatureDestinataire, setSignatureDestinataire] = useState("");

  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [camions, setCamions] = useState<Camion[]>([]);

  useEffect(() => {
    async function chargerDonnees() {
      // Vérifier la session utilisateur
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (!userId) {
        window.location.href = "/login";
        return;
      }

      // Récupérer l'entreprise_id depuis profils
      const { data: profil, error: profilError } = await supabase
        .from("profils")
        .select("entreprise_id")
        .eq("id", userId)
        .single();

      if (profilError || !profil?.entreprise_id) {
        alert("Entreprise introuvable pour cet utilisateur.");
        return;
      }

      const entrepriseId = profil.entreprise_id;

      const { data: chauffeursData } = await supabase
        .from("chauffeurs")
        .select("id, nom")
        .eq("entreprise_id", entrepriseId);

      const { data: camionsData } = await supabase
        .from("camions")
        .select("id, immatriculation")
        .eq("entreprise_id", entrepriseId);

      const { data: livraisonData, error } = await supabase
        .from("livraisons")
        .select("*")
        .eq("id", id)
        .eq("entreprise_id", entrepriseId)
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      setChauffeurs(chauffeursData || []);
      setCamions(camionsData || []);

      setClient(livraisonData.client || "");
      setAdresseDepart(livraisonData.adresse_depart || "");
      setAdresseArrivee(livraisonData.adresse_arrivee || "");
      setChauffeurId(livraisonData.chauffeur_id || "");
      setCamionId(livraisonData.camion_id || "");
      setStatut(livraisonData.statut || "Prévue");

      setSignatureChauffeur(livraisonData.signature_chauffeur || "");
      setSignatureDestinataire(livraisonData.signature_destinataire || "");
    }

    if (id) chargerDonnees();
  }, [id]);

  async function modifierLivraison(e: React.FormEvent) {
    e.preventDefault();

    const { error } = await supabase
      .from("livraisons")
      .update({
        client,
        adresse_depart: adresseDepart,
        adresse_arrivee: adresseArrivee,
        chauffeur_id: chauffeurId,
        camion_id: camionId,
       statut:
  signatureChauffeur && signatureDestinataire
    ? "Livrée"
    : statut,
        signature_chauffeur: signatureChauffeur,
        signature_destinataire: signatureDestinataire,
        date_signature:
          signatureChauffeur || signatureDestinataire
            ? new Date().toISOString()
            : null,
      })
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/livraisons";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Modifier livraison</h1>

      <a
        href="/livraisons"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Livraisons
      </a>

      <form
        onSubmit={modifierLivraison}
        className="max-w-xl space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-6"
      >
        <input
          type="text"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="text"
          value={adresseDepart}
          onChange={(e) => setAdresseDepart(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="text"
          value={adresseArrivee}
          onChange={(e) => setAdresseArrivee(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <select
          value={chauffeurId}
          onChange={(e) => setChauffeurId(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        >
          <option value="">Choisir un chauffeur</option>
          {chauffeurs.map((chauffeur) => (
            <option key={chauffeur.id} value={chauffeur.id}>
              {chauffeur.nom}
            </option>
          ))}
        </select>

        <select
          value={camionId}
          onChange={(e) => setCamionId(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        >
          <option value="">Choisir un camion</option>
          {camions.map((camion) => (
            <option key={camion.id} value={camion.id}>
              {camion.immatriculation}
            </option>
          ))}
        </select>

        <select
          value={statut}
          onChange={(e) => setStatut(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
        >
          <option>Prévue</option>
          <option>En cours</option>
          <option>Livrée</option>
          <option>Annulée</option>
        </select>

        <div className="rounded border border-gray-700 bg-gray-800 p-4">
          <p className="mb-3 text-lg font-bold">Signatures électroniques</p>

          <input
            type="text"
            placeholder="Signature chauffeur"
            value={signatureChauffeur}
            onChange={(e) => setSignatureChauffeur(e.target.value)}
            className="mb-3 w-full rounded bg-gray-700 p-3"
          />

          <input
            type="text"
            placeholder="Signature destinataire"
            value={signatureDestinataire}
            onChange={(e) => setSignatureDestinataire(e.target.value)}
            className="w-full rounded bg-gray-700 p-3"
          />
        </div>

        <button type="submit" className="rounded bg-blue-600 px-6 py-3">
          Enregistrer les modifications
        </button>
      </form>
    </main>
  );
}