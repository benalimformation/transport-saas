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

  const doc = new PDFDocument({ margin: 35 });
  const chunks: Buffer[] = [];

  const pdfBufferPromise = new Promise<Buffer>((resolve) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  function box(x: number, y: number, w: number, h: number, title: string, value?: string) {
    doc.rect(x, y, w, h).stroke();
    doc.fontSize(8).text(title, x + 5, y + 5);
    doc.fontSize(10).text(value || "Non renseigné", x + 5, y + 22, {
      width: w - 10,
      height: h - 25,
    });
  }

  const dateLivraison = livraison.date_livraison
    ? new Date(livraison.date_livraison).toLocaleDateString("fr-FR")
    : "Non renseignée";

  const heureLimite = livraison.heure_limite
    ? livraison.heure_limite.slice(0, 5)
    : "Non renseignée";

  doc.fontSize(18).text("LETTRE DE VOITURE INTERNATIONALE", 35, 25);
  doc.fontSize(20).text("CMR", 480, 25);
  doc.fontSize(8).text("Convention relative au contrat de transport international de marchandises par route", 35, 50);

  doc.fontSize(9).text(`CMR n° : CMR-${String(livraison.id).slice(0, 8).toUpperCase()}`, 35, 70);
  doc.text(`Date édition : ${new Date().toLocaleDateString("fr-FR")}`, 250, 70);
  doc.text(`Statut : ${livraison.statut || "Prévue"}`, 420, 70);

  box(35, 95, 250, 70, "1. Expéditeur", livraison.client || "");
  box(285, 95, 270, 70, "2. Destinataire", livraison.destinataire || livraison.client || "");

  box(35, 165, 250, 70, "3. Lieu prévu pour la livraison", livraison.adresse_arrivee || "");
  box(
    285,
    165,
    270,
    70,
    "4. Lieu et date de prise en charge",
    `${livraison.lieu_prise_en_charge || livraison.adresse_depart || ""}\nDate : ${dateLivraison}\nHeure : ${heureLimite}`
  );

  box(35, 235, 250, 55, "5. Documents annexés", livraison.documents_annexes || "Bon de transport");
  box(285, 235, 270, 55, "6. Marques et numéros", String(livraison.id).slice(0, 8));

  box(35, 290, 130, 55, "7. Nombre de colis", livraison.nombre_colis || "");
  box(165, 290, 120, 55, "8. Mode d'emballage", livraison.emballage || "");
  box(285, 290, 270, 55, "9. Nature de la marchandise", livraison.marchandises || "");

  box(35, 345, 130, 55, "10. Poids brut", livraison.poids_brut || "");
  box(165, 345, 120, 55, "11. Volume", livraison.volume || "");
  box(
    285,
    345,
    270,
    55,
    "12. Instructions de l'expéditeur",
    livraison.instructions_cmr || "Vérifier le chargement avant départ."
  );

  box(
    35,
    400,
    250,
    65,
    "16. Transporteur",
    `Transport SaaS\nChauffeur : ${chauffeur?.nom || "Non affecté"}\nCamion : ${camion?.immatriculation || "Non affecté"}`
  );

  box(
    285,
    400,
    270,
    65,
    "18. Réserves et observations du transporteur",
    livraison.reserves || "Aucune réserve déclarée"
  );

  box(35, 465, 250, 55, "19. Conventions particulières", "Selon conditions convenues entre les parties.");
  box(285, 465, 270, 55, "21. Établi à / Date", `${livraison.adresse_depart || ""}\n${new Date().toLocaleDateString("fr-FR")}`);

  doc.rect(35, 540, 170, 95).stroke();
  doc.fontSize(8).text("22. Signature et cachet de l'expéditeur", 40, 548);
  doc.fontSize(11).text(livraison.client || "", 45, 590);

  doc.rect(210, 540, 170, 95).stroke();
  doc.fontSize(8).text("23. Signature et cachet du transporteur", 215, 548);
  doc.fontSize(11).text(livraison.signature_chauffeur || chauffeur?.nom || "", 220, 590);

  doc.rect(385, 540, 170, 95).stroke();
  doc.fontSize(8).text("24. Signature et cachet du destinataire", 390, 548);
  doc.fontSize(11).text(livraison.signature_destinataire || "", 395, 590);

  doc.fontSize(7).text(
    "Document CMR généré automatiquement par Transport SaaS. Document à vérifier et compléter selon les exigences réglementaires applicables.",
    35,
    660,
    { align: "center", width: 520 }
  );

  doc.end();

  const pdfBuffer = await pdfBufferPromise;

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="cmr-${String(livraison.id).slice(0, 8)}.pdf"`,
    },
  });
}