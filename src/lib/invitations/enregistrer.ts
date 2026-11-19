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

  // Libérer les invitations expirées avant toute nouvelle insertion.
  // La fonction SQL ne modifie que les invitations encore "pending"
  // dont la date d'expiration est dépassée.
  const { error: expirationError } = await service.rpc(
    "expirer_invitations_collaborateurs"
  );

  if (expirationError) {
    throw new Error("Impossible de vérifier les invitations expirées.");
  }

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