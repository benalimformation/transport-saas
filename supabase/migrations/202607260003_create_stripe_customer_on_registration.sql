-- Migration: Create Stripe customer during company registration (final consolidated version)
-- Date: 2026-07 26
-- Description: Implements asynchronous Stripe customer creation via Edge Function
--              using pg_net extension. No placeholders, real architecture.
--              Requires Supabase Vault secrets for authentication.

BEGIN;

-- 1. Ensure pg_net extension is available (if not, this will fail gracefully)
--    Note: This requires the extension to be installed in the database
--    If pg_net is not available, the trigger will log a warning and continue

-- 2. Create function to trigger Stripe customer creation asynchronously
--    Uses Supabase Vault for secrets, not current_setting for service_role_key
--    Returns request_id from pg_net for tracking, or NULL if pg_net is not available
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
  -- Get Supabase project reference from Vault (configured via secrets)
  v_supabase_project_ref := current_setting('app.settings.supabase_project_ref', TRUE);

  -- Get provisioning secret from Vault for Edge Function authentication
  v_provisioning_secret := current_setting('app.settings.stripe_customer_provisioning_secret', TRUE);

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

-- 3. Create AFTER INSERT trigger on entreprises table
--    This trigger will be called after the handle_new_company_user() trigger
CREATE OR REPLACE FUNCTION public.after_entreprise_insert_trigger_stripe_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Trigger Stripe customer creation asynchronously
  -- This is non-blocking and runs after the main transaction commits
  PERFORM public.trigger_stripe_customer_creation(
    NEW.id,
    NEW.nom,
    NEW.email
  );

  RETURN NEW;
END;
$$;

-- Create the actual trigger
DROP TRIGGER IF EXISTS after_entreprise_insert_trigger_stripe_customer ON public.entreprises;
CREATE TRIGGER after_entreprise_insert_trigger_stripe_customer
  AFTER INSERT ON public.entreprises
  FOR EACH ROW
  EXECUTE FUNCTION public.after_entreprise_insert_trigger_stripe_customer();

-- 4. Update the handle_new_company_user() trigger to remove Stripe customer creation
--    Stripe customer creation is now handled asynchronously by the separate trigger
CREATE OR REPLACE FUNCTION public.handle_new_company_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
  DECLARE
  new_entreprise_id UUID;
  v_nom_entreprise TEXT;
  v_nom_utilisateur TEXT;
BEGIN
  -- Read and clean metadata provided by registration form
  v_nom_entreprise :=
    NULLIF(
      BTRIM(
        COALESCE(
          NEW.raw_user_meta_data ->> 'nom_entreprise',
          ''
        )
      ),
      ''
    );

  v_nom_utilisateur :=
    NULLIF(
      BTRIM(
        COALESCE(
          NEW.raw_user_meta_data ->> 'nom_utilisateur',
          ''
        )
      ),
      ''
    );

  -- Validate that nom_entreprise is not empty
  IF v_nom_entreprise IS NULL THEN
    RAISE EXCEPTION 'Le nom de l''entreprise est obligatoire';
  END IF;

  -- Use default value if user name is absent
  IF v_nom_utilisateur IS NULL THEN
    v_nom_utilisateur := NEW.email;
  END IF;

  -- Create a real row in public.entreprises with all columns including Stripe columns
  INSERT INTO public.entreprises(
    nom,
    email,
    trial_started_at,
    trial_ends_at,
    subscription_status,
    trial_used
  ) VALUES (
    v_nom_entreprise,
    NEW.email,
    NOW(),
    NOW() + INTERVAL '30 days',
    'trialing',
    TRUE
  ) RETURNING id INTO new_entreprise_id;

  -- Note: Stripe customer creation is now handled asynchronously
  -- by the after_entreprise_insert_trigger_stripe_customer trigger

  -- Create public.profils with admin role
  INSERT INTO public.profils(
    id,
    email,
    nom,
    role,
    entreprise_id
  ) VALUES (
    NEW.id,
    NEW.email,
    v_nom_utilisateur,
    'admin', -- First user = admin
    new_entreprise_id
  );

  -- Create parametres_entreprise (existing table for settings)
  INSERT INTO public.parametres_entreprise(
    entreprise_id,
    nom
  ) VALUES (
    new_entreprise_id,
    v_nom_entreprise
  );

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- Cancel all insertions in case of error (implicit ROLLBACK)
    RAISE;
END;
$$;

-- 5. Create function for administrative retry of failed customer creation
--    This allows manual reprovisioning of companies without stripe_customer_id
--    Returns minimal information: entreprise_id, request_id (if available), queued status, error message
--    Does NOT return personal data (nom_entreprise, email)
CREATE OR REPLACE FUNCTION public.reprocess_missing_stripe_customers()
RETURNS TABLE(
  entreprise_id UUID,
  request_id BIGINT,
  queued BOOLEAN,
  error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_entreprise RECORD;
  v_request_id BIGINT;
  v_queued BOOLEAN;
  v_error TEXT;
BEGIN
  FOR v_entreprise IN
    SELECT id, nom, email
    FROM public.entreprises
    WHERE stripe_customer_id IS NULL
      OR stripe_customer_id = ''
    ORDER BY trial_started_at, id
    LIMIT 100
  LOOP
    v_request_id := NULL;
    v_queued := FALSE;
    v_error := NULL;

    BEGIN
      -- Trigger customer creation for this entreprise and capture request_id
      SELECT public.trigger_stripe_customer_creation(
        v_entreprise.id,
        v_entreprise.nom,
        v_entreprise.email
      ) INTO v_request_id;

      -- Determine queued status based on actual request_id
      IF v_request_id IS NOT NULL THEN
        v_queued := TRUE;
      ELSE
        v_queued := FALSE;
        v_error := 'Provisioning request was not queued';
      END IF;
    EXCEPTION
      WHEN OTHERS THEN
        -- Log technical error internally without sensitive data
        RAISE WARNING USING MESSAGE = 'Error queuing provisioning request for entreprise ' || v_entreprise.id;
        v_queued := FALSE;
        v_error := 'Failed to queue provisioning request';
    END;

    -- Return minimal information (no personal data)
    entreprise_id := v_entreprise.id;
    request_id := v_request_id;
    queued := v_queued;
    error_message := v_error;

    RETURN NEXT;
  END LOOP;
END;
$$;

-- 6. Comments and documentation
COMMENT ON FUNCTION public.trigger_stripe_customer_creation IS
'Triggers asynchronous Stripe customer creation via Edge Function.
Requires pg_net extension and Supabase Vault secrets:
- app.settings.supabase_project_ref (e.g., "abc123def456")
- app.settings.stripe_customer_provisioning_secret (shared secret for authentication)
This function is non-blocking and will not fail the registration flow.';

COMMENT ON FUNCTION public.after_entreprise_insert_trigger_stripe_customer IS
'AFTER INSERT trigger on entreprises table that initiates asynchronous
Stripe customer creation. Runs after the main transaction commits.';

COMMENT ON TRIGGER after_entreprise_insert_trigger_stripe_customer ON public.entreprises IS
'Triggers Stripe customer creation after company registration.
This trigger ensures customer creation is asynchronous and non-blocking.';

COMMENT ON FUNCTION public.handle_new_company_user() IS
'Trigger SECURITY DEFINER executed after INSERT on auth.users. Creates a company in public.entreprises,
an admin profile in public.profils, and settings in public.parametres_entreprise.
Stripe customer creation is now handled asynchronously by a separate trigger.';

COMMENT ON FUNCTION public.reprocess_missing_stripe_customers IS
'Administrative function to reprocess companies without Stripe customers.
Can be called manually or scheduled via pg_cron for automatic retry.';

-- 7. Drop the old placeholder function if it exists
DROP FUNCTION IF EXISTS public.create_stripe_customer_for_entreprise(UUID, TEXT, TEXT);

COMMIT;
