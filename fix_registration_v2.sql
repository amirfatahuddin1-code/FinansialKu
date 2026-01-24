-- FIX REGISTRATION ISSUE V2 (STRICT VERSION)
-- Run this script in the Supabase SQL Editor

-- 1. Ensure basic tables exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on profiles to be safe
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Ensure Subscription Plans exist (Critical for subscription trigger)
CREATE TABLE IF NOT EXISTS subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  features JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 'trial' plan if missing (Used by default subscription trigger)
INSERT INTO subscription_plans (id, name, price, duration_days, features) 
VALUES ('trial', 'Trial', 0, 3, '{"app": "unlimited"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 3. Re-create the Handle New User Function (Profile + Categories)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles 
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  
  -- Create default categories (Including new Debt categories)
  INSERT INTO public.categories (user_id, name, icon, color, type, is_default) VALUES
    (NEW.id, 'Makanan', '🍔', '#ef4444', 'expense', TRUE),
    (NEW.id, 'Transport', '🚗', '#f59e0b', 'expense', TRUE),
    (NEW.id, 'Belanja', '🛒', '#8b5cf6', 'expense', TRUE),
    (NEW.id, 'Hiburan', '🎮', '#ec4899', 'expense', TRUE),
    (NEW.id, 'Kesehatan', '💊', '#10b981', 'expense', TRUE),
    (NEW.id, 'Tagihan', '📄', '#3b82f6', 'expense', TRUE),
    (NEW.id, 'Pendidikan', '📚', '#06b6d4', 'expense', TRUE),
    (NEW.id, 'Tabungan', '🏦', '#14b8a6', 'expense', TRUE),
    (NEW.id, 'Lainnya', '📦', '#64748b', 'expense', TRUE),
    (NEW.id, 'Gaji', '💰', '#10b981', 'income', TRUE),
    (NEW.id, 'Bonus', '🎁', '#f59e0b', 'income', TRUE),
    (NEW.id, 'Investasi', '📈', '#3b82f6', 'income', TRUE),
    (NEW.id, 'Freelance', '💼', '#8b5cf6', 'income', TRUE),
    (NEW.id, 'Dapat Pinjaman', '💰', '#10b981', 'income', TRUE),
    (NEW.id, 'Bayar Hutang', '💸', '#ef4444', 'expense', TRUE),
    (NEW.id, 'Beri Pinjaman', '🤝', '#f59e0b', 'expense', TRUE),
    (NEW.id, 'Terima Piutang', '📥', '#3b82f6', 'income', TRUE)
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Re-attach the trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Fix Subscription Trigger (handle_new_user_subscription)
-- Ensure the function is strictly robust
CREATE OR REPLACE FUNCTION handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Create trial subscription for new user (if plan exists)
  -- Perform check first to ensure data integrity
  IF EXISTS (SELECT 1 FROM subscription_plans WHERE id = 'trial') THEN
      PERFORM create_trial_subscription(NEW.id);
  ELSE
      -- Fallback: Create the missing plan on the fly if it's somehow missing again
      INSERT INTO subscription_plans (id, name, price, duration_days, features) 
      VALUES ('trial', 'Trial', 0, 3, '{"app": "unlimited"}'::jsonb)
      ON CONFLICT (id) DO NOTHING;
      
      PERFORM create_trial_subscription(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
