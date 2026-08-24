-- Add cancel_at column to entreprises table
--
-- This migration adds a column to store the Stripe scheduled cancellation date
-- for subscriptions that have been canceled but are still active.

ALTER TABLE public.entreprises
ADD COLUMN IF NOT EXISTS cancel_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN public.entreprises.cancel_at IS 'Stores the Stripe scheduled cancellation date for subscriptions that have been canceled but are still active';