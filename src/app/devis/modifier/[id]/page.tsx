"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabase";

export default function ModifierDevisPage() {
  const params = useParams();
  const id = params.id as string;

  const [client, setClient] = useState("");
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

    setEntrepriseId(profil.entreprise_id);
    await chargerDevis();
  }

  async function chargerDevis() {
    const { data, error } = await supabase
      .from("devis")
      .select("*")
      .eq("id", id)
      .eq("entreprise_id", entrepriseId)
      .single();

    if (error || !data) {
      alert("Impossible de charger le devis");
      return;
    }

    setClient(data.client || "");
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
        depart,
        arrivee,
        distance_km: Number(distanceKm),
        poids: Number(poids),
        palettes: Number(palettes),
        date_transport: dateTransport,
        prix: prixTTC,
        prix_ht: prixHT,
        tva,
        prix_ttc: prixTTC,
        statut,
      })
      .eq("id", id);

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
        <input
          type="text"
          placeholder="Client"
          value={client}
          onChange={(e) => setClient(e.target.value)}
          className="w-full rounded bg-gray-800 p-3"
          required
        />

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
  type="text"
  inputMode="numeric"
  placeholder="Distance en km"
  value={distanceKm}
  onChange={(e) => setDistanceKm(e.target.value)}
  className="w-full rounded bg-gray-800 p-3"
  required
/>
        

        <input
          type="number"
          placeholder="Poids en tonnes"
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