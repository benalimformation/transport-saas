import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createSupabaseServiceClient } from "../../../../lib/supabase/service";

export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    );

    const { data: { user }, error: authError } =
      await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, role } = body ?? {};

    if (
      typeof id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ||
      !["admin", "exploitant", "chauffeur", "client"].includes(role)
    ) {
      return NextResponse.json(
        { error: "Paramètres invalides" },
        { status: 400 }
      );
    }

    const service = createSupabaseServiceClient();

    const { data: acteur, error: acteurError } = await service
      .from("profils")
      .select("entreprise_id, role")
      .eq("id", user.id)
      .single();

    if (
      acteurError ||
      !acteur?.entreprise_id ||
      !["admin", "super_admin"].includes(acteur.role)
    ) {
      return NextResponse.json(
        { error: "Accès interdit" },
        { status: 403 }
      );
    }

    if (id === user.id) {
      return NextResponse.json(
        { error: "Modification de son propre rôle interdite" },
        { status: 403 }
      );
    }

    const { data: cible, error: cibleError } = await service
      .from("profils")
      .select("id, role, entreprise_id")
      .eq("id", id)
      .eq("entreprise_id", acteur.entreprise_id)
      .single();

    if (cibleError || !cible) {
      return NextResponse.json(
        { error: "Utilisateur introuvable dans cette entreprise" },
        { status: 404 }
      );
    }

    if (cible.role === "super_admin") {
      return NextResponse.json(
        { error: "Modification d'un super administrateur interdite" },
        { status: 403 }
      );
    }

    const { error: updateError } = await service
      .from("profils")
      .update({ role })
      .eq("id", id)
      .eq("entreprise_id", acteur.entreprise_id)
      .neq("role", "super_admin");

    if (updateError) {
      return NextResponse.json(
        { error: "Modification impossible" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
