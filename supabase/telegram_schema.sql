-- Add telegram_transactions table for pending transactions from Telegram
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS telegram_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  telegram_user_id TEXT NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  description TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  original_message TEXT,
  synced BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE telegram_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own telegram transactions
CREATE POLICY "Users can read own telegram transactions" ON telegram_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own telegram transactions
CREATE POLICY "Users can update own telegram transactions" ON telegram_transactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Allow insert from Edge Functions (service role)
CREATE POLICY "Service role can insert telegram transactions" ON telegram_transactions
  FOR INSERT WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_telegram_transactions_user ON telegram_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_transactions_synced ON telegram_transactions(synced);

-- Create a mapping table to link Telegram users to Supabase users
CREATE TABLE IF NOT EXISTS telegram_user_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  telegram_user_id TEXT NOT NULL UNIQUE,
  telegram_username TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE telegram_user_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own links
CREATE POLICY "Users can CRUD own telegram links" ON telegram_user_links
  FOR ALL USING (auth.uid() = user_id);
