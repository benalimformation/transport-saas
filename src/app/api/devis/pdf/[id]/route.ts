import { createSupabaseServiceClient } from "../../../../../lib/supabase/service";
import {
  getCompanyParams,
  getLogoBuffer,
} from "../../../../../lib/getCompanyParams";

export const runtime = "nodejs";

function formatDate(value?: string | null): string {
  if (!value) return "";

  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("fr-FR");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("fr-FR");
}

function formatTime(value?: string | null): string {
  if (!value) return "";

  return value.slice(0, 5).replace(":", "h");
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  const supabase = createSupabaseServiceClient();
  const { default: PDFDocument } = await import("pdfkit");

  const { data: devis, error } = await supabase
    .from("devis")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !devis) {
    return new Response("Devis introuvable", { status: 404 });
  }

  const companyParams = devis.entreprise_id
    ? await getCompanyParams(devis.entreprise_id)
    : null;

  const logoBuffer = companyParams?.logo_url
    ? await getLogoBuffer(companyParams.logo_url)
    : null;

  const doc = new PDFDocument({
    size: "A4",
    margin: 50,
    bufferPages: true,
  });

  const chunks: Buffer[] = [];

  const pdfBufferPromise = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const pageWidth = doc.page.width;
  const left = 50;
  const right = pageWidth - 50;
  const usableWidth = right - left;

  const prixHT = Number(devis.prix_ht || 0);
  const tva = Number(devis.tva || 0);
  const prixTTC = Number(devis.prix_ttc || devis.prix || 0);
  const tvaRate = Number(companyParams?.tva_defaut || 20);

  const emissionDate = devis.created_at
    ? new Date(devis.created_at)
    : new Date();

  const emissionYear = emissionDate.getFullYear();

 const numeroDevis =
  devis.numero_devis ||
  `DV-${emissionYear}-${String(devis.id).slice(0, 8).toUpperCase()}`;

  function addPageIfNeeded(requiredHeight: number) {
    if (doc.y + requiredHeight > doc.page.height - 70) {
      doc.addPage();
      doc.y = 50;
    }
  }

  function separator() {
    addPageIfNeeded(20);

    doc
      .moveTo(left, doc.y)
      .lineTo(right, doc.y)
      .lineWidth(0.7)
      .stroke();

    doc.moveDown(1);
  }

  function sectionTitle(title: string) {
    addPageIfNeeded(35);

    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .text(title, left);

    doc.moveDown(0.5);
  }

  function detailLine(
    label: string,
    value?: string | number | null
  ) {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      return;
    }

    addPageIfNeeded(20);

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(`${label} : `, {
        continued: true,
      });

    doc
      .font("Helvetica")
      .text(String(value));

    doc.moveDown(0.25);
  }

  function paragraph(
    label: string,
    value?: string | null
  ) {
    if (!value?.trim()) return;

    addPageIfNeeded(55);

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .text(label);

    doc
      .font("Helvetica")
      .fontSize(10)
      .text(value, {
        width: usableWidth,
        lineGap: 2,
      });

    doc.moveDown(0.7);
  }

  // =========================================================
  // EN-TÊTE ENTREPRISE
  // =========================================================

  if (logoBuffer) {
    try {
      doc.image(logoBuffer, left, 40, {
        fit: [110, 65],
      });
    } catch {
      doc
        .font("Helvetica-Bold")
        .fontSize(20)
        .text(companyParams?.nom || "TransportERP", left, 45);
    }
  } else {
    doc
      .font("Helvetica-Bold")
      .fontSize(20)
      .text(companyParams?.nom || "TransportERP", left, 45);
  }

  const companyInfoY = logoBuffer ? 112 : 75;

  doc
    .font("Helvetica")
    .fontSize(9);

  let headerY = companyInfoY;

  if (companyParams?.adresse) {
    doc.text(companyParams.adresse, left, headerY, {
      width: 250,
    });
    headerY = doc.y + 2;
  }

  const contactParts: string[] = [];

  if (companyParams?.telephone) {
    contactParts.push(`Tél. : ${companyParams.telephone}`);
  }

  if (companyParams?.email) {
    contactParts.push(`Email : ${companyParams.email}`);
  }

  if (contactParts.length > 0) {
    doc.text(contactParts.join(" | "), left, headerY, {
      width: 300,
    });
    headerY = doc.y + 2;
  }

  if (companyParams?.site_web) {
    doc.text(companyParams.site_web, left, headerY);
    headerY = doc.y + 2;
  }

  const legalParts: string[] = [];

  if (companyParams?.forme_juridique) {
    legalParts.push(companyParams.forme_juridique);
  }

  if (
    companyParams?.capital_social !== null &&
    companyParams?.capital_social !== undefined &&
    Number(companyParams.capital_social) > 0
  ) {
    legalParts.push(
      `Capital social : ${Number(
        companyParams.capital_social
      ).toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} €`
    );
  }

  if (companyParams?.rcs_ville) {
    legalParts.push(`RCS ${companyParams.rcs_ville}`);
  }

  if (companyParams?.siret) {
    legalParts.push(`SIRET : ${companyParams.siret}`);
  }

  if (companyParams?.tva_intra) {
    legalParts.push(`TVA intracommunautaire : ${companyParams.tva_intra}`);
  }

  if (legalParts.length > 0) {
    doc
      .fontSize(8)
      .text(legalParts.join(" • "), left, headerY, {
        width: usableWidth,
      });
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .text("DEVIS TRANSPORT", 300, 55, {
      width: 245,
      align: "right",
    });

  doc
    .font("Helvetica")
    .fontSize(10)
    .text(`Devis n° : ${numeroDevis}`, 300, 90, {
      width: 245,
      align: "right",
    });

  doc.text(
    `Date d'émission : ${emissionDate.toLocaleDateString("fr-FR")}`,
    300,
    107,
    {
      width: 245,
      align: "right",
    }
  );

  if (devis.validite_jusqu_au) {
    doc.text(
      `Valable jusqu'au : ${formatDate(devis.validite_jusqu_au)}`,
      300,
      124,
      {
        width: 245,
        align: "right",
      }
    );
  }



  doc.y = Math.max(doc.y, 175);

  separator();

  // =========================================================
  // CLIENT
  // =========================================================

  sectionTitle("Client");

  detailLine("Client", devis.client || "Non renseigné");

  if (devis.reference_client) {
    detailLine("Référence / bon de commande", devis.reference_client);
  }

  separator();

  // =========================================================
  // EXPÉDITEUR / DESTINATAIRE
  // =========================================================

  sectionTitle("Organisation du transport");

  if (devis.expediteur_nom) {
    detailLine("Expéditeur", devis.expediteur_nom);
  }

  detailLine(
    "Adresse de chargement",
    devis.expediteur_adresse || devis.depart
  );

  if (devis.destinataire_nom) {
    detailLine("Destinataire", devis.destinataire_nom);
  }

  detailLine(
    "Adresse de livraison",
    devis.destinataire_adresse || devis.arrivee
  );

  if (devis.distance_km !== null && devis.distance_km !== undefined) {
    detailLine("Distance", `${devis.distance_km} km`);
  }

  separator();

  // =========================================================
  // CHARGEMENT / DÉCHARGEMENT
  // =========================================================

  sectionTitle("Chargement et déchargement");

  if (devis.date_chargement) {
    const chargement =
      `${formatDate(devis.date_chargement)}` +
      (devis.heure_chargement
        ? ` à ${formatTime(devis.heure_chargement)}`
        : "");

    detailLine("Chargement prévu", chargement);
  } else if (devis.date_transport) {
    detailLine(
      "Date de transport",
      formatDate(devis.date_transport)
    );
  }

  if (devis.date_dechargement) {
    const dechargement =
      `${formatDate(devis.date_dechargement)}` +
      (devis.heure_dechargement
        ? ` à ${formatTime(devis.heure_dechargement)}`
        : "");

    detailLine("Déchargement prévu", dechargement);
  }

  separator();

  // =========================================================
  // MARCHANDISE
  // =========================================================

  sectionTitle("Marchandise");

  detailLine(
    "Nature",
    devis.nature_marchandise || "Non renseignée"
  );

  if (devis.poids !== null && devis.poids !== undefined) {
    detailLine("Poids total", `${devis.poids} tonnes`);
  }

  if (devis.palettes !== null && devis.palettes !== undefined) {
    detailLine("Nombre de palettes", devis.palettes);
  }

  if (devis.nombre_colis !== null && devis.nombre_colis !== undefined) {
    detailLine("Nombre de colis", devis.nombre_colis);
  }

  if (devis.volume_m3 !== null && devis.volume_m3 !== undefined) {
    detailLine("Volume total", `${devis.volume_m3} m³`);
  }

  separator();

  // =========================================================
  // PRESTATIONS ET CONDITIONS PARTICULIÈRES
  // =========================================================

  if (devis.prestations_annexes || devis.conditions_particulieres) {
    sectionTitle("Prestations et conditions particulières");

    paragraph(
      "Prestations annexes",
      devis.prestations_annexes
    );

    paragraph(
      "Conditions particulières",
      devis.conditions_particulieres
    );

    separator();
  }

  // =========================================================
  // MONTANTS
  // =========================================================

  sectionTitle("Montants");

  detailLine(
    "Prix HT",
    `${prixHT.toFixed(2)} €`
  );

  detailLine(
    `TVA ${tvaRate} %`,
    `${tva.toFixed(2)} €`
  );

  addPageIfNeeded(70);

  const totalBoxY = doc.y + 8;

  doc
    .roundedRect(left, totalBoxY, usableWidth, 48, 8)
    .lineWidth(1)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(16)
    .text(
      `TOTAL TTC : ${prixTTC.toFixed(2)} €`,
      left + 15,
      totalBoxY + 15,
      {
        width: usableWidth - 30,
        align: "right",
      }
    );

  doc.y = totalBoxY + 65;

  separator();

  // =========================================================
  // CONDITIONS COMMERCIALES
  // =========================================================

  sectionTitle("Conditions commerciales");

  if (devis.validite_jusqu_au) {
    detailLine(
      "Validité de l'offre",
      `Jusqu'au ${formatDate(devis.validite_jusqu_au)}`
    );
  } else {
    const dureeValidite =
      Number(companyParams?.duree_validite_devis_jours || 30);

    detailLine(
      "Validité de l'offre",
      `${dureeValidite} jours à compter de la date d'émission`
    );
  }

  if (companyParams?.conditions_paiement) {
    detailLine(
      "Conditions de paiement",
      companyParams.conditions_paiement
    );
  }

  doc.moveDown(0.5);

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      "Les prix et conditions indiqués dans le présent devis s'appliquent aux prestations décrites ci-dessus.",
      {
        width: usableWidth,
      }
    );

  doc.moveDown(0.5);

  doc.text(
    "Toute modification des caractéristiques du transport pourra entraîner une révision du prix et des conditions de réalisation.",
    {
      width: usableWidth,
    }
  );

  doc.moveDown(1);

  separator();

  // =========================================================
  // ACCEPTATION
  // =========================================================

  sectionTitle("Acceptation du devis");

  doc
    .font("Helvetica")
    .fontSize(9)
    .text(
      "Bon pour accord. Le client reconnaît accepter les prestations, prix et conditions mentionnés dans le présent devis.",
      {
        width: usableWidth,
      }
    );

  doc.moveDown(1);

  addPageIfNeeded(120);

  const signatureY = doc.y;

  doc
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("Date :", left, signatureY);

  doc.text("Nom et qualité du signataire :", 200, signatureY);

  doc
    .font("Helvetica-Bold")
    .text("Signature précédée de la mention « Bon pour accord » :", left, signatureY + 30);

  doc
    .rect(left, signatureY + 48, usableWidth, 75)
    .lineWidth(0.7)
    .stroke();

  doc.y = signatureY + 140;

  // =========================================================
  // MENTIONS / PIED DE PAGE
  // =========================================================

  addPageIfNeeded(80);

  separator();

  if (companyParams?.mentions_legales) {
    doc
      .font("Helvetica")
      .fontSize(8)
      .text(companyParams.mentions_legales, {
        width: usableWidth,
        align: "center",
      });

    doc.moveDown(0.5);
  }



  // Numérotation des pages
  const range = doc.bufferedPageRange();

  for (
    let pageIndex = range.start;
    pageIndex < range.start + range.count;
    pageIndex++
  ) {
    doc.switchToPage(pageIndex);

    doc
      .font("Helvetica")
      .fontSize(8)
      .text(
        `Page ${pageIndex + 1} / ${range.count}`,
        left,
        doc.page.height - doc.page.margins.bottom - 10,
        {
          width: usableWidth,
          align: "right",
          lineBreak: false,
        }
      );
  }

  doc.end();

  const pdfBuffer = await pdfBufferPromise;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="devis-${String(
        devis.id
      ).slice(0, 8)}.pdf"`,
    },
  });
}
