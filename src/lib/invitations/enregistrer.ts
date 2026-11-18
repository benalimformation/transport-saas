import "server-only";

import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { genererJetonInvitation } from "./tokens";
import type { InvitationValidee } from "./validation";

export async function enregistrerInvitation(
  entrepriseId: string,
  administrateurId: string,
  invitation: InvitationValidee
) {
  const service = createSupabaseServiceClient();

  const { token, tokenHash } = genererJetonInvitation();

  const { data, error } = await service
    .from("invitations_collaborateurs")
    .insert({
      entreprise_id: entrepriseId,
      invite_par: administrateurId,
      email: invitation.email,
      nom: invitation.nom,
      role: invitation.role,
      token_hash: tokenHash,
    })
    .select("id, expires_at")
    .single();

  if (error) {
    throw new Error("Impossible d'enregistrer l'invitation.");
  }

  return {
    invitationId: data.id,
    expiresAt: data.expires_at,
    token,
  };
}