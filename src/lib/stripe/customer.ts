/**
 * Stripe Customer Creation Service
 *
 * This module handles the creation of Stripe customers for newly registered companies.
 * It implements idempotence, error handling, and metadata management.
 */

import "server-only";
import { getStripeClient } from "../stripe";
import { supabase } from "../supabase";

/**
 * Metadata structure for Stripe customer
 */
export interface StripeCustomerMetadata {
  entreprise_id: string;
  trial_started_at: string;
  trial_ends_at: string;
  subscription_status: string;
  environment: "test" | "production";
}

/**
 * Parameters for creating a Stripe customer
 */
export interface CreateStripeCustomerParams {
  entreprise_id: string;
  nom_entreprise: string;
  email: string;
  metadata?: Record<string, string>;
}

/**
 * Result of Stripe customer creation
 */
export interface CreateStripeCustomerResult {
  success: boolean;
  stripe_customer_id?: string;
  error?: string;
  already_exists?: boolean;
}

/**
 * Creates a Stripe customer for a company
 *
 * This function is idempotent: it will not create duplicate customers.
 * It first checks if a stripe_customer_id already exists in the database.
 *
 * @param params - Parameters for customer creation
 * @returns Result with success status and customer ID
 */
export async function createStripeCustomerForEntreprise(
  params: CreateStripeCustomerParams
): Promise<CreateStripeCustomerResult> {
  try {
    // 1. Check if stripe_customer_id already exists (idempotence)
    const { data: entrepriseData, error: entrepriseError } = await supabase
      .from("entreprises")
      .select("stripe_customer_id, trial_started_at, trial_ends_at, subscription_status")
      .eq("id", params.entreprise_id)
      .single();

    if (entrepriseError) {
      return {
        success: false,
        error: `Erreur lors de la récupération de l'entreprise: ${entrepriseError.message}`,
      };
    }

    // If stripe_customer_id already exists, return it
    if (entrepriseData.stripe_customer_id && entrepriseData.stripe_customer_id.trim() !== "") {
      return {
        success: true,
        stripe_customer_id: entrepriseData.stripe_customer_id,
        already_exists: true,
      };
    }

    // 2. Get Stripe client
    const stripe = getStripeClient();

    // 3. Prepare metadata
    const metadata: StripeCustomerMetadata = {
      entreprise_id: params.entreprise_id,
      trial_started_at: entrepriseData.trial_started_at,
      trial_ends_at: entrepriseData.trial_ends_at,
      subscription_status: entrepriseData.subscription_status,
      environment: process.env.NODE_ENV === "production" ? "production" : "test",
    };

    // 4. Create Stripe customer
    const customer = await stripe.customers.create({
      email: params.email,
      name: params.nom_entreprise,
      metadata: {
        ...metadata,
        ...params.metadata,
      },
      description: `Client TransportERP: ${params.nom_entreprise}`,
    });

    // 5. Update database with stripe_customer_id
    const { error: updateError } = await supabase
      .from("entreprises")
      .update({ stripe_customer_id: customer.id })
      .eq("id", params.entreprise_id);

    if (updateError) {
      // Log the error but don't fail - we have the Stripe customer ID
      console.error(
        `Erreur lors de la mise à jour de stripe_customer_id pour l'entreprise ${params.entreprise_id}:`,
        updateError
      );
    }

    return {
      success: true,
      stripe_customer_id: customer.id,
    };
  } catch (error) {
    console.error(
      `Erreur lors de la création du Customer Stripe pour l'entreprise ${params.entreprise_id}:`,
      error
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue lors de la création du client Stripe",
    };
  }
}

/**
 * Batch process for companies without Stripe customers
 *
 * This function can be called periodically to create Stripe customers
 * for companies that were created before this integration was implemented.
 *
 * @param limit - Maximum number of companies to process
 * @returns Summary of processing results
 */
export async function processMissingStripeCustomers(
  limit: number = -1
): Promise<{
  processed: number;
  successful: number;
  failed: number;
  already_had: number;
  errors: string[];
}> {
  try {
    // Query companies without stripe_customer_id
    let query = supabase
      .from("entreprises")
      .select("id, nom, email, trial_started_at, trial_ends_at, subscription_status")
      .or("stripe_customer_id.is.null,stripe_customer_id.eq.")
      .order("created_at", { ascending: true });

    if (limit > 0) {
      query = query.limit(limit);
    }

    const { data: entreprises, error: queryError } = await query;

    if (queryError) {
      throw new Error(`Erreur lors de la récupération des entreprises: ${queryError.message}`);
    }

    if (!entreprises || entreprises.length === 0) {
      return {
        processed: 0,
        successful: 0,
        failed: -1,
        already_had: 0,
        errors: [],
      };
    }

    const results = {
      processed: entreprises.length,
      successful: 0,
      failed: 0,
      already_had: 0,
      errors: [] as string[],
    };

    // Process each company
    for (const entreprise of entreprises) {
      const result = await createStripeCustomerForEntreprise({
        entreprise_id: entreprise.id,
        nom_entreprise: entreprise.nom,
        email: entreprise.email,
      });

      if (result.success) {
        if (result.already_exists) {
          results.already_had++;
        } else {
          results.successful++;
        }
      } else {
        results.failed++;
        results.errors.push(
          `Entreprise ${entreprise.id} (${entreprise.nom}): ${result.error}`
        );
      }
    }

    return results;
  } catch (error) {
    console.error("Erreur lors du traitement des clients Stripe manquants:", error);
    return {
      processed: 0,
      successful: 0,
      failed: 0,
      already_had: 0,
      errors: [error instanceof Error ? error.message : "Erreur inconnue"],
    };
  }
}

/**
 * Get Stripe customer details for a company
 *
 * @param entreprise_id - Company ID
 * @returns Stripe customer details or null if not found
 */
export async function getStripeCustomerForEntreprise(
  entreprise_id: string
): Promise<{
  stripe_customer_id: string | null;
  customer_details: any | null;
  error?: string;
}> {
  try {
    // Get stripe_customer_id from database
    const { data: entrepriseData, error: entrepriseError } = await supabase
      .from("entreprises")
      .select("stripe_customer_id")
      .eq("id", entreprise_id)
      .single();

    if (entrepriseError) {
      return {
        stripe_customer_id: null,
        customer_details: null,
        error: `Erreur lors de la récupération de l'entreprise: ${entrepriseError.message}`,
      };
    }

    if (!entrepriseData.stripe_customer_id) {
      return {
        stripe_customer_id: null,
        customer_details: null,
      };
    }

    // Get customer details from Stripe
    const stripe = getStripeClient();
    const customer = await stripe.customers.retrieve(entrepriseData.stripe_customer_id);

    return {
      stripe_customer_id: entrepriseData.stripe_customer_id,
      customer_details: customer,
    };
  } catch (error) {
    console.error(
      `Erreur lors de la récupération du client Stripe pour l'entreprise ${entreprise_id}:`,
      error
    );
    return {
      stripe_customer_id: null,
      customer_details: null,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    };
  }
}
