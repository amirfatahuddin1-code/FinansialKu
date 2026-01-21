-- WhatsApp Integration Schema for FinansialKu
-- Run this SQL in Supabase SQL Editor

-- 1. Table to store pending transactions from WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  sender_name TEXT,
  group_id TEXT,
  group_name TEXT,
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
ALTER TABLE whatsapp_transactions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own whatsapp transactions
CREATE POLICY "Users can read own whatsapp transactions" ON whatsapp_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can update their own whatsapp transactions
CREATE POLICY "Users can update own whatsapp transactions" ON whatsapp_transactions
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can delete their own whatsapp transactions
CREATE POLICY "Users can delete own whatsapp transactions" ON whatsapp_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- Policy: Allow insert from Edge Functions (service role)
CREATE POLICY "Service role can insert whatsapp transactions" ON whatsapp_transactions
  FOR INSERT WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_whatsapp_transactions_user ON whatsapp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_transactions_synced ON whatsapp_transactions(synced);
CREATE INDEX IF NOT EXISTS idx_whatsapp_transactions_phone ON whatsapp_transactions(phone_number);

-- 2. Table to link WhatsApp numbers to Supabase users (personal chat)
CREATE TABLE IF NOT EXISTS whatsapp_user_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  phone_number TEXT NOT NULL UNIQUE,
  display_name TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE whatsapp_user_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own links
CREATE POLICY "Users can CRUD own whatsapp links" ON whatsapp_user_links
  FOR ALL USING (auth.uid() = user_id);

-- Create index
CREATE INDEX IF NOT EXISTS idx_whatsapp_user_links_phone ON whatsapp_user_links(phone_number);

-- 3. Table to link WhatsApp groups to Supabase users
CREATE TABLE IF NOT EXISTS whatsapp_group_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  group_id TEXT NOT NULL,
  group_name TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, group_id)
);

-- Enable RLS
ALTER TABLE whatsapp_group_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own group links
CREATE POLICY "Users can CRUD own whatsapp group links" ON whatsapp_group_links
  FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_whatsapp_group_links_user ON whatsapp_group_links(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_group_links_group ON whatsapp_group_links(group_id);
