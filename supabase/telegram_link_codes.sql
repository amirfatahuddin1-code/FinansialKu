-- Table to store temporary verification codes for Telegram linking
CREATE TABLE IF NOT EXISTS telegram_link_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE
);

-- Enable RLS
ALTER TABLE telegram_link_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can manage their own codes
CREATE POLICY "Users can CRUD own telegram link codes" ON telegram_link_codes
  FOR ALL USING (auth.uid() = user_id);

-- Policy: Service role can read/update for verification (needed for bot)
CREATE POLICY "Service role can read all telegram link codes" ON telegram_link_codes
  FOR SELECT USING (true);

CREATE POLICY "Service role can update telegram link codes" ON telegram_link_codes
  FOR UPDATE USING (true);

-- Index for fast lookup by code
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_code 
  ON telegram_link_codes(code);

-- Index for cleanup (expired codes)
CREATE INDEX IF NOT EXISTS idx_telegram_link_codes_expires 
  ON telegram_link_codes(expires_at);
