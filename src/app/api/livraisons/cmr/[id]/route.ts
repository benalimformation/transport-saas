import { NextRequest } from "next/server";
import { createSupabaseProxyClient } from "../../../../../lib/supabase/proxy";
import {
  getCompanyParams,
  getLogoBuffer,
} from "../../../../../lib/getCompanyParams";

export const runtime = "nodejs";

type DevisLie = {
  expediteur_nom: string | null;
  expediteur_adresse: string | null;
  destinataire_nom: string | null;
  destinataire_adresse: string | null;
  date_chargement: string | null;
  heure_chargement: string | null;
  conditions_particulieres: string | null;
};

function formatDateFr(value: string | null | undefined) {
  if (!value) return "";

  const parts = value.split("-");

  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }

  return value;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const { supabase } = createSupabaseProxyClient(request);

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response("Non autorisé", { status: 401 });
  }

  const { data: profil, error: profilError } = await supabase
    .from("profils")
    .select("entreprise_id")
    .eq("id", user.id)
    .single();

  if (profilError || !profil?.entreprise_id) {
    return new Response("Profil utilisateur introuvable", {
      status: 401,
    });
  }

  const entrepriseId = profil.entreprise_id;

  const { default: PDFDocument } = await import("pdfkit");

  const { data: livraison, error } = await supabase
    .from("livraisons")
    .select("*")
    .eq("id", id)
    .eq("entreprise_id", entrepriseId)
    .single();

  if (error || !livraison) {
    return new Response("Livraison introuvable", {
      status: 404,
    });
  }

  let devis: DevisLie | null = null;

  if (livraison.devis_id) {
    const { data: devisData } = await supabase
      .from("devis")
      .select(`
        expediteur_nom,
        expediteur_adresse,
        destinataire_nom,
        destinataire_adresse,
        date_chargement,
        heure_chargement,
        conditions_particulieres
      `)
      .eq("id", livraison.devis_id)
      .eq("entreprise_id", entrepriseId)
      .maybeSingle();

    devis = devisData;
  }

  const { data: chauffeur } = livraison.chauffeur_id
    ? await supabase
        .from("Chauffeurs")
        .select("nom")
        .eq("id", livraison.chauffeur_id)
        .eq("entreprise_id", entrepriseId)
        .maybeSingle()
    : { data: null };

  const { data: camion } = livraison.camion_id
    ? await supabase
        .from("camions")
        .select("immatriculation")
        .eq("id", livraison.camion_id)
        .eq("entreprise_id", entrepriseId)
        .maybeSingle()
    : { data: null };

  const companyParams = livraison.entreprise_id
    ? await getCompanyParams(livraison.entreprise_id)
    : null;

  const logoBuffer = companyParams?.logo_url
    ? await getLogoBuffer(companyParams.logo_url)
    : null;

  const expediteurNom =
    devis?.expediteur_nom ||
    livraison.client ||
    "";

  const expediteurAdresse =
    devis?.expediteur_adresse ||
    livraison.adresse_depart ||
    "";

  const destinataireNom =
    livraison.destinataire ||
    devis?.destinataire_nom ||
    "";

  const datePriseEnCharge =
    formatDateFr(devis?.date_chargement) ||
    formatDateFr(livraison.date_livraison);

  const heurePriseEnCharge =
    devis?.heure_chargement?.slice(0, 5) ||
    livraison.heure_limite?.slice(0, 5) ||
    "";

  const conventionsParticulieres =
    devis?.conditions_particulieres || "";

  const doc = new PDFDocument({
    margin: 35,
  });

  const chunks: Buffer[] = [];

  const pdfBufferPromise = new Promise<Buffer>((resolve) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  function box(
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    value?: string
  ) {
    doc.rect(x, y, w, h).stroke();

    doc
      .fontSize(8)
      .text(title, x + 5, y + 5);

    doc
      .fontSize(10)
      .text(value || "Non renseigné", x + 5, y + 22, {
        width: w - 10,
        height: h - 25,
      });
  }

  if (logoBuffer) {
    doc.image(logoBuffer, 35, 25, {
      width: 80,
    });
  } else {
    doc
      .fontSize(12)
      .text(
        companyParams?.nom || "TransportERP",
        35,
        30
      );
  }

  doc.fontSize(7);

  if (companyParams?.adresse) {
    doc.text(companyParams.adresse, 35, 45);
  }

  if (
    companyParams?.telephone ||
    companyParams?.email
  ) {
    let contactLine = "";

    if (companyParams.telephone) {
      contactLine += `Tél: ${companyParams.telephone}`;
    }

    if (companyParams.email) {
      if (contactLine) {
        contactLine += " | ";
      }

      contactLine += `Email: ${companyParams.email}`;
    }

    doc.text(contactLine, 35, 55);
  }

  if (companyParams?.site_web) {
    doc.text(companyParams.site_web, 35, 65);
  }

  doc.fontSize(6);

  if (companyParams?.siret) {
    doc.text(
      `SIRET: ${companyParams.siret}`,
      35,
      75
    );
  }

  if (companyParams?.tva_intra) {
    doc.text(
      `TVA Intra: ${companyParams.tva_intra}`,
      35,
      85
    );
  }

  doc
    .fontSize(18)
    .text(
      "LETTRE DE VOITURE INTERNATIONALE",
      35,
      105
    );

  doc
    .fontSize(20)
    .text("CMR", 480, 105);

  doc
    .fontSize(8)
    .text(
      "Convention relative au contrat de transport international de marchandises par route",
      35,
      130
    );

  doc
    .fontSize(9)
    .text(
      `CMR n° : CMR-${String(livraison.id)
        .slice(0, 8)
        .toUpperCase()}`,
      35,
      150
    );

  doc.text(
    `Date édition : ${new Date().toLocaleDateString(
      "fr-FR"
    )}`,
    250,
    150
  );

  doc.text(
    `Statut : ${livraison.statut || "Prévue"}`,
    420,
    150
  );

  box(
    35,
    170,
    250,
    70,
    "1. Expéditeur",
    `${expediteurNom}${
      expediteurAdresse
        ? `\n${expediteurAdresse}`
        : ""
    }`
  );

  box(
    285,
    170,
    270,
    70,
    "2. Destinataire",
    destinataireNom
  );

  box(
    35,
    240,
    250,
    70,
    "3. Lieu prévu pour la livraison",
    livraison.adresse_arrivee || ""
  );

  box(
    285,
    240,
    270,
    70,
    "4. Lieu et date de prise en charge",
    `${expediteurAdresse || livraison.adresse_depart || ""}${
      datePriseEnCharge
        ? `\nDate : ${datePriseEnCharge}`
        : ""
    }${
      heurePriseEnCharge
        ? `\nHeure : ${heurePriseEnCharge}`
        : ""
    }`
  );

  box(
    35,
    310,
    250,
    55,
    "5. Documents annexés",
    livraison.documents_annexes || ""
  );

  box(
    285,
    310,
    270,
    55,
    "6. Marques et numéros",
    String(livraison.id).slice(0, 8)
  );

  box(
    35,
    365,
    130,
    55,
    "7. Nombre de colis",
    livraison.nombre_colis != null
      ? String(livraison.nombre_colis)
      : ""
  );

  box(
    165,
    365,
    120,
    55,
    "8. Mode d'emballage",
    livraison.emballage || ""
  );

  box(
    285,
    365,
    270,
    55,
    "9. Nature de la marchandise",
    livraison.marchandises || ""
  );

  box(
    35,
    420,
    130,
    55,
    "10. Poids brut",
    livraison.poids_brut != null
      ? String(livraison.poids_brut)
      : ""
  );

  box(
    165,
    420,
    120,
    55,
    "11. Volume",
    livraison.volume != null
      ? String(livraison.volume)
      : ""
  );

  box(
    285,
    420,
    270,
    55,
    "12. Instructions de l'expéditeur",
    livraison.instructions_cmr || ""
  );

  box(
    35,
    475,
    250,
    65,
    "16. Transporteur",
    `${companyParams?.nom || "TransportERP"}\nChauffeur : ${
      chauffeur?.nom || "Non affecté"
    }\nCamion : ${
      camion?.immatriculation || "Non affecté"
    }`
  );

  box(
    285,
    475,
    270,
    65,
    "18. Réserves et observations du transporteur",
    livraison.reserves || ""
  );

  box(
    35,
    540,
    250,
    55,
    "19. Conventions particulières",
    conventionsParticulieres
  );

  box(
    285,
    540,
    270,
    55,
    "21. Établi à / Date",
    `${expediteurAdresse || livraison.adresse_depart || ""}\n${new Date().toLocaleDateString(
      "fr-FR"
    )}`
  );

  doc
    .rect(35, 615, 170, 85)
    .stroke();

  doc
    .fontSize(8)
    .text(
      "22. Signature et cachet de l'expéditeur",
      40,
      623
    );

  doc
    .fontSize(11)
    .text(
      expediteurNom,
      45,
      665
    );

  doc
    .rect(210, 615, 170, 85)
    .stroke();

  doc
    .fontSize(8)
    .text(
      "23. Signature et cachet du transporteur",
      215,
      623
    );

  
    if (
  livraison.signature_chauffeur &&
  livraison.signature_chauffeur.startsWith("data:image/")
) {
  const signatureBuffer = Buffer.from(
    livraison.signature_chauffeur.split(",")[1],
    "base64"
  );

  doc.image(signatureBuffer, 220, 650, {
    fit: [150, 40],
    align: "center",
    valign: "center",
  });
} else {
  doc
    .fontSize(11)
    .text(
      livraison.signature_chauffeur ||
        chauffeur?.nom ||
        "",
      220,
      665
    );
}

  doc
    .rect(385, 615, 170, 85)
    .stroke();

  doc
    .fontSize(8)
    .text(
      "24. Signature et cachet du destinataire",
      390,
      623
    );

 if (
  livraison.signature_destinataire &&
  livraison.signature_destinataire.startsWith("data:image/")
) {
  const signatureBuffer = Buffer.from(
    livraison.signature_destinataire.split(",")[1],
    "base64"
  );

  doc.image(signatureBuffer, 395, 650, {
    fit: [150, 40],
    align: "center",
    valign: "center",
  });
} else {
  doc
    .fontSize(11)
    .text(
      livraison.signature_destinataire || "",
      395,
      665
    );
}

  doc
    .fontSize(7)
    .text(
      companyParams?.mentions_legales ||
        "Document CMR généré automatiquement par TransportERP. Document à vérifier et compléter selon les exigences réglementaires applicables.",
      35,
      720,
      {
        align: "center",
        width: 520,
      }
    );

  doc.end();

  const pdfBuffer = await pdfBufferPromise;

  return new Response(
    new Uint8Array(pdfBuffer),
    {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="cmr-${String(
          livraison.id
        ).slice(0, 8)}.pdf"`,
      },
    }
  );
}