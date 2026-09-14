"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "../../../lib/supabase/client";
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
  const supabase = createClient();
  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
  const [expediteur, setExpediteur] = useState("");
  const [datePriseEnCharge, setDatePriseEnCharge] = useState("");
  const [adresseDepart, setAdresseDepart] = useState("");
  const [paysDepart, setPaysDepart] = useState("France");
  const [paysArrivee, setPaysArrivee] = useState("France");
  const [adresseArrivee, setAdresseArrivee] = useState("");

  const [destinataire, setDestinataire] = useState("");
  const [marchandises, setMarchandises] = useState("");
  const [nombreColis, setNombreColis] = useState("");
  const [emballage, setEmballage] = useState("");
  const [poidsBrut, setPoidsBrut] = useState("");
  const [volume, setVolume] = useState("");
  const [reserves, setReserves] = useState("");
  const [documentsAnnexes, setDocumentsAnnexes] = useState("");
  const [instructionsCmr, setInstructionsCmr] = useState("");
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
    setExpediteur(data.expediteur_nom || "");
setDatePriseEnCharge(data.date_chargement || data.date_transport || "");
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

    if (
      datePriseEnCharge &&
      dateLivraison &&
      dateLivraison < datePriseEnCharge
    ) {
      alert(
        "La date de livraison ne peut pas être antérieure à la date de prise en charge."
      );
      return;
    }

    if (!entrepriseId) {
      alert("Entreprise introuvable.");
      return;
    }

    setLoading(true);

    const clientSelectionne = clients.find((client) => client.id === clientId);

    const { data: nouvelleLivraison, error } = await supabase
  .from("livraisons")
  .insert([ 
      {
        devis_id: devisId || null,
        client_id: clientId || null,
        client: clientSelectionne?.nom || "",
        expediteur: expediteur || null,
        date_prise_en_charge: datePriseEnCharge || null,
        adresse_depart: adresseDepart,
        adresse_arrivee: adresseArrivee,
        pays_depart: paysDepart,
        pays_arrivee: paysArrivee,

        destinataire: destinataire || null,
        marchandises: marchandises || null,
        nombre_colis: nombreColis
          ? parseInt(nombreColis, 10)
          : null,
        emballage: emballage || null,
        poids_brut: poidsBrut
          ? parseFloat(poidsBrut)
          : null,
        volume: volume
          ? parseFloat(volume)
          : null,

        reserves: reserves || null,
        documents_annexes: documentsAnnexes || null,
        instructions_cmr: instructionsCmr || null,

        chauffeur_id: chauffeurId || null,
        camion_id: camionId || null,
        date_livraison: dateLivraison || null,
        heure_limite: heureLimite || null,
        statut,
        entreprise_id: entrepriseId,
        prix_ht: prixHT,
        tva: tva,
        prix_ttc: prixTTC,
      },
    ])
  .select("id")
  .single();
    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

   window.location.href = `/livraisons/modifier/${nouvelleLivraison.id}`;
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
                <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
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
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Expéditeur
          </label>
          <input
            type="text"
            placeholder="Expéditeur"
            value={expediteur}
            onChange={(e) => setExpediteur(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Date de prise en charge
          </label>
          <input
            type="date"
            value={datePriseEnCharge}
            onChange={(e) => setDatePriseEnCharge(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Adresse de départ
          </label>
          <input
            type="text"
            placeholder="Adresse de départ"
            value={adresseDepart}
            onChange={(e) => setAdresseDepart(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Adresse d'arrivée
          </label>
          <input
            type="text"
            placeholder="Adresse d'arrivée"
            value={adresseArrivee}
            onChange={(e) => setAdresseArrivee(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Pays de départ
            </label>
            <input
              type="text"
              placeholder="Pays de départ"
              value={paysDepart}
              onChange={(e) => setPaysDepart(e.target.value)}
              className="w-full rounded bg-gray-800 p-3"
              required
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Pays d'arrivée
            </label>
            <input
              type="text"
              placeholder="Pays d'arrivée"
              value={paysArrivee}
              onChange={(e) => setPaysArrivee(e.target.value)}
              className="w-full rounded bg-gray-800 p-3"
              required
            />
          </div>
        </div>

        <div className="rounded border border-gray-800 bg-gray-950 p-4">
          <h2 className="mb-4 text-xl font-bold">
            Marchandise et destinataire
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Destinataire
              </label>
              <input
                type="text"
                value={destinataire}
                onChange={(e) => setDestinataire(e.target.value)}
                className="w-full rounded bg-gray-800 p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Nature de la marchandise
              </label>
              <input
                type="text"
                value={marchandises}
                onChange={(e) => setMarchandises(e.target.value)}
                className="w-full rounded bg-gray-800 p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Nombre de colis
              </label>
              <input
                type="number"
                min="0"
                value={nombreColis}
                onChange={(e) => setNombreColis(e.target.value)}
                className="w-full rounded bg-gray-800 p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Emballage
              </label>
              <input
                type="text"
                value={emballage}
                onChange={(e) => setEmballage(e.target.value)}
                className="w-full rounded bg-gray-800 p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Poids brut
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={poidsBrut}
                onChange={(e) => setPoidsBrut(e.target.value)}
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
                min="0"
                value={volume}
                onChange={(e) => setVolume(e.target.value)}
                className="w-full rounded bg-gray-800 p-3"
              />
            </div>
          </div>
        </div>

        <div className="rounded border border-gray-800 bg-gray-950 p-4">
          <h2 className="mb-4 text-xl font-bold">
            Informations de transport
          </h2>

          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Documents annexes
              </label>
              <textarea
                value={documentsAnnexes}
                onChange={(e) => setDocumentsAnnexes(e.target.value)}
                className="w-full rounded bg-gray-800 p-3"
                rows={2}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Instructions transport
              </label>
              <textarea
                value={instructionsCmr}
                onChange={(e) => setInstructionsCmr(e.target.value)}
                className="w-full rounded bg-gray-800 p-3"
                rows={3}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Réserves
              </label>
              <textarea
                value={reserves}
                onChange={(e) => setReserves(e.target.value)}
                className="w-full rounded bg-gray-800 p-3"
                rows={3}
              />
            </div>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Chauffeur
          </label>
          <select
            value={chauffeurId}
            onChange={(e) => setChauffeurId(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
          >
            <option value="">Choisir un chauffeur</option>
            {chauffeurs.map((chauffeur) => (
              <option key={chauffeur.id} value={chauffeur.id}>
                {chauffeur.nom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Camion
          </label>
          <select
            value={camionId}
            onChange={(e) => setCamionId(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
          >
            <option value="">Choisir un camion</option>
            {camions.map((camion) => (
              <option key={camion.id} value={camion.id}>
                {camion.immatriculation}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Date de livraison
          </label>
          <input
            type="date"
            value={dateLivraison}
            min={datePriseEnCharge || undefined}
            onChange={(e) => setDateLivraison(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Heure limite
          </label>
          <input
            type="time"
            value={heureLimite}
            onChange={(e) => setHeureLimite(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Statut
          </label>
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
        </div>
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


