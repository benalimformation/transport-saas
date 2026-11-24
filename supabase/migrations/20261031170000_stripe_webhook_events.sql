-- Create the stripe_webhook_events table
CREATE TABLE public.stripe_webhook_events (
  id VARCHAR(255) PRIMARY KEY,
  type VARCHAR(255) NOT NULL,
  livemode BOOLEAN NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  reservation_token UUID,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  lock_expires_at TIMESTAMPTZ,
  last_error TEXT,
  CONSTRAINT valid_status CHECK (status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create indexes
CREATE INDEX idx_stripe_webhook_events_status ON public.stripe_webhook_events(status);
CREATE INDEX idx_stripe_webhook_events_livemode ON public.stripe_webhook_events(livemode);
CREATE INDEX idx_stripe_webhook_events_reservation_token ON public.stripe_webhook_events(reservation_token);

-- Enable RLS
ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.reserve_stripe_event(
  p_event_id VARCHAR(255),
  p_event_type VARCHAR(255),
  p_livemode BOOLEAN
)
RETURNS TABLE (
  success BOOLEAN,
  reservation_token UUID,
  message TEXT
)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  v_new_token UUID := gen_random_uuid();
  v_reserved_id VARCHAR(255);
  v_existing_event public.stripe_webhook_events%ROWTYPE;
BEGIN
  INSERT INTO public.stripe_webhook_events AS e (
    id,
    type,
    livemode,
    status,
    reservation_token,
    lock_expires_at,
    attempt_count
  )
  VALUES (
    p_event_id,
    p_event_type,
    p_livemode,
    'processing',
    v_new_token,
    NOW() + INTERVAL '5 minutes',
    1
  )
  ON CONFLICT (id)
  DO UPDATE SET
    status = 'processing',
    reservation_token = EXCLUDED.reservation_token,
    lock_expires_at = EXCLUDED.lock_expires_at,
    attempt_count = e.attempt_count + 1,
    last_error = NULL
  WHERE
    e.type = EXCLUDED.type
    AND e.livemode = EXCLUDED.livemode
    AND (
      e.status IN ('pending', 'failed')
      OR (
        e.status = 'processing'
        AND (
          e.lock_expires_at IS NULL
          OR e.lock_expires_at <= NOW()
        )
      )
    )
  RETURNING e.id INTO v_reserved_id;

  IF v_reserved_id IS NOT NULL THEN
    RETURN QUERY
    SELECT TRUE, v_new_token, 'reserved'::TEXT;
    RETURN;
  END IF;

  SELECT *
  INTO v_existing_event
  FROM public.stripe_webhook_events AS e
  WHERE e.id = p_event_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Stripe event not found after reservation conflict: %',
      p_event_id;
  END IF;

  IF v_existing_event.type IS DISTINCT FROM p_event_type
     OR v_existing_event.livemode IS DISTINCT FROM p_livemode THEN
    RETURN QUERY
    SELECT FALSE, NULL::UUID, 'inconsistent_event'::TEXT;
    RETURN;
  END IF;

  IF v_existing_event.status = 'completed' THEN
    RETURN QUERY
    SELECT FALSE, NULL::UUID, 'already_completed'::TEXT;
    RETURN;
  END IF;

  IF v_existing_event.status = 'processing' THEN
    RETURN QUERY
    SELECT FALSE, NULL::UUID, 'currently_locked'::TEXT;
    RETURN;
  END IF;

  RAISE EXCEPTION
    'Unexpected Stripe reservation state for event %',
    p_event_id;
END;
$$;

-- Create the complete_stripe_event function
CREATE OR REPLACE FUNCTION public.complete_stripe_event(
  p_event_id VARCHAR(255),
  p_reservation_token UUID
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
BEGIN
  UPDATE public.stripe_webhook_events
  SET
    status = 'completed',
    processed_at = NOW(),
    lock_expires_at = NULL,
    reservation_token = NULL
  WHERE
    id = p_event_id AND
    status = 'processing' AND
    reservation_token = p_reservation_token;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Event completed successfully';
  ELSE
    RETURN QUERY SELECT FALSE, 'Failed to complete event';
  END IF;

END;
$$ LANGUAGE plpgsql;

-- Create the fail_stripe_event function
CREATE OR REPLACE FUNCTION public.fail_stripe_event(
  p_event_id VARCHAR(255),
  p_reservation_token UUID,
  p_error_message TEXT
) RETURNS TABLE (
  success BOOLEAN,
  message TEXT
) AS $$
BEGIN
  UPDATE public.stripe_webhook_events
  SET
    status = 'failed',
    last_error = p_error_message,
    lock_expires_at = NULL,
    reservation_token = NULL
  WHERE
    id = p_event_id AND
    status = 'processing' AND
    reservation_token = p_reservation_token;

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, 'Event marked as failed';
  ELSE
    RETURN QUERY SELECT FALSE, 'Failed to mark event as failed';
  END IF;

END;
$$ LANGUAGE plpgsql;

-- Set search_path for the functions
ALTER FUNCTION public.reserve_stripe_event(VARCHAR, VARCHAR, BOOLEAN) SET search_path = '';
ALTER FUNCTION public.complete_stripe_event(VARCHAR, UUID) SET search_path = '';
-- Allow service_role to access Stripe webhook events
GRANT SELECT, INSERT, UPDATE ON TABLE public.stripe_webhook_events TO service_role;
ALTER FUNCTION public.fail_stripe_event(VARCHAR, UUID, TEXT) SET search_path = '';

-- Grant execute permissions to the service role
GRANT EXECUTE ON FUNCTION public.reserve_stripe_event(VARCHAR, VARCHAR, BOOLEAN) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_stripe_event(VARCHAR, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_stripe_event(VARCHAR, UUID, TEXT) TO service_role;

-- Revoke all permissions from public, anon, and authenticated
REVOKE ALL ON TABLE public.stripe_webhook_events FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.reserve_stripe_event(VARCHAR, VARCHAR, BOOLEAN) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_stripe_event(VARCHAR, UUID) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_stripe_event(VARCHAR, UUID, TEXT) FROM public, anon, authenticated;
