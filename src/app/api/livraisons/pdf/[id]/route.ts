import { supabase } from "../../../../../lib/supabase";
import { getCompanyParams, getLogoBuffer } from "../../../../../lib/getCompanyParams";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { default: PDFDocument } = await import("pdfkit");

  const { data: livraison, error } = await supabase
    .from("livraisons")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !livraison) {
    return new Response("Livraison introuvable", { status: 404 });
  }

  const { data: chauffeur } = await supabase
  .from("Chauffeurs")
  .select("nom")
  .eq("id", livraison.chauffeur_id)
  .single();
  const { data: camion } = await supabase
  .from("camions")
  .select("immatriculation")
  .eq("id", livraison.camion_id)
  .single();
    

  // Get company parameters
  const companyParams = livraison.entreprise_id
    ? await getCompanyParams(livraison.entreprise_id)
    : null;

  // Get logo buffer if available
  const logoBuffer = companyParams?.logo_url
    ? await getLogoBuffer(companyParams.logo_url)
    : null;

  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];

  const pdfBufferPromise = new Promise<Buffer>((resolve) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  // Add logo if available
  if (logoBuffer) {
    doc.image(logoBuffer, 50, 40, { width: 100 });
  } else {
    // Fallback to text header
    doc.fontSize(22).text(companyParams?.nom || "TransportERP", 50, 40);
  }

  // Company info
  doc.fontSize(10);
  if (companyParams?.adresse) doc.text(companyParams.adresse, 50, 70);
  if (companyParams?.telephone || companyParams?.email) {
    let contactLine = "";
    if (companyParams.telephone) contactLine += `Tél: ${companyParams.telephone}`;
    if (companyParams.email) {
      if (contactLine) contactLine += ` | `;
      contactLine += `Email: ${companyParams.email}`;
    }
    doc.text(contactLine, 50, 85);
  }
  if (companyParams?.site_web) doc.text(companyParams.site_web, 50, 100);

  // Legal and banking info
  doc.fontSize(8);
  if (companyParams?.siret) doc.text(`SIRET: ${companyParams.siret}`, 50, 115);
  if (companyParams?.tva_intra) doc.text(`TVA Intra: ${companyParams.tva_intra}`, 50, 130);
  if (companyParams?.iban || companyParams?.bic) {
    let bankInfo = "";
    if (companyParams.iban) bankInfo += `IBAN: ${companyParams.iban}`;
    if (companyParams.bic) {
      if (bankInfo) bankInfo += ` | `;
      bankInfo += `BIC: ${companyParams.bic}`;
    }
    doc.text(bankInfo, 50, 145);
  }

    doc.fontSize(20).text("LETTRE DE VOITURE", 0, 110, {
    align: "center",
  });

 doc.fontSize(10).text(
  `Lettre n° : ${livraison.numero_lettre_voiture || "Non attribué"}`,
  50,
  150
);
doc.text(
  `Date d'établissement : ${
    livraison.created_at
      ? new Date(livraison.created_at).toLocaleDateString("fr-FR")
      : "Non renseignée"
  }`,
  50,
  165
);
  doc.text(`Statut : ${livraison.statut || "Prévue"}`, 50, 180);

  doc.moveTo(50, 205).lineTo(545, 205).stroke();

    doc.fontSize(14).text("Expéditeur", 50, 230);
  doc.fontSize(11).text(
  livraison.expediteur || "Non renseigné",
  50,
  255
);  
doc.fontSize(14).text("Destinataire", 50, 285);
    doc.fontSize(11).text(
  livraison.destinataire || "Non renseigné",
  50,
  310
);

  doc.fontSize(14).text("Trajet", 300, 230);
   doc.fontSize(11).text(
    `Départ : ${livraison.adresse_depart || "Non renseigné"} - ${livraison.pays_depart || "France"}`,
    300,
    255
  );
  doc.text(
    `Arrivée : ${livraison.adresse_arrivee || "Non renseignée"} - ${livraison.pays_arrivee || "France"}`,
    300,
    272
  );

  doc.text(
  `Prise en charge : ${
    livraison.date_prise_en_charge
      ? new Date(`${livraison.date_prise_en_charge}T00:00:00`).toLocaleDateString("fr-FR")
      : "Non renseignée"
  }`,
  300,
  289
);

doc.text(
 `Date de livraison : ${
    livraison.date_livraison
      ? new Date(`${livraison.date_livraison}T00:00:00`).toLocaleDateString("fr-FR")
      : "Non renseignée"
  }`,
  300,
 306
);
  doc.text(
  `Heure limite : ${
    livraison.heure_limite
      ? livraison.heure_limite.slice(0, 5)
      : "Non renseignée"
  }`,
  300,
 323
);
    doc.fontSize(14).text("Marchandises", 50, 330);

doc.fontSize(10).text(
  `Nature : ${livraison.marchandises || "Non renseignée"} | Colis : ${livraison.nombre_colis ?? "Non renseigné"} | Emballage : ${livraison.emballage || "Non renseigné"}`,
  50,
  350,
  { width: 495 }
);

doc.text(
  `Poids : ${livraison.poids_brut != null ? `${livraison.poids_brut} kg` : "Non renseigné"} | Volume : ${livraison.volume != null ? `${livraison.volume} m³` : "Non renseigné"}`,
  50,
  365,
  { width: 495 }
);
   doc.moveTo(50, 395).lineTo(545, 395).stroke();

  doc.fontSize(14).text("Affectation", 50, 420);
  doc.fontSize(11).text(
    `Chauffeur : ${chauffeur?.nom || "Non affecté"}`,
    50,
    445
  );
  doc.text(
    `Camion : ${camion?.immatriculation || "Non affecté"}`,
    50,
    462
  );
  doc.fontSize(12).text("Documents annexes", 50, 485);

doc.fontSize(10).text(
  livraison.documents_annexes || "Aucun document annexe.",
  50,
  502,
  { width: 220 }
);

  doc.fontSize(14).text("Instructions", 300, 420);

doc.fontSize(11).text(
  livraison.instructions_cmr || "Aucune instruction renseignée.",
  300,
  445,
  { width: 245 }
);
doc.fontSize(12).text("Réserves", 300, 470);

doc.fontSize(10).text(
  livraison.reserves || "Aucune réserve.",
  300,
  487,
  { width: 245 }
);
  doc.moveTo(50, 525).lineTo(545, 525).stroke();

  doc.fontSize(12).text("Signature chauffeur :", 50, 530);
doc.rect(50, 555, 200, 70).stroke();

if (
  livraison.signature_chauffeur &&
  livraison.signature_chauffeur.startsWith("data:image/")
) {
  const signatureBuffer = Buffer.from(
    livraison.signature_chauffeur.split(",")[1],
    "base64"
  );

  doc.image(signatureBuffer, 60, 565, {
    fit: [180, 50],
    align: "center",
    valign: "center",
  });
} else if (livraison.signature_chauffeur) {
  doc.fontSize(14).text(livraison.signature_chauffeur, 70, 585);
}

doc.fontSize(12).text("Signature destinataire :", 300, 530);
doc.rect(300, 555, 200, 70).stroke();

if (
  livraison.signature_destinataire &&
  livraison.signature_destinataire.startsWith("data:image/")
) {
  const signatureBuffer = Buffer.from(
    livraison.signature_destinataire.split(",")[1],
    "base64"
  );

  doc.image(signatureBuffer, 310, 565, {
    fit: [180, 50],
    align: "center",
    valign: "center",
  });
} else if (livraison.signature_destinataire) {
  doc.fontSize(14).text(livraison.signature_destinataire, 320, 585);
}

if (livraison.date_signature) {
  doc
    .fontSize(9)
    .text(
      `Signé le : ${new Date(livraison.date_signature).toLocaleDateString("fr-FR")}`,
      50,
      635
    );
}

  doc.fontSize(9).text(companyParams?.mentions_legales || "Document généré automatiquement par TransportERP.", 50, 730, {
    align: "center",
  });

  doc.end();

  const pdfBuffer = await pdfBufferPromise;

  return new Response(new Uint8Array(pdfBuffer), {
  headers: {
    "Content-Type": "application/pdf",
   "Content-Disposition": `inline; filename="lettre-de-voiture-${livraison.numero_lettre_voiture || String(livraison.id).slice(0, 8)}.pdf"`,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  },
});
}