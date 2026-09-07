"use client";

import { useEffect, useState } from "react";
import { createClient } from "../../../lib/supabase/client";

type Client = {
  id: string;
  nom: string;
};

export default function NouveauDevisPage() {
  const supabase = createClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [poids, setPoids] = useState("");
  const [palettes, setPalettes] = useState("");
  const [dateTransport, setDateTransport] = useState("");
    // Informations contractuelles du devis
  const [referenceClient, setReferenceClient] = useState("");
const [validiteJusquAu, setValiditeJusquAu] = useState(() => {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split("T")[0];
});
  // Marchandise
  const [natureMarchandise, setNatureMarchandise] = useState("");
  const [nombreColis, setNombreColis] = useState("");
  const [volumeM3, setVolumeM3] = useState("");

  // Expéditeur
  const [expediteurNom, setExpediteurNom] = useState("");
  const [expediteurAdresse, setExpediteurAdresse] = useState("");

  // Destinataire
  const [destinataireNom, setDestinataireNom] = useState("");
  const [destinataireAdresse, setDestinataireAdresse] = useState("");

  // Chargement / déchargement
  const [dateChargement, setDateChargement] = useState("");
  const [heureChargement, setHeureChargement] = useState("");
  const [dateDechargement, setDateDechargement] = useState("");
  const [heureDechargement, setHeureDechargement] = useState("");

  // Conditions particulières
  const [prestationsAnnexes, setPrestationsAnnexes] = useState("");
  const [conditionsParticulieres, setConditionsParticulieres] = useState("");

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
       depart: expediteurAdresse || depart,
arrivee: destinataireAdresse || arrivee,
        distance_km: parseFloat(distanceKm.replace(",", ".")) || 0,
        poids: parseFloat(poids.replace(",", ".")) || 0,
        palettes: parseFloat(palettes.replace(",", ".")) || 0,
        date_transport: dateChargement || dateTransport,
        validite_jusqu_au: validiteJusquAu || null,
reference_client: referenceClient || null,
nature_marchandise: natureMarchandise || null,
nombre_colis: nombreColis ? parseInt(nombreColis, 10) : null,
volume_m3: volumeM3 ? parseFloat(volumeM3.replace(",", ".")) : null,

expediteur_nom: expediteurNom || null,
expediteur_adresse: expediteurAdresse || null,

destinataire_nom: destinataireNom || null,
destinataire_adresse: destinataireAdresse || null,

date_chargement: dateChargement || null,
heure_chargement: heureChargement || null,

date_dechargement: dateDechargement || null,
heure_dechargement: heureDechargement || null,

prestations_annexes: prestationsAnnexes || null,
conditions_particulieres: conditionsParticulieres || null,
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

    window.location.href = "/dashboard";
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
        <label className="mb-1 block text-sm font-medium text-gray-300">
  Client
</label>
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
        <div className="border-t border-gray-700 pt-4">
  <h2 className="mb-3 text-xl font-semibold">Informations du devis</h2>

<label className="mb-1 block text-sm font-medium text-gray-300">
  Référence client / bon de commande
  <span className="ml-1 text-gray-500">(facultatif)</span>
</label>
<input
  type="text"
  value={referenceClient}
  onChange={(e) => setReferenceClient(e.target.value)}
  className="mb-3 w-full rounded bg-gray-800 p-3"
/>

  <label className="mb-1 block text-sm text-gray-300">
    Devis valable jusqu'au
  </label>
  <input
    type="date"
    value={validiteJusquAu}
    onChange={(e) => setValiditeJusquAu(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
  />
</div>
<div className="border-t border-gray-700 pt-4">
  <h2 className="mb-3 text-xl font-semibold">Marchandise</h2>

  <label className="mb-1 block text-sm font-medium text-gray-300">
  Nature de la marchandise
</label>
<input
  type="text"
  value={natureMarchandise}
  onChange={(e) => setNatureMarchandise(e.target.value)}
  className="mb-3 w-full rounded bg-gray-800 p-3"
/>

<label className="mb-1 block text-sm font-medium text-gray-300">
  Nombre de colis
  <span className="ml-1 text-gray-500">(facultatif)</span>
</label>
<input
  type="number"
  min="0"
  value={nombreColis}
  onChange={(e) => setNombreColis(e.target.value)}
  className="mb-3 w-full rounded bg-gray-800 p-3"
/>

<label className="mb-1 block text-sm font-medium text-gray-300">
  Volume total (m³)
  <span className="ml-1 text-gray-500">(facultatif)</span>
</label>
<input
  type="number"
  min="0"
  step="0.001"
  value={volumeM3}
  onChange={(e) => setVolumeM3(e.target.value)}
  className="w-full rounded bg-gray-800 p-3"
/>
</div>
<div className="border-t border-gray-700 pt-4">
  <h2 className="mb-3 text-xl font-semibold">Expéditeur</h2>

 <label className="mb-1 block text-sm font-medium text-gray-300">
  Nom ou raison sociale de l'expéditeur
</label>
<input
  type="text"
  value={expediteurNom}
  onChange={(e) => setExpediteurNom(e.target.value)}
  className="mb-3 w-full rounded bg-gray-800 p-3"
/>

<label className="mb-1 block text-sm font-medium text-gray-300">
  Adresse de chargement
</label>
<textarea
  value={expediteurAdresse}
  onChange={(e) => setExpediteurAdresse(e.target.value)}
  className="w-full rounded bg-gray-800 p-3"
  rows={3}
/>
</div>

<div className="border-t border-gray-700 pt-4">
  <h2 className="mb-3 text-xl font-semibold">Destinataire</h2>

  <label className="mb-1 block text-sm font-medium text-gray-300">
  Nom ou raison sociale du destinataire
</label>
<input
  type="text"
  value={destinataireNom}
  onChange={(e) => setDestinataireNom(e.target.value)}
  className="mb-3 w-full rounded bg-gray-800 p-3"
/>

<label className="mb-1 block text-sm font-medium text-gray-300">
  Adresse de livraison
</label>
<textarea
  value={destinataireAdresse}
  onChange={(e) => setDestinataireAdresse(e.target.value)}
  className="w-full rounded bg-gray-800 p-3"
  rows={3}
/>
</div>





       <div className="border-t border-gray-700 pt-4">
  <h2 className="mb-3 text-xl font-semibold">
    Caractéristiques du transport
  </h2>

  <label className="mb-1 block text-sm font-medium text-gray-300">
    Distance (km)
  </label>
  <input
    type="number"
    value={distanceKm}
    onChange={(e) => setDistanceKm(e.target.value)}
    className="mb-3 w-full rounded bg-gray-800 p-3"
    required
  />

  <label className="mb-1 block text-sm font-medium text-gray-300">
    Poids total (tonnes)
  </label>
  <input
    type="number"
    value={poids}
    onChange={(e) => setPoids(e.target.value)}
    className="mb-3 w-full rounded bg-gray-800 p-3"
    required
  />

  <label className="mb-1 block text-sm font-medium text-gray-300">
    Nombre de palettes
  </label>
  <input
    type="number"
    value={palettes}
    onChange={(e) => setPalettes(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
    required
  />
</div>


        <div className="border-t border-gray-700 pt-4">
  <h2 className="mb-3 text-xl font-semibold">
    Chargement et déchargement
  </h2>

  <label className="mb-1 block text-sm text-gray-300">
    Date et heure de chargement
  </label>
  <div className="mb-3 grid grid-cols-2 gap-3">
    <input
      type="date"
      value={dateChargement}
      onChange={(e) => setDateChargement(e.target.value)}
      className="w-full rounded bg-gray-800 p-3"
    />

    <input
      type="time"
      value={heureChargement}
      onChange={(e) => setHeureChargement(e.target.value)}
      className="w-full rounded bg-gray-800 p-3"
    />
  </div>

  <label className="mb-1 block text-sm text-gray-300">
    Date et heure de déchargement
  </label>
  <div className="grid grid-cols-2 gap-3">
    <input
      type="date"
      value={dateDechargement}
      onChange={(e) => setDateDechargement(e.target.value)}
      className="w-full rounded bg-gray-800 p-3"
    />

    <input
      type="time"
      value={heureDechargement}
      onChange={(e) => setHeureDechargement(e.target.value)}
      className="w-full rounded bg-gray-800 p-3"
    />
  </div>
</div>
<div className="border-t border-gray-700 pt-4">
  <h2 className="mb-3 text-xl font-semibold">
    Prestations et conditions particulières
  </h2>

 <label className="mb-1 block text-sm font-medium text-gray-300">
  Prestations annexes
  <span className="ml-1 text-gray-500">(facultatif)</span>
</label>
<textarea
  placeholder="Ex. manutention, hayon, attente, ADR..."
  value={prestationsAnnexes}
  onChange={(e) => setPrestationsAnnexes(e.target.value)}
  className="mb-3 w-full rounded bg-gray-800 p-3"
  rows={3}
/>

<label className="mb-1 block text-sm font-medium text-gray-300">
  Conditions particulières du transport
  <span className="ml-1 text-gray-500">(facultatif)</span>
</label>
<textarea
  value={conditionsParticulieres}
  onChange={(e) => setConditionsParticulieres(e.target.value)}
  className="w-full rounded bg-gray-800 p-3"
  rows={3}

  />
</div>
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
