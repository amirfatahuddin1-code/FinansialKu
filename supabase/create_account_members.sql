-- Migration: Create account_members table for multi-user shared account tracking
CREATE TABLE IF NOT EXISTS account_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_account_members_user_id ON account_members(user_id);

-- Enable RLS
ALTER TABLE account_members ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'account_members' AND policyname = 'Users can CRUD own account members'
    ) THEN
        CREATE POLICY "Users can CRUD own account members" ON account_members
            FOR ALL USING (auth.uid() = user_id);
    END IF;
END $$;
