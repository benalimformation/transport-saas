-- Migration: Fix Stripe customer provisioning to use Vault secrets correctly
-- Date: 2026-08-15
-- Description: Corrects the trigger_stripe_customer_creation function to properly read secrets from Vault
--              instead of current_setting. This ensures the provisioning process can access
--              the required secrets for creating Stripe customers.

BEGIN;

-- Create or replace the function to use Vault secrets for provisioning
CREATE OR REPLACE FUNCTION public.trigger_stripe_customer_creation(
  p_entreprise_id UUID,
  p_nom_entreprise TEXT,
  p_email TEXT
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_edge_function_url TEXT;
  v_provisioning_secret TEXT;
  v_supabase_project_ref TEXT;
  v_request_id BIGINT;
BEGIN
  -- Get Supabase project reference from Vault
  SELECT decrypted_secret
  INTO v_supabase_project_ref
  FROM vault.decrypted_secrets
  WHERE name = 'app.settings.supabase_project_ref'
  LIMIT 1;

  -- Get provisioning secret from Vault for Edge Function authentication
  SELECT decrypted_secret
  INTO v_provisioning_secret
  FROM vault.decrypted_secrets
  WHERE name = 'app.settings.stripe_customer_provisioning_secret'
  LIMIT 1;

  IF v_supabase_project_ref IS NULL OR v_supabase_project_ref = '' THEN
    -- Log warning but don't fail - this is non-blocking
    RAISE LOG 'Skipping Stripe customer creation: Supabase project ref not configured in Vault';
    RETURN NULL;
  END IF;

  IF v_provisioning_secret IS NULL OR v_provisioning_secret = '' THEN
    RAISE LOG 'Skipping Stripe customer creation: Provisioning secret not configured in Vault';
    RETURN NULL;
  END IF;

  -- Construct Edge Function URL using project reference
  v_edge_function_url := 'https://' || v_supabase_project_ref || '.supabase.co/functions/v1/create-stripe-customer';

  -- Call Edge Function asynchronously via pg_net
  -- Note: This requires the pg_net extension to be installed
  BEGIN
    SELECT net.http_post(
      url := v_edge_function_url,
      body := json_build_object(
        'entreprise_id', p_entreprise_id::text,
        'nom_entreprise', p_nom_entreprise,
        'email', p_email
      )::text,
      headers := json_build_object(
        'Content-Type', 'application/json',
        'x-provisioning-secret', v_provisioning_secret
      )::text,
      timeout_milliseconds := 30000
    ) INTO v_request_id;

    RAISE LOG 'Triggered Stripe customer creation for entreprise % via Edge Function (request_id: %)', p_entreprise_id, v_request_id;
    RETURN v_request_id;

  EXCEPTION
    WHEN undefined_function THEN
      -- pg_net extension not installed - log warning
      RAISE LOG 'pg_net extension not available. Stripe customer creation for entreprise % will be handled externally.', p_entreprise_id;
      RETURN NULL;
    WHEN OTHERS THEN
      -- Any other error - log but don't fail
      RAISE LOG 'Error triggering Stripe customer creation for entreprise %: %', p_entreprise_id, SQLERRM;
      RETURN NULL;
  END;
END;
$$;

-- Add comments to document the changes
COMMENT ON FUNCTION public.trigger_stripe_customer_creation IS
'Triggers asynchronous Stripe customer creation via Edge Function.
Requires pg_net extension and Vault secrets:
- app.settings.supabase_project_ref (e.g., "abc123def456")
- app.settings.stripe_customer_provisioning_secret (shared secret for authentication)
This function is non-blocking and will not fail the registration flow.';

COMMIT;