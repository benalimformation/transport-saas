"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../../lib/supabase/client";

type Chauffeur = {
  id: string;
  nom: string;
};

type Camion = {
  id: string;
  immatriculation: string;
};

export default function ModifierLivraisonPage() {
  const supabase = createClient();
  const params = useParams();
  const id = params.id as string;

  const [entrepriseId, setEntrepriseId] = useState<string | null>(null);

  const [client, setClient] = useState("");
  const [adresseDepart, setAdresseDepart] = useState("");
  const [adresseArrivee, setAdresseArrivee] = useState("");

  const [destinataire, setDestinataire] = useState("");
  const [marchandises, setMarchandises] = useState("");
  const [nombreColis, setNombreColis] = useState("");
  const [emballage, setEmballage] = useState("");
  const [poidsBrut, setPoidsBrut] = useState("");
  const [volume, setVolume] = useState("");

  const [dateLivraison, setDateLivraison] = useState("");
  const [heureLimite, setHeureLimite] = useState("");

  const [reserves, setReserves] = useState("");
  const [documentsAnnexes, setDocumentsAnnexes] = useState("");
  const [instructionsCmr, setInstructionsCmr] = useState("");

  const [chauffeurId, setChauffeurId] = useState("");
  const [camionId, setCamionId] = useState("");
  const [statut, setStatut] = useState("Prévue");

  const [signatureChauffeur, setSignatureChauffeur] = useState("");
  const [signatureDestinataire, setSignatureDestinataire] = useState("");

  const canvasChauffeurRef = useRef<HTMLCanvasElement | null>(null);
const canvasDestinataireRef = useRef<HTMLCanvasElement | null>(null);

const dessinChauffeurActif = useRef(false);
const dessinDestinataireActif = useRef(false);
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [camions, setCamions] = useState<Camion[]>([]);
  useEffect(() => {
  const restaurerSignature = (
    canvas: HTMLCanvasElement | null,
    signature: string
  ) => {
    if (!canvas || !signature?.startsWith("data:image/")) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const image = new Image();

    image.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    };

    image.src = signature;
  };

  restaurerSignature(
    canvasChauffeurRef.current,
    signatureChauffeur
  );

  restaurerSignature(
    canvasDestinataireRef.current,
    signatureDestinataire
  );
}, [signatureChauffeur, signatureDestinataire]);

  useEffect(() => {
    async function chargerDonnees() {
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

      const { data: chauffeursData } = await supabase
        .from("Chauffeurs")
        .select("id, nom")
        .eq("entreprise_id", entrepriseIdValue);

      const { data: camionsData } = await supabase
        .from("camions")
        .select("id, immatriculation")
        .eq("entreprise_id", entrepriseIdValue);

      const { data: livraisonData, error } = await supabase
        .from("livraisons")
        .select("*")
        .eq("id", id)
        .eq("entreprise_id", entrepriseIdValue)
        .single();

      if (error || !livraisonData) {
        alert(error?.message || "Impossible de charger la livraison.");
        return;
      }

      setChauffeurs(chauffeursData || []);
      setCamions(camionsData || []);

      setClient(livraisonData.client || "");
      setAdresseDepart(livraisonData.adresse_depart || "");
      setAdresseArrivee(livraisonData.adresse_arrivee || "");

      setDestinataire(livraisonData.destinataire || "");
      setMarchandises(livraisonData.marchandises || "");
      setNombreColis(String(livraisonData.nombre_colis ?? ""));
      setEmballage(livraisonData.emballage || "");
      setPoidsBrut(String(livraisonData.poids_brut ?? ""));
      setVolume(String(livraisonData.volume ?? ""));

      setDateLivraison(livraisonData.date_livraison || "");
      setHeureLimite(livraisonData.heure_limite || "");

      setReserves(livraisonData.reserves || "");
      setDocumentsAnnexes(livraisonData.documents_annexes || "");
      setInstructionsCmr(livraisonData.instructions_cmr || "");

      setChauffeurId(livraisonData.chauffeur_id || "");
      setCamionId(livraisonData.camion_id || "");
      setStatut(livraisonData.statut || "Prévue");

      setSignatureChauffeur(livraisonData.signature_chauffeur || "");
      setSignatureDestinataire(
        livraisonData.signature_destinataire || ""
      );
    }

    if (id) {
      chargerDonnees();
    }
  }, [id]);

  function obtenirPosition(
  e: React.PointerEvent<HTMLCanvasElement>,
  canvas: HTMLCanvasElement
) {
  const rect = canvas.getBoundingClientRect();

  return {
    x: ((e.clientX - rect.left) * canvas.width) / rect.width,
    y: ((e.clientY - rect.top) * canvas.height) / rect.height,
  };
}

function commencerSignature(
  e: React.PointerEvent<HTMLCanvasElement>,
  type: "chauffeur" | "destinataire"
) {
  const canvas =
    type === "chauffeur"
      ? canvasChauffeurRef.current
      : canvasDestinataireRef.current;

  if (!canvas) return;

  e.preventDefault();
  canvas.setPointerCapture(e.pointerId);

  if (type === "chauffeur") {
    dessinChauffeurActif.current = true;
  } else {
    dessinDestinataireActif.current = true;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { x, y } = obtenirPosition(e, canvas);

  ctx.beginPath();
  ctx.moveTo(x, y);
}

function dessinerSignature(
  e: React.PointerEvent<HTMLCanvasElement>,
  type: "chauffeur" | "destinataire"
) {
  const actif =
    type === "chauffeur"
      ? dessinChauffeurActif.current
      : dessinDestinataireActif.current;

  if (!actif) return;

  const canvas =
    type === "chauffeur"
      ? canvasChauffeurRef.current
      : canvasDestinataireRef.current;

  if (!canvas) return;

  e.preventDefault();

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const { x, y } = obtenirPosition(e, canvas);

  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.strokeStyle = "#111827";
  ctx.lineTo(x, y);
  ctx.stroke();
}

function terminerSignature(
  type: "chauffeur" | "destinataire"
) {
  const canvas =
    type === "chauffeur"
      ? canvasChauffeurRef.current
      : canvasDestinataireRef.current;

  if (!canvas) return;

  if (type === "chauffeur") {
    dessinChauffeurActif.current = false;
    setSignatureChauffeur(canvas.toDataURL("image/png"));
  } else {
    dessinDestinataireActif.current = false;
    setSignatureDestinataire(canvas.toDataURL("image/png"));
  }
}

function effacerSignature(
  type: "chauffeur" | "destinataire"
) {
  const canvas =
    type === "chauffeur"
      ? canvasChauffeurRef.current
      : canvasDestinataireRef.current;

  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (type === "chauffeur") {
    setSignatureChauffeur("");
  } else {
    setSignatureDestinataire("");
  }
}

  async function modifierLivraison(e: React.FormEvent) {
    e.preventDefault();

    if (!entrepriseId) {
      alert("Entreprise introuvable.");
      return;
    }

    if (
      statut === "Livrée" &&
      (!signatureChauffeur || !signatureDestinataire)
    ) {
      alert(
        "La livraison ne peut pas être marquée comme livrée tant que les signatures du chauffeur et du destinataire ne sont pas enregistrées."
      );
      return;
    }

    const { error } = await supabase
      .from("livraisons")
      .update({
        client,
        adresse_depart: adresseDepart,
        adresse_arrivee: adresseArrivee,

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

        date_livraison: dateLivraison || null,
        heure_limite: heureLimite || null,

        reserves: reserves || null,
        documents_annexes: documentsAnnexes || null,
        instructions_cmr: instructionsCmr || null,

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
      .eq("id", id)
      .eq("entreprise_id", entrepriseId);

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/livraisons";
  }

  return (
    <main className="min-h-screen bg-gray-950 p-10 text-white">
      <h1 className="mb-8 text-5xl font-bold">
        Modifier livraison
      </h1>

      <a
        href="/livraisons"
        className="mb-6 inline-block rounded bg-gray-700 px-4 py-2"
      >
        ← Retour Livraisons
      </a>

      <form
        onSubmit={modifierLivraison}
        className="max-w-xl space-y-6 rounded-xl border border-gray-800 bg-gray-900 p-6"
      >
        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Client
          </label>

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
            Adresse de départ
          </label>

          <input
            type="text"
            value={adresseDepart}
            onChange={(e) => setAdresseDepart(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
            required
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Adresse d&apos;arrivée
          </label>

          <input
            type="text"
            value={adresseArrivee}
            onChange={(e) => setAdresseArrivee(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
            required
          />
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
            Planification
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Date de livraison
              </label>

              <input
                type="date"
                value={dateLivraison}
                onChange={(e) => setDateLivraison(e.target.value)}
                className="w-full rounded bg-gray-800 p-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm text-gray-300">
                Heure limite
              </label>

              <input
                type="time"
                value={heureLimite}
                onChange={(e) => setHeureLimite(e.target.value)}
                className="w-full rounded bg-gray-800 p-3"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Chauffeur
          </label>

          <select
            value={chauffeurId}
            onChange={(e) => setChauffeurId(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
            required
          >
            <option value="">Choisir un chauffeur</option>

            {chauffeurs.map((chauffeur) => (
              <option
                key={chauffeur.id}
                value={chauffeur.id}
              >
                {chauffeur.nom}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Camion
          </label>

          <select
            value={camionId}
            onChange={(e) => setCamionId(e.target.value)}
            className="w-full rounded bg-gray-800 p-3"
            required
          >
            <option value="">Choisir un camion</option>

            {camions.map((camion) => (
              <option
                key={camion.id}
                value={camion.id}
              >
                {camion.immatriculation}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
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
                onChange={(e) =>
                  setDocumentsAnnexes(e.target.value)
                }
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
                onChange={(e) =>
                  setInstructionsCmr(e.target.value)
                }
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

     <div className="rounded border border-gray-700 bg-gray-800 p-4">
  <p className="mb-4 text-lg font-bold">
    Signatures
  </p>

  <div className="mb-6">
    <label className="mb-2 block text-sm text-gray-300">
      Signature chauffeur
    </label>

    <canvas
      ref={canvasChauffeurRef}
      width={600}
      height={180}
      onPointerDown={(e) =>
        commencerSignature(e, "chauffeur")
      }
      onPointerMove={(e) =>
        dessinerSignature(e, "chauffeur")
      }
      onPointerUp={() =>
        terminerSignature("chauffeur")
      }
      onPointerCancel={() =>
        terminerSignature("chauffeur")
      }
      onPointerLeave={() => {
        if (dessinChauffeurActif.current) {
          terminerSignature("chauffeur");
        }
      }}
      className="h-36 w-full touch-none rounded bg-white"
    />

    <button
      type="button"
      onClick={() => effacerSignature("chauffeur")}
      className="mt-2 rounded bg-gray-600 px-3 py-2 text-sm"
    >
      Effacer la signature chauffeur
    </button>
  </div>

  <div>
    <label className="mb-2 block text-sm text-gray-300">
      Signature destinataire
    </label>

    <canvas
      ref={canvasDestinataireRef}
      width={600}
      height={180}
      onPointerDown={(e) =>
        commencerSignature(e, "destinataire")
      }
      onPointerMove={(e) =>
        dessinerSignature(e, "destinataire")
      }
      onPointerUp={() =>
        terminerSignature("destinataire")
      }
      onPointerCancel={() =>
        terminerSignature("destinataire")
      }
      onPointerLeave={() => {
        if (dessinDestinataireActif.current) {
          terminerSignature("destinataire");
        }
      }}
      className="h-36 w-full touch-none rounded bg-white"
    />

    <button
      type="button"
      onClick={() =>
        effacerSignature("destinataire")
      }
      className="mt-2 rounded bg-gray-600 px-3 py-2 text-sm"
    >
      Effacer la signature destinataire
    </button>
  </div>
</div>

        <button
          type="submit"
          className="rounded bg-blue-600 px-6 py-3"
        >
          Enregistrer les modifications
        </button>
      </form>
    </main>
  );
}