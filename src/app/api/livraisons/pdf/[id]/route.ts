import { supabase } from "../../../../../lib/supabase";
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
  console.log("SIGNATURES PDF :", {
  signature_chauffeur: livraison.signature_chauffeur,
  signature_destinataire: livraison.signature_destinataire,
  date_signature: livraison.date_signature,
});
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

  const doc = new PDFDocument({ margin: 50 });
  const chunks: Buffer[] = [];

  const pdfBufferPromise = new Promise<Buffer>((resolve) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.fontSize(22).text("TRANSPORT SAAS", 50, 40);
  doc.fontSize(10).text("Bon de transport", 50, 68);

  doc.fontSize(20).text("BON DE TRANSPORT", 0, 110, {
    align: "center",
  });

  doc.fontSize(10).text(`Bon n° : BT-${String(livraison.id).slice(0, 8).toUpperCase()}`, 50, 150);
  doc.text(`Date édition : ${new Date().toLocaleDateString("fr-FR")}`, 50, 165);
  doc.text(`Statut : ${livraison.statut || "Prévue"}`, 50, 180);

  doc.moveTo(50, 205).lineTo(545, 205).stroke();

  doc.fontSize(14).text("Client", 50, 230);
  doc.fontSize(11).text(livraison.client || "Non renseigné", 50, 255);

  doc.fontSize(14).text("Trajet", 300, 230);
  doc.fontSize(11).text(`Départ : ${livraison.adresse_depart || ""}`, 300, 255);
  doc.text(`Arrivée : ${livraison.adresse_arrivee || ""}`, 300, 272);
  doc.text(`Date : ${livraison.date_livraison || "Non renseignée"}`, 300, 289);
  doc.text(`Heure limite : ${livraison.heure_limite || "Non renseignée"}`, 300, 306);

  doc.moveTo(50, 345).lineTo(545, 345).stroke();

  doc.fontSize(14).text("Affectation", 50, 370);
doc.fontSize(11).text(`Chauffeur : ${chauffeur?.nom || "Non affecté"}`, 50, 395);
doc.text(`Camion : ${camion?.immatriculation || "Non affecté"}`, 50, 412);
  doc.fontSize(14).text("Instructions", 300, 370);
  doc.fontSize(11).text("Vérifier le chargement avant départ.", 300, 395);
  doc.text("Faire signer à la livraison.", 300, 412);
  doc.text("Signaler tout incident immédiatement.", 300, 429);

  doc.moveTo(50, 500).lineTo(545, 500).stroke();

  doc.fontSize(12).text("Signature chauffeur :", 50, 530);
doc.rect(50, 555, 200, 70).stroke();

if (livraison.signature_chauffeur) {
  doc.fontSize(14).text(livraison.signature_chauffeur, 70, 585);
}

doc.fontSize(12).text("Signature destinataire :", 300, 530);
doc.rect(300, 555, 200, 70).stroke();

if (livraison.signature_destinataire) {
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

  doc.fontSize(9).text("Document généré automatiquement par Transport SaaS.", 50, 730, {
    align: "center",
  });

  doc.end();

  const pdfBuffer = await pdfBufferPromise;

  return new Response(new Uint8Array(pdfBuffer), {
  headers: {
    "Content-Type": "application/pdf",
    "Content-Disposition": `inline; filename="bon-transport-${String(livraison.id).slice(0, 8)}.pdf"`,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  },
});
}