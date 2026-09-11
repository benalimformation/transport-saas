"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

export default function ModifierDevisPage() {
  const supabase = createClient();
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState("");
  const [referenceClient, setReferenceClient] = useState("");
const [validiteJusquAu, setValiditeJusquAu] = useState("");
const [natureMarchandise, setNatureMarchandise] = useState("");
const [nombreColis, setNombreColis] = useState("");
const [volumeM3, setVolumeM3] = useState("");
const [expediteurNom, setExpediteurNom] = useState("");
const [expediteurAdresse, setExpediteurAdresse] = useState("");
const [destinataireNom, setDestinataireNom] = useState("");
const [destinataireAdresse, setDestinataireAdresse] = useState("");
const [dateChargement, setDateChargement] = useState("");
const [heureChargement, setHeureChargement] = useState("");
const [dateDechargement, setDateDechargement] = useState("");
const [heureDechargement, setHeureDechargement] = useState("");
const [prestationsAnnexes, setPrestationsAnnexes] = useState("");
const [conditionsParticulieres, setConditionsParticulieres] = useState("");
  const [depart, setDepart] = useState("");
  const [arrivee, setArrivee] = useState("");
  const [distanceKm, setDistanceKm] = useState("");
  const [poids, setPoids] = useState("");
  const [palettes, setPalettes] = useState("");
  const [dateTransport, setDateTransport] = useState("");
  const [statut, setStatut] = useState("Brouillon");
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  const [prixHT, setPrixHT] = useState(0);
  const [tva, setTVA] = useState(0);
  const [prixTTC, setPrixTTC] = useState(0);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (id) {
      initialiserPage();
    }
  }, [id]);

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

    const entrepriseIdValue = profil.entreprise_id;
    setEntrepriseId(entrepriseIdValue);
    await chargerDevis(entrepriseIdValue);
  }

  async function chargerDevis(entrepriseIdValue: string) {
    if (!entrepriseIdValue) {
      alert("Entreprise introuvable.");
      return;
    }

    const { data, error } = await supabase
      .from("devis")
      .select("*")
      .eq("id", id)
      .eq("entreprise_id", entrepriseIdValue)
      .single();

    if (error || !data) {
      alert("Impossible de charger le devis");
      return;
    }

    setClient(data.client || "");
    setReferenceClient(data.reference_client || "");
setValiditeJusquAu(data.validite_jusqu_au || "");
setNatureMarchandise(data.nature_marchandise || "");
setNombreColis(String(data.nombre_colis ?? ""));
setVolumeM3(String(data.volume_m3 ?? ""));
setExpediteurNom(data.expediteur_nom || "");
setExpediteurAdresse(data.expediteur_adresse || "");
setDestinataireNom(data.destinataire_nom || "");
setDestinataireAdresse(data.destinataire_adresse || "");
setDateChargement(data.date_chargement || "");
setHeureChargement(data.heure_chargement || "");
setDateDechargement(data.date_dechargement || "");
setHeureDechargement(data.heure_dechargement || "");
setPrestationsAnnexes(data.prestations_annexes || "");
setConditionsParticulieres(data.conditions_particulieres || "");
    setDepart(data.depart || "");
    setArrivee(data.arrivee || "");
    setDistanceKm(String(data.distance_km || ""));
    setPoids(String(data.poids || "")); 
    setPalettes(String(data.palettes || ""));
    setDateTransport(data.date_transport || "");
    setStatut(data.statut || "Brouillon");

    setPrixHT(Number(data.prix_ht || 0));
    setTVA(Number(data.tva || 0));
    setPrixTTC(Number(data.prix_ttc || data.prix || 0));
  }

  function recalculerPrix() {
    const distance = Number(distanceKm || 0);
    const poidsTonnes = Number(poids || 0);
    const nbPalettes = Number(palettes || 0);

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

  async function modifierDevis(e: React.FormEvent) {
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    const { error } = await supabase
      .from("devis")
      .update({
  client,
  reference_client: referenceClient || null,
  validite_jusqu_au: validiteJusquAu || null,
  nature_marchandise: natureMarchandise || null,
  nombre_colis: nombreColis ? parseInt(nombreColis, 10) : null,
  volume_m3: volumeM3 ? parseFloat(volumeM3) : null,
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
  depart: expediteurAdresse || depart,
  arrivee: destinataireAdresse || arrivee,
  distance_km: Number(distanceKm),
  poids: Number(poids),
  palettes: Number(palettes),
  date_transport: dateChargement || dateTransport,
  prix: prixTTC,
  prix_ht: prixHT,
  tva,
  prix_ttc: prixTTC,
  statut,
})
     .eq("id", id)
.eq("entreprise_id", entrepriseId);

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/devis";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">Modifier devis</h1>

      <a
        href="/devis"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Devis
      </a>

      <form
        onSubmit={modifierDevis}
        className="max-w-xl space-y-4 rounded-xl border border-gray-800 bg-gray-900 p-6"
      >
        <div>
  <label className="mb-2 block text-sm text-gray-300">Client</label>
  <input
    type="text"
    value={client}
    onChange={(e) => setClient(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
    required
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">
    Référence client
  </label>
  <input
    type="text"
    value={referenceClient}
    onChange={(e) => setReferenceClient(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">
    Validité du devis
  </label>
  <input
    type="date"
    value={validiteJusquAu}
    onChange={(e) => setValiditeJusquAu(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">
    Nature de la marchandise
  </label>
  <input
    type="text"
    value={natureMarchandise}
    onChange={(e) => setNatureMarchandise(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">
    Nombre de colis
  </label>
  <input
    type="number"
    value={nombreColis}
    onChange={(e) => setNombreColis(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">
    Volume (m³)
  </label>
  <input
    type="number"
    step="0.01"
    value={volumeM3}
    onChange={(e) => setVolumeM3(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">
    Nom de l&apos;expéditeur
  </label>
  <input
    type="text"
    value={expediteurNom}
    onChange={(e) => setExpediteurNom(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">
    Adresse de l&apos;expéditeur
  </label>
  <input
    type="text"
    value={expediteurAdresse}
    onChange={(e) => setExpediteurAdresse(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">
    Nom du destinataire
  </label>
  <input
    type="text"
    value={destinataireNom}
    onChange={(e) => setDestinataireNom(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">
    Adresse du destinataire
  </label>
  <input
    type="text"
    value={destinataireAdresse}
    onChange={(e) => setDestinataireAdresse(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">Chargement</label>
  <div className="grid grid-cols-2 gap-4">
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
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">Déchargement</label>
  <div className="grid grid-cols-2 gap-4">
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

<div>
  <label className="mb-2 block text-sm text-gray-300">
    Prestations annexes
  </label>
  <textarea
    value={prestationsAnnexes}
    onChange={(e) => setPrestationsAnnexes(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
    rows={3}
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">
    Conditions particulières
  </label>
  <textarea
    value={conditionsParticulieres}
    onChange={(e) => setConditionsParticulieres(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
    rows={3}
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">
    Distance (km)
  </label>
  <input
    type="text"
    inputMode="numeric"
    value={distanceKm}
    onChange={(e) => setDistanceKm(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
    required
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">
    Poids (tonnes)
  </label>
  <input
    type="number"
    value={poids}
    onChange={(e) => setPoids(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
    required
  />
</div>

<div>
  <label className="mb-2 block text-sm text-gray-300">
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

<div>
  <label className="mb-2 block text-sm text-gray-300">Statut</label>
  <select
    value={statut}
    onChange={(e) => setStatut(e.target.value)}
    className="w-full rounded bg-gray-800 p-3"
  >
    <option>Brouillon</option>
    <option>Envoyé</option>
    <option>Accepté</option>
    <option>Refusé</option>
  </select>
</div>

        <button
          type="button"
          onClick={recalculerPrix}
          className="rounded bg-blue-600 px-4 py-3"
        >
          Recalculer le prix
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
          disabled={loading || prixTTC === 0}
          className="rounded bg-green-600 px-6 py-3 disabled:opacity-50"
        >
          {loading ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </form>
    </main>
  );
}