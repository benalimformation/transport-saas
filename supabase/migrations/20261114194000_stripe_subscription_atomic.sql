-- Atomic Stripe subscription synchronization with optimistic concurrency.

ALTER TABLE public.entreprises
ADD COLUMN IF NOT EXISTS stripe_sync_version bigint NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.sync_stripe_subscription_atomic(
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_current_period_end timestamptz,
  p_cancel_at timestamptz,
  p_expected_subscription_id text,
  p_expected_version bigint
)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_subscription_id text;
  v_version bigint;
BEGIN
  SELECT stripe_subscription_id, stripe_sync_version
  INTO v_subscription_id, v_version
  FROM public.entreprises
  WHERE stripe_customer_id = p_customer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stripe customer not found';
  END IF;

  IF v_subscription_id IS DISTINCT FROM p_expected_subscription_id
     OR v_version IS DISTINCT FROM p_expected_version THEN
    RETURN 'conflict';
  END IF;

  IF p_status IS NULL OR p_status NOT IN (
    'trialing', 'active', 'past_due', 'canceled',
    'unpaid', 'incomplete', 'incomplete_expired', 'paused'
  ) THEN
    RAISE EXCEPTION 'Invalid Stripe subscription status';
  END IF;

  UPDATE public.entreprises
  SET
    stripe_subscription_id = p_subscription_id,
    subscription_status = p_status,
    current_period_end = p_current_period_end,
    cancel_at = p_cancel_at,
    stripe_sync_version = stripe_sync_version + 1
  WHERE stripe_customer_id = p_customer_id;

  RETURN 'updated';
END;
$$;

REVOKE ALL ON FUNCTION public.sync_stripe_subscription_atomic(
  text, text, text, timestamptz, timestamptz, text, bigint
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.sync_stripe_subscription_atomic(
  text, text, text, timestamptz, timestamptz, text, bigint
) TO service_role;