-- Migration: Add sender_name column to transactions table
-- For tracking who recorded the transaction from Telegram groups

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- Optional: Add index for filtering by sender
CREATE INDEX IF NOT EXISTS idx_transactions_sender_name ON transactions(sender_name);
