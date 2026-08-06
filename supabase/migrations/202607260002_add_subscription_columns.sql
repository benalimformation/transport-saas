-- Migration: Add subscription columns to entreprises table
-- Date: 2026-07-26
-- Description: Adds columns required for Stripe subscription management to the entreprises table
--              including trial period tracking and subscription status.

BEGIN;

-- Add subscription-related columns to entreprises table
-- All columns except subscription_status accept NULL values
ALTER TABLE public.entreprises
  ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT NOT NULL DEFAULT 'trialing',
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Drop existing constraint if it exists (from previous migration attempts)
ALTER TABLE public.entreprises
  DROP CONSTRAINT IF EXISTS check_subscription_status_new;

-- Add CHECK constraint for subscription_status values
-- Values match the STRIPE_SUBSCRIPTION_STATUSES defined in src/lib/stripe/config.ts
ALTER TABLE public.entreprises
  ADD CONSTRAINT check_subscription_status_new
  CHECK (
    subscription_status IN (
      'trialing',   -- Trial period active (Stripe: trialing)
      'active',     -- Subscription active and paid
      'past_due',   -- Payment failed, subscription still active but past due
      'canceled',   -- Subscription canceled (Stripe: canceled)
      'expired'    -- Trial or subscription expired
    )
  );

-- Create unique partial indexes for Stripe IDs (ignore NULL values)
-- These indexes ensure uniqueness only when the IDs are present
CREATE UNIQUE INDEX IF NOT EXISTS idx_entreprises_stripe_customer_id_unique
ON public.entreprises (stripe_customer_id)
WHERE stripe_customer_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_entreprises_stripe_subscription_id_unique
ON public.entreprises (stripe_subscription_id)
WHERE stripe_subscription_id IS NOT NULL;

-- Create non-unique index for subscription_status for faster filtering
CREATE INDEX IF NOT EXISTS idx_entreprises_subscription_status
ON public.entreprises (subscription_status);

-- Create index for trial_ends_at for efficient trial expiration queries
CREATE INDEX IF NOT EXISTS idx_entreprises_trial_ends_at
ON public.entreprises (trial_ends_at);

-- Add comments for documentation
COMMENT ON COLUMN public.entreprises.trial_started_at IS
'Timestamp when the 30-day free trial started. Automatically set on company creation.';

COMMENT ON COLUMN public.entreprises.trial_ends_at IS
'Timestamp when the 30-day free trial ends. Calculated as trial_started_at + 30 days.';

COMMENT ON COLUMN public.entreprises.subscription_status IS
'Current subscription status. Values: trialing, active, past_due, canceled, expired.';

COMMENT ON COLUMN public.entreprises.stripe_customer_id IS
'Stripe customer ID. Populated when the company creates a Stripe customer.';

COMMENT ON COLUMN public.entreprises.stripe_subscription_id IS
'Stripe subscription ID. Populated when the company subscribes to a paid plan.';

COMMENT ON COLUMN public.entreprises.current_period_end IS
'Timestamp for the end of the current billing period for active subscriptions.';

COMMIT;