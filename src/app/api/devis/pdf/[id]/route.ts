import { supabase } from "../../../../../lib/supabase";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const { default: PDFDocument } = await import("pdfkit");

  const { data: devis, error } = await supabase
    .from("devis")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !devis) {
    return new Response("Devis introuvable", { status: 404 });
  }

  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];

  const pdfBufferPromise = new Promise<Buffer>((resolve) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const prixHT = Number(devis.prix_ht || 0);
  const tva = Number(devis.tva || 0);
  const prixTTC = Number(devis.prix_ttc || devis.prix || 0);

  doc.fontSize(22).text("TRANSPORT SAAS", 50, 40);
  doc.fontSize(10).text("Assistant administratif transport", 50, 68);

  doc.fontSize(20).text("DEVIS TRANSPORT", 0, 110, {
    align: "center",
  });
const numeroDevis = `DV-${new Date().getFullYear()}-${String(devis.id)
  .slice(0, 8)
  .toUpperCase()}`;

doc.fontSize(10).text(`Devis n° : ${numeroDevis}`, 50, 150);
  
  doc.text(`Date d'émission : ${new Date().toLocaleDateString("fr-FR")}`, 50, 165);
  doc.text(`Statut : ${devis.statut || "Brouillon"}`, 50, 180);

  doc.moveTo(50, 205).lineTo(545, 205).stroke();

  doc.fontSize(14).text("Client", 50, 230);
  doc.fontSize(11).text(devis.client || "Non renseigné", 50, 255);

  doc.fontSize(14).text("Transport", 300, 230);
  doc.fontSize(11).text(`Départ : ${devis.depart || ""}`, 300, 255);
  doc.text(`Arrivée : ${devis.arrivee || ""}`, 300, 272);
  doc.text(`Distance : ${devis.distance_km || 0} km`, 300, 289);
  doc.text(`Date transport : ${devis.date_transport || ""}`, 300, 306);

  doc.moveTo(50, 345).lineTo(545, 345).stroke();

  doc.fontSize(14).text("Marchandise", 50, 370);
  doc.fontSize(11).text(`Poids : ${devis.poids || 0} tonnes`, 50, 395);
  doc.text(`Palettes : ${devis.palettes || 0}`, 50, 412);

  doc.fontSize(14).text("Montants", 300, 370);
  doc.fontSize(11).text(`Prix HT : ${prixHT.toFixed(2)} EUR`, 300, 395);
  doc.text(`TVA 20 % : ${tva.toFixed(2)} EUR`, 300, 412);

 doc
  .roundedRect(295, 435, 210, 45, 8)
  .stroke();

doc
  .fontSize(16)
  .text(`Total TTC : ${prixTTC.toFixed(2)} EUR`, 310, 448);

  doc.moveTo(50, 500).lineTo(545, 500).stroke();

doc.fontSize(10).text("Conditions :", 50, 520);
doc.text("- Devis valable 15 jours.", 50, 540);
doc.text("- Prix calculé selon distance, poids, palettes et conditions de transport.", 50, 555);
doc.text("- Sous réserve de disponibilité chauffeur et véhicule.", 50, 570);

doc.fontSize(10).text("Signature client :", 50, 610);
doc.rect(50, 630, 200, 50).stroke();

doc.fontSize(9).text("Document généré automatiquement par Transport SaaS.", 50, 720, {
  align: "center",
});
doc.end();

  const pdfBuffer = await pdfBufferPromise;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="devis-${String(devis.id).slice(0, 8)}.pdf"`,
    },
  });
}