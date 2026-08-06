-- Migration: Add subscription columns to entreprises table
-- Date: 2026-07-26
-- Description: Adds columns required for Stripe subscription management to the entreprises table
--              including trial period tracking and subscription status.
--              This migration is deterministic and safe for existing data.

BEGIN;

-- Add subscription-related columns to entreprises table
ALTER TABLE public.entreprises
  ADD COLUMN trial_started_at TIMESTAMPTZ,
  ADD COLUMN trial_ends_at TIMESTAMPTZ,
  ADD COLUMN subscription_status TEXT DEFAULT 'trialing',
  ADD COLUMN stripe_customer_id TEXT,
  ADD COLUMN stripe_subscription_id TEXT,
  ADD COLUMN current_period_end TIMESTAMPTZ,
  ADD COLUMN trial_used BOOLEAN DEFAULT TRUE;

-- Drop existing constraint if it exists (from previous migration attempts)
ALTER TABLE public.entreprises
  DROP CONSTRAINT IF EXISTS check_subscription_status_new;

-- Add CHECK constraint for subscription_status values
-- Includes all official Stripe subscription statuses plus internal 'expired' status
ALTER TABLE public.entreprises
  ADD CONSTRAINT check_subscription_status_new
  CHECK (
    subscription_status IN (
      -- Official Stripe subscription statuses
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused',
      -- Internal TransportERP status for expired trial without active subscription
      'expired'
    )
  );

-- Initialize existing rows with deterministic values
-- For companies that already have data, preserve existing values
-- For new columns with NULL values, set appropriate defaults
UPDATE public.entreprises
SET
  trial_started_at = COALESCE(trial_started_at, NOW()),
  trial_ends_at = COALESCE(trial_ends_at,
    COALESCE(trial_started_at, NOW()) + INTERVAL '30 days'),
  subscription_status = COALESCE(subscription_status, 'trialing'),
  trial_used = TRUE
WHERE
  trial_started_at IS NULL OR
  trial_ends_at IS NULL OR
  subscription_status IS NULL OR
  trial_used IS NULL;

-- Now that all rows have values, add NOT NULL constraints
ALTER TABLE public.entreprises
  ALTER COLUMN trial_started_at SET NOT NULL,
  ALTER COLUMN trial_ends_at SET NOT NULL,
  ALTER COLUMN subscription_status SET NOT NULL,
  ALTER COLUMN trial_used SET NOT NULL;

-- Set defaults for future insertions
ALTER TABLE public.entreprises
  ALTER COLUMN trial_started_at SET DEFAULT NOW(),
  ALTER COLUMN trial_ends_at SET DEFAULT (NOW() + INTERVAL '30 days'),
  ALTER COLUMN subscription_status SET DEFAULT 'trialing',
  ALTER COLUMN trial_used SET DEFAULT TRUE;

-- Add constraint to ensure trial period is valid
ALTER TABLE public.entreprises
  DROP CONSTRAINT IF EXISTS check_entreprises_trial_period;

ALTER TABLE public.entreprises
  ADD CONSTRAINT check_entreprises_trial_period
  CHECK (trial_ends_at > trial_started_at);

-- Create unique partial indexes for Stripe IDs (ignore NULL values)
-- These indexes ensure uniqueness only when the IDs are present
CREATE UNIQUE INDEX idx_entreprises_stripe_customer_id_unique
ON public.entreprises (stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX idx_entreprises_stripe_subscription_id_unique
ON public.entreprises (stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Create non-unique index for subscription_status for faster filtering
CREATE INDEX idx_entreprises_subscription_status
ON public.entreprises (subscription_status);

-- Create index for trial_ends_at for efficient trial expiration queries
CREATE INDEX idx_entreprises_trial_ends_at
ON public.entreprises (trial_ends_at);

-- Add comments for documentation
COMMENT ON COLUMN public.entreprises.trial_started_at IS
'Timestamp when the 30-day free trial started. Automatically set to NOW() on company creation.';

COMMENT ON COLUMN public.entreprises.trial_ends_at IS
'Timestamp when the 30-day free trial ends. Always exactly 30 days after trial_started_at.';

COMMENT ON COLUMN public.entreprises.subscription_status IS
'Current subscription status. Values: incomplete, incomplete_expired, trialing, active, past_due, canceled, unpaid, paused (Stripe statuses) plus expired (internal TransportERP status).';

COMMENT ON COLUMN public.entreprises.stripe_customer_id IS
'Stripe customer ID. Populated when the company creates a Stripe customer.';

COMMENT ON COLUMN public.entreprises.stripe_subscription_id IS
'Stripe subscription ID. Populated when the company subscribes to a paid plan.';

COMMENT ON COLUMN public.entreprises.current_period_end IS
'Timestamp for the end of the current billing period for active subscriptions.';

COMMENT ON COLUMN public.entreprises.trial_used IS
'Indicates whether the company has already started or benefited from its first 30-day free trial. TRUE for all existing companies after migration application.';

COMMIT;
