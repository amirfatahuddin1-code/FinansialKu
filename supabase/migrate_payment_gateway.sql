-- ========== PAYMENT GATEWAY MIGRATION ==========
-- Add support for multiple payment gateways (Midtrans + Mayar)
-- Run this SQL in Supabase SQL Editor

-- Add payment_gateway column to track which gateway was used
ALTER TABLE payment_transactions 
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT DEFAULT 'midtrans';

-- Add gateway_response column for generic gateway response data
-- (keeping midtrans_response intact as backup)
ALTER TABLE payment_transactions 
  ADD COLUMN IF NOT EXISTS gateway_response JSONB;

-- Update existing rows: copy midtrans_response to gateway_response
UPDATE payment_transactions 
SET gateway_response = midtrans_response 
WHERE midtrans_response IS NOT NULL 
  AND gateway_response IS NULL;

-- Index for filtering by gateway
CREATE INDEX IF NOT EXISTS idx_payment_transactions_gateway 
  ON payment_transactions(payment_gateway);

-- Verify the migration
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'payment_transactions' 
ORDER BY ordinal_position;
