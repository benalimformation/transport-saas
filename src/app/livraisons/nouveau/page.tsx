"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { Suspense } from "react";
type Client = {
  id: string;
  nom: string;
};

type Chauffeur = {
  id: string;
  nom: string;
};

type Camion = {
  id: string;
  immatriculation: string;
};
function NouvelleLivraisonForm() {
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
  const [adresseDepart, setAdresseDepart] = useState("");
  const [adresseArrivee, setAdresseArrivee] = useState("");
  const [chauffeurId, setChauffeurId] = useState("");
  const [camionId, setCamionId] = useState("");
  const [dateLivraison, setDateLivraison] = useState("");
  const [heureLimite, setHeureLimite] = useState("");
  const [statut, setStatut] = useState("Prévue");
const [prixHT, setPrixHT] = useState(0);
const [tva, setTVA] = useState(0);
const [prixTTC, setPrixTTC] = useState(0);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [camions, setCamions] = useState<Camion[]>([]);
  const [loading, setLoading] = useState(false);

  const searchParams = useSearchParams();
  const devisId = searchParams.get("devis");

  useEffect(() => {
    initialiserPage();
  }, []);

  useEffect(() => {
    if (devisId && clients.length > 0 && entrepriseId) {
      chargerDevis(devisId, entrepriseId);
    }
  }, [devisId, clients, entrepriseId]);

  async function initialiserPage() {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      window.location.href = "/login";
      return;
    }

    const { data: profil, error: profilError } = await supabase
      .from("profils")
      .select("entreprise_id")
      .eq("id", userId)
      .single();

    if (profilError || !profil?.entreprise_id) {
      alert("Entreprise introuvable pour cet utilisateur.");
      return;
    }

    setEntrepriseId(profil.entreprise_id);
    chargerDonnees(profil.entreprise_id);
  }

  async function chargerDonnees(idEntreprise: string) {
    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, nom")
      .eq("entreprise_id", idEntreprise)
      .order("nom", { ascending: true });

    const { data: chauffeursData } = await supabase
      .from("Chauffeurs")
      .select("id, nom")
      .eq("entreprise_id", idEntreprise)
      .order("nom", { ascending: true });

    const { data: camionsData } = await supabase
      .from("camions")
      .select("id, immatriculation")
      .eq("entreprise_id", idEntreprise)
      .order("immatriculation", { ascending: true });

    setClients(clientsData || []);
    setChauffeurs(chauffeursData || []);
    setCamions(camionsData || []);
  }

  async function chargerDevis(id: string, idEntreprise: string) {
    const { data, error } = await supabase
      .from("devis")
      .select("*")
      .eq("id", id)
      .eq("entreprise_id", idEntreprise)
      .single();

    if (error || !data) return;

    const client = clients.find(
      (c) => c.nom.toLowerCase() === data.client?.toLowerCase()
    );

    if (client) {
      setClientId(client.id);
    }

    setAdresseDepart(data.depart || "");
    setAdresseArrivee(data.arrivee || "");
setPrixHT(data.prix_ht || 0);
setTVA(data.tva || 0);
setPrixTTC(data.prix_ttc || 0);
    if (data.date_transport) {
      setDateLivraison(data.date_transport);
    }

    setPrixHT(Number(data.prix_ht || 0));
    setTVA(Number(data.tva || 0));
    setPrixTTC(Number(data.prix_ttc || data.prix || 0));
  }

  async function ajouterLivraison(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    if (!entrepriseId) {
      alert("Entreprise introuvable.");
      return;
    }

    setLoading(true);

    const clientSelectionne = clients.find((client) => client.id === clientId);

    const { error } = await supabase.from("livraisons").insert([
      {
        client_id: clientId,
        client: clientSelectionne?.nom || "",
        adresse_depart: adresseDepart,
        adresse_arrivee: adresseArrivee,
        chauffeur_id: chauffeurId,
        camion_id: camionId,
        date_livraison: dateLivraison,
        heure_limite: heureLimite,
        statut,
        entreprise_id: entrepriseId,
        prix_ht: prixHT,
        tva: tva,
        prix_ttc: prixTTC,
      },
    ]);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Nouvelle livraison</h1>

      <a
        href="/livraisons"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Livraisons
      </a>

      <form
        onSubmit={ajouterLivraison}
        className="max-w-xl space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-6"
      >
        <select
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        >
          <option value="">Choisir un client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.nom}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Adresse de départ"
          value={adresseDepart}
          onChange={(e) => setAdresseDepart(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="text"
          placeholder="Adresse d'arrivée"
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

        <input
          type="date"
          value={dateLivraison}
          onChange={(e) => setDateLivraison(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="time"
          value={heureLimite}
          onChange={(e) => setHeureLimite(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

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

        <div className="rounded bg-gray-800 p-4">
          <p>Prix HT : {prixHT.toFixed(2)} €</p>
          <p>TVA : {tva.toFixed(2)} €</p>
          <p className="font-bold text-green-400">
            Prix TTC : {prixTTC.toFixed(2)} €
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-green-600 px-6 py-3 disabled:opacity-50"
        >
          {loading ? "Création..." : "Créer la livraison"}
        </button>
      </form>
    </main>
  );
}
export default function NouvelleLivraisonPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-gray-950 p-10 text-white">Chargement...</main>}>
      <NouvelleLivraisonForm />
    </Suspense>
  );
}