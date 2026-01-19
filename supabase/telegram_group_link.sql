-- Link grup Telegram ke akun user
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS telegram_group_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  telegram_group_id TEXT NOT NULL UNIQUE,  -- ID grup Telegram (negatif untuk grup)
  group_name TEXT,
  linked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE telegram_group_links ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own group links
CREATE POLICY "Users can CRUD own telegram group links" ON telegram_group_links
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Service role can read for matching (needed for n8n/sync server)
CREATE POLICY "Service role can read all telegram group links" ON telegram_group_links
  FOR SELECT USING (true);

-- Index for fast lookup by group_id
CREATE INDEX IF NOT EXISTS idx_telegram_group_links_group_id 
  ON telegram_group_links(telegram_group_id);

CREATE INDEX IF NOT EXISTS idx_telegram_group_links_user_id 
  ON telegram_group_links(user_id);
