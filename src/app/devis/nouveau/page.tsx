"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

type Client = {
  id: string;
  nom: string;
};

export default function NouveauDevisPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [poids, setPoids] = useState("");
  const [palettes, setPalettes] = useState("");
  const [dateTransport, setDateTransport] = useState("");

  const [prixHT, setPrixHT] = useState(0);
  const [tva, setTVA] = useState(0);
  const [prixTTC, setPrixTTC] = useState(0);
  const [loading, setLoading] = useState(false);

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

    const { data: profil, error } = await supabase
      .from("profils")
      .select("entreprise_id")
      .eq("id", userId)
      .single();

    if (error || !profil?.entreprise_id) {
      alert("Entreprise introuvable.");
      return;
    }

    setEntrepriseId(profil.entreprise_id);
    chargerClients(profil.entreprise_id);
  }

  async function chargerClients(idEntreprise: string) {
    const { data, error } = await supabase
      .from("clients")
      .select("id, nom")
      .eq("entreprise_id", idEntreprise)
      .order("nom", { ascending: true });

    if (error) {
      alert(error.message);
      return;
    }

    setClients(data || []);
  }

  function calculerPrix() {
    const distance = parseFloat(distanceKm.replace(",", ".")) || 0;
    const poidsTonnes = parseFloat(poids.replace(",", ".")) || 0;
    const nbPalettes = parseFloat(palettes.replace(",", ".")) || 0;

    const priseEnCharge = 80;
    const prixKm = 1.2;
    const prixTonne = 5;
    const prixPalette = 15;

    const ht =
      priseEnCharge +
      distance * prixKm +
      poidsTonnes * prixTonne +
      nbPalettes * prixPalette;

    const montantTVA = ht * 0.2;
    const ttc = ht + montantTVA;

    setPrixHT(ht);
    setTVA(montantTVA);
    setPrixTTC(ttc);
  }

  async function creerDevis(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;

    if (!entrepriseId) {
      alert("Entreprise introuvable.");
      return;
    }

    if (prixTTC === 0) {
      calculerPrix();
      alert("Clique sur Calculer le prix avant de créer le devis.");
      return;
    }

    setLoading(true);

    const clientSelectionne = clients.find((client) => client.id === clientId);

    const { error } = await supabase.from("devis").insert([
      {
        client_id: clientId,
        client: clientSelectionne?.nom || "",
        depart,
        arrivee,
        distance_km: parseFloat(distanceKm.replace(",", ".")) || 0,
        poids: parseFloat(poids.replace(",", ".")) || 0,
        palettes: parseFloat(palettes.replace(",", ".")) || 0,
        date_transport: dateTransport,
        prix: prixTTC,
        prix_ht: prixHT,
        tva,
        prix_ttc: prixTTC,
        statut: "Brouillon",
        entreprise_id: entrepriseId,
      },
    ]);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/devis";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Nouveau devis</h1>

      <a
        href="/devis"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Devis
      </a>

      <form
        onSubmit={creerDevis}
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
          placeholder="Départ"
          value={depart}
          onChange={(e) => setDepart(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="text"
          placeholder="Arrivée"
          value={arrivee}
          onChange={(e) => setArrivee(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="number"
          placeholder="Distance (km)"
          value={distanceKm}
          onChange={(e) => setDistanceKm(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="number"
          placeholder="Poids (tonnes)"
          value={poids}
          onChange={(e) => setPoids(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="number"
          placeholder="Nombre de palettes"
          value={palettes}
          onChange={(e) => setPalettes(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <input
          type="date"
          value={dateTransport}
          onChange={(e) => setDateTransport(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

        <button
          type="button"
          onClick={calculerPrix}
          className="rounded bg-blue-600 px-4 py-3"
        >
          Calculer le prix
        </button>

        <div className="rounded bg-gray-800 p-4">
          <p>Prix HT : {prixHT.toFixed(2)} €</p>
          <p>TVA 20 % : {tva.toFixed(2)} €</p>
          <p className="text-xl font-bold text-green-400">
            Prix TTC : {prixTTC.toFixed(2)} €
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="rounded bg-green-600 px-6 py-3 disabled:opacity-50"
        >
          {loading ? "Création..." : "Créer le devis"}
        </button>
      </form>
    </main>
  );
}