import { supabase } from "../../../../../lib/supabase";
import { getCompanyParams, getLogoBuffer } from "../../../../../lib/getCompanyParams";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { default: PDFDocument } = await import("pdfkit");

  // Get the facture data
  const { data: facture, error: factureError } = await supabase
    .from("factures")
    .select("*")
    .eq("id", id)
    .single();

  if (factureError || !facture) {
    return new Response("Facture introuvable", { status: 404 });
  }

  // Get the associated livraison data
  const { data: livraison, error: livraisonError } = await supabase
    .from("livraisons")
    .select("*")
    .eq("id", facture.livraison_id)
    .single();

  // Get company parameters
  const companyParams = facture.entreprise_id
    ? await getCompanyParams(facture.entreprise_id)
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

  const prixHT = Number(facture.montant_ht || 0);
  const tvaRate = companyParams?.tva_defaut || 20;
  const tvaAmount = (prixHT * tvaRate) / 100;
  const prixTTC = Number(facture.montant || prixHT + tvaAmount);

  // Add logo if available
  if (logoBuffer) {
    doc.image(logoBuffer, 50, 40, { width: 100 });
  } else {
    // Fallback to text header
    doc.fontSize(22).text(companyParams?.nom || "TRANSPORT SAAS", 50, 40);
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

  // Legal info
  doc.fontSize(8);
  if (companyParams?.siret) doc.text(`SIRET: ${companyParams.siret}`, 50, 115);
  if (companyParams?.tva_intra) doc.text(`TVA Intra: ${companyParams.tva_intra}`, 50, 130);

  // Title
  doc.fontSize(20).text("FACTURE", 0, 160, {
    align: "center",
  });

  // Facture number and date
  const factureNumber = companyParams?.prefixe_factures
    ? `${companyParams.prefixe_factures}${new Date().getFullYear()}-${String(facture.id).slice(0, 8).toUpperCase()}`
    : `FACT-${new Date().getFullYear()}-${String(facture.id).slice(0, 8).toUpperCase()}`;

  doc.fontSize(10).text(`Facture n° : ${factureNumber}`, 50, 200);
  doc.text(`Date d'émission : ${new Date(facture.date_facture || new Date()).toLocaleDateString("fr-FR")}`, 50, 215);
  doc.text(`Date d'échéance : ${new Date(facture.date_echeance || new Date()).toLocaleDateString("fr-FR")}`, 50, 230);
  doc.text(`Statut : ${facture.statut || "Non payée"}`, 50, 245);

  doc.moveTo(50, 270).lineTo(545, 270).stroke();

  // Client info
  doc.fontSize(14).text("Client", 50, 295);
  doc.fontSize(11).text(facture.client || "Non renseigné", 50, 320);

  // Livraison info
  doc.fontSize(14).text("Livraison associée", 300, 295);
  doc.fontSize(11);
  if (livraison) {
    doc.text(`N° Livraison: ${livraison.id?.slice(0, 8) || "N/A"}`, 300, 320);
    doc.text(`Départ: ${livraison.depart || ""}`, 300, 337);
    doc.text(`Arrivée: ${livraison.arrivee || ""}`, 300, 354);
    doc.text(`Date: ${livraison.date_livraison ? new Date(livraison.date_livraison).toLocaleDateString("fr-FR") : ""}`, 300, 371);
  } else {
    doc.text("Livraison non trouvée", 300, 320);
  }

  doc.moveTo(50, 400).lineTo(545, 400).stroke();

  // Payment info
  doc.fontSize(14).text("Paiement", 50, 425);
  doc.fontSize(11);
  doc.text(`Conditions: ${companyParams?.conditions_paiement || "Paiement à 30 jours"}`, 50, 450);
  if (companyParams?.iban) doc.text(`IBAN: ${companyParams.iban}`, 50, 467);
  if (companyParams?.bic) doc.text(`BIC: ${companyParams.bic}`, 50, 484);

  // Amounts
  doc.fontSize(14).text("Montants", 300, 425);
  doc.fontSize(11);
  doc.text(`Prix HT: ${prixHT.toFixed(2)} EUR`, 300, 450);
  doc.text(`TVA ${tvaRate}%: ${tvaAmount.toFixed(2)} EUR`, 300, 467);

  doc
    .roundedRect(295, 485, 210, 45, 8)
    .stroke();

  doc
    .fontSize(16)
    .text(`Total TTC: ${prixTTC.toFixed(2)} EUR`, 310, 498);

  doc.moveTo(50, 550).lineTo(545, 550).stroke();

  // Legal mentions
  doc.fontSize(10).text("Mentions légales:", 50, 570);
  doc.text(companyParams?.mentions_legales || "Document généré automatiquement par Transport SaaS.", 50, 590, {
    width: 495,
    align: "justify"
  });

  // Payment terms
  doc.fontSize(10).text("Conditions de paiement:", 50, 630);
  doc.text(companyParams?.conditions_paiement || "Paiement à 30 jours à compter de la date de facture.", 50, 650, {
    width: 495,
    align: "justify"
  });

  // Bank info
  if (companyParams?.iban || companyParams?.bic) {
    doc.fontSize(10).text("Coordonnées bancaires:", 50, 690);
    let bankInfo = "";
    if (companyParams.iban) bankInfo += `IBAN: ${companyParams.iban}`;
    if (companyParams.bic) {
      if (bankInfo) bankInfo += ` | `;
      bankInfo += `BIC: ${companyParams.bic}`;
    }
    doc.text(bankInfo, 50, 710);
  }

  doc.fontSize(9).text(companyParams?.mentions_legales || "Document généré automatiquement par Transport SaaS.", 50, 750, {
    align: "center",
  });

  doc.end();

  const pdfBuffer = await pdfBufferPromise;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="facture-${String(facture.id).slice(0, 8)}.pdf"`,
    },
  });
}