import { serve } from "https://deno.land/std@0.223.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.22.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateStripeCustomerRequest {
  entreprise_id: string;
  // Optional: pass these if trigger doesn't fetch from DB
  nom_entreprise?: string;
  email?: string;
}

interface StripeCustomerMetadata {
  entreprise_id: string;
  trial_started_at: string;
  trial_ends_at: string;
  subscription_status: string;
  environment: "test" | "production";
}

// Secure comparison function to prevent timing attacks
function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Validate request method
    if (req.method !== "POST") {
      return new Response(JSON.stringify({
        error: "Method not allowed. Use POST.",
      }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate provisioning secret
    const provisioningSecret = req.headers.get("x-provisioning-secret");
    const expectedSecret = Deno.env.get("STRIPE_CUSTOMER_PROVISIONING_SECRET");

    if (!provisioningSecret || !expectedSecret || !secureCompare(provisioningSecret, expectedSecret)) {
      return new Response(JSON.stringify({
        error: "Unauthorized. Invalid or missing provisioning secret.",
      }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse and validate request body
    const requestData: CreateStripeCustomerRequest = await req.json();

    if (!requestData.entreprise_id) {
      return new Response(JSON.stringify({
        error: "Missing required field: entreprise_id",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const entrepriseId = requestData.entreprise_id;

    // Validate UUID format (basic check)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(entrepriseId)) {
      return new Response(JSON.stringify({
        error: "Invalid entreprise_id format. Must be a valid UUID.",
      }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 1. Check if stripe_customer_id already exists (idempotence)
    const { data: entrepriseData, error: entrepriseError } = await supabaseClient
      .from("entreprises")
      .select("stripe_customer_id, nom, email, trial_started_at, trial_ends_at, subscription_status")
      .eq("id", entrepriseId)
      .single();

    if (entrepriseError || !entrepriseData) {
      console.error(
        `Failed to fetch entreprise ${entrepriseId}:`,
        entrepriseError?.message || "No data returned"
      );
      return new Response(JSON.stringify({
        error: `Entreprise not found: ${entrepriseId}`,
        details: entrepriseError?.message,
      }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If stripe_customer_id already exists and is not empty, return success
    if (entrepriseData.stripe_customer_id && entrepriseData.stripe_customer_id.trim() !== "") {
      console.log(`Stripe customer already exists for entreprise ${entrepriseId}: ${entrepriseData.stripe_customer_id}`);
      return new Response(JSON.stringify({
        success: true,
        stripe_customer_id: entrepriseData.stripe_customer_id,
        already_exists: true,
        message: "Customer already exists",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Initialize Stripe client
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY environment variable is not set");
      return new Response(JSON.stringify({
        error: "Stripe configuration missing. STRIPE_SECRET_KEY not set.",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 3. Prepare metadata
    // Determine environment from Stripe secret key (test keys start with sk_test_)
    const environment: "test" | "production" = stripeSecretKey.startsWith("sk_test_") ? "test" : "production";

    const metadata: StripeCustomerMetadata = {
      entreprise_id: entrepriseId,
      trial_started_at: entrepriseData.trial_started_at,
      trial_ends_at: entrepriseData.trial_ends_at,
      subscription_status: entrepriseData.subscription_status,
      environment: environment,
    };

    // Use passed values or fallback to database values
    const nomEntreprise = requestData.nom_entreprise || entrepriseData.nom;
    const email = requestData.email || entrepriseData.email;

    // 4. Additional idempotence check: search for existing Stripe customer by metadata
    // This provides fallback protection beyond the 24-hour Stripe idempotency window
    let existingCustomerId: string | null = null;

    try {
      const searchResult = await stripe.customers.search({
        query: `metadata["entreprise_id"]:"${entrepriseId}"`,
      });

      if (searchResult.data.length > 0) {
        existingCustomerId = searchResult.data[0].id;
        console.log(`Found existing Stripe customer for entreprise ${entrepriseId} via metadata search: ${existingCustomerId}`);
      }
    } catch (searchError) {
      // Metadata search is optional, log but continue
      console.log(`Metadata search for entreprise ${entrepriseId} failed or returned no results:`, searchError);
    }

    // If we found an existing customer via metadata search, use it
    if (existingCustomerId) {
      // Update database with the found customer ID
      const { error: updateError } = await supabaseClient
        .from("entreprises")
        .update({ stripe_customer_id: existingCustomerId })
        .eq("id", entrepriseId);

      if (updateError) {
        console.error(
          `Failed to update stripe_customer_id with existing customer for entreprise ${entrepriseId}:`,
          updateError.message
        );
        return new Response(JSON.stringify({
          error: "Failed to update database with existing Stripe customer",
          details: updateError.message,
        }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({
        success: true,
        stripe_customer_id: existingCustomerId,
        found_via_metadata: true,
        message: "Existing Stripe customer found via metadata and linked to entreprise",
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 5. Create Stripe customer with idempotency key
    const idempotencyKey = `transport-erp-customer-${entrepriseId}`;

    console.log(`Creating Stripe customer for entreprise ${entrepriseId} with idempotency key: ${idempotencyKey}`);

    const customer = await stripe.customers.create({
      name: nomEntreprise,
      email: email,
      metadata: {
        ...metadata,
        created_by: "transport-erp-edge-function",
        created_at: new Date().toISOString(),
      },
      description: `Client TransportERP: ${nomEntreprise}`,
    }, {
      idempotencyKey: idempotencyKey,
    });

    console.log(`Stripe customer created successfully: ${customer.id}`);

    // 6. Update database with stripe_customer_id
    const { error: updateError } = await supabaseClient
      .from("entreprises")
      .update({ stripe_customer_id: customer.id })
      .eq("id", entrepriseId);

    if (updateError) {
      // CRITICAL: If database update fails, we must return an error
      // We cannot return success because the customer ID is not stored in our database
      console.error(
        `Failed to update stripe_customer_id for entreprise ${entrepriseId}:`,
        updateError.message
      );

      // DO NOT delete the Stripe customer - it exists and can be linked later
      // Log minimal information for administrative linking
      console.error(`Failed to persist Stripe customer for entreprise ${entrepriseId}`);

      return new Response(JSON.stringify({
        error: "Failed to update database with Stripe customer ID",
        details: "Database update failed. Administrative intervention required.",
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 7. Return success response
    return new Response(JSON.stringify({
      success: true,
      stripe_customer_id: customer.id,
      entreprise_id: entrepriseId,
      nom_entreprise: nomEntreprise,
      email: email,
      metadata: metadata,
      message: "Stripe customer created successfully and linked to entreprise",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    // Log the full error for debugging
    console.error("Error in create-stripe-customer Edge Function:", error);

    // Return a structured error response
    return new Response(JSON.stringify({
      error: "Failed to create Stripe customer",
      message: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      // Don't expose internal details to the client
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
