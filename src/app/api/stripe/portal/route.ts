import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getStripeClient } from "../../../../lib/stripe";

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll() {
            // Lecture seule ici : aucune écriture de cookie nécessaire.
          },
        },
      }
    );

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          error: "Non authentifié",
          message: "Vous devez être connecté pour gérer votre abonnement",
          reason: "not_authenticated",
        },
        { status: 401 }
      );
    }

    const { data: profil, error: profilError } = await supabase
      .from("profils")
      .select("entreprise_id")
      .eq("id", user.id)
      .single();

    if (profilError || !profil?.entreprise_id) {
      return NextResponse.json(
        {
          error: "Profil introuvable",
          message: "Impossible de trouver votre profil ou entreprise associée",
          reason: "profile_or_company_missing",
        },
        { status: 404 }
      );
    }

    const { data: entreprise, error: entrepriseError } = await supabase
      .from("entreprises")
      .select("stripe_customer_id")
      .eq("id", profil.entreprise_id)
      .single();

    if (entrepriseError || !entreprise) {
      return NextResponse.json(
        {
          error: "Entreprise introuvable",
          message: "Impossible de trouver votre entreprise",
          reason: "company_missing",
        },
        { status: 404 }
      );
    }

    if (!entreprise.stripe_customer_id) {
      return NextResponse.json(
        {
          error: "Compte Stripe indisponible",
          message: "Aucun compte Stripe n'est associé à cette entreprise",
          reason: "stripe_customer_missing",
        },
        { status: 409 }
      );
    }

    const stripe = getStripeClient();
    const origin = new URL(request.url).origin;

    const session = await stripe.billingPortal.sessions.create({
      customer: entreprise.stripe_customer_id,
      return_url: `${origin}/abonnement`,
    });

    return NextResponse.json({
      url: session.url,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Erreur inconnue";

    console.error("Stripe customer portal error:", errorMessage);

    return NextResponse.json(
      {
        error: "Erreur serveur",
        message: errorMessage,
        details:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.stack
              : String(error)
            : undefined,
      },
      { status: 500 }
    );
  }
}