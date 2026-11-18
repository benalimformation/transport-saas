import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  if (process.env.ROUTCH_INVITATIONS_ENABLED !== "true")
    return NextResponse.json({ error: "Invitations non activees." }, { status: 503 });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
  );
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user || !user.email_confirmed_at)
    return NextResponse.json({ error: "Confirmez votre email puis connectez-vous." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const token = body && typeof body.token === "string" ? body.token : "";
  if (!/^[0-9a-f]{64}$/.test(token))
    return NextResponse.json({ error: "Lien invalide." }, { status: 400 });
  const service = createSupabaseServiceClient();
  const { error: rpcError } = await service.rpc("accepter_invitation_collaborateur", {
    p_user_id: user.id, p_token: token,
  });
  if (rpcError) return NextResponse.json({ error: "Invitation invalide, expiree ou deja utilisee." }, { status: 400 });
  return NextResponse.json({ ok: true });
}
