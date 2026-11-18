import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { validerInvitation } from "@/lib/invitations/validation";
import { enregistrerInvitation } from "@/lib/invitations/enregistrer";

export async function POST(request: NextRequest) {
  try {
    // Désactivé jusqu'à application contrôlée des migrations et validation du parcours.
    if (process.env.ROUTCH_INVITATIONS_ENABLED !== "true") {
      return NextResponse.json({ error: "Invitations non activees." }, { status: 503 });
    }
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || !user.email_confirmed_at) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }
    const service = createSupabaseServiceClient();
    const { data: profil, error: profilError } = await service.from("profils")
      .select("entreprise_id,role").eq("id", user.id).single();
    if (profilError || !profil || !profil.entreprise_id ||
        !["admin", "super_admin"].includes(profil.role)) {
      return NextResponse.json({ error: "Acces refuse." }, { status: 403 });
    }
    const invitation = validerInvitation(await request.json().catch(() => null));
    if (!invitation) return NextResponse.json({ error: "Donnees invalides." }, { status: 400 });
    // Ne pas permettre d'inviter une adresse déjà utilisée.
    // La protection d'unicité des invitations pending reste assurée par SQL.
    const saved = await enregistrerInvitation(profil.entreprise_id, user.id, invitation);
    const origin = new URL(request.url).origin;
    const link = `${origin}/invitation?token=${encodeURIComponent(saved.token)}&email=${encodeURIComponent(invitation.email)}`;
    // Lien communiqué à l'administrateur pour transmission privée.
    // Aucun envoi d'email n'est prétendu ici.
    return NextResponse.json({ invitationId: saved.invitationId, expiresAt: saved.expiresAt, link }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invitation impossible (adresse ou invitation deja existante)." }, { status: 409 });
  }
}
