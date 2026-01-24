-- FIX REGISTRATION ISSUE V3 (COMPLETE REPAIR)
-- Run this script in the Supabase SQL Editor

-- ==========================================
-- 1. ENSURE ALL TABLES EXIST
-- ==========================================

-- Profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Subscription Plans
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  duration_days INTEGER NOT NULL,
  features JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Subscriptions (User's active plan) - OFTEN MISSING
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  plan_id TEXT REFERENCES public.subscription_plans(id) NOT NULL,
  status TEXT CHECK (status IN ('trial', 'active', 'expired', 'cancelled')) NOT NULL DEFAULT 'trial',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  color TEXT NOT NULL DEFAULT '#64748b',
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- 2. ENSURE DEFAULT DATA EXISTS
-- ==========================================

-- Insert 'trial' plan
INSERT INTO public.subscription_plans (id, name, price, duration_days, features) 
VALUES ('trial', 'Trial', 0, 3, '{"app": "unlimited"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 3. ENSURE HELPER FUNCTIONS EXIST
-- ==========================================

-- Function to create trial subscription
CREATE OR REPLACE FUNCTION public.create_trial_subscription(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_subscription_id UUID;
BEGIN
  INSERT INTO public.subscriptions (user_id, plan_id, status, starts_at, expires_at)
  VALUES (
    p_user_id,
    'trial',
    'trial',
    NOW(),
    NOW() + INTERVAL '3 days'
  )
  RETURNING id INTO v_subscription_id;
  
  RETURN v_subscription_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- 4. REPAIR TRIGGERS
-- ==========================================

-- Trigger 1: Handle New User (Profile + Categories)
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
  
  -- Create default categories
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- Trigger 2: Handle Subscription
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  -- Strict Check: Ensure function and plan exist
  IF EXISTS (SELECT 1 FROM public.subscription_plans WHERE id = 'trial') THEN
      PERFORM public.create_trial_subscription(NEW.id);
  ELSE
      -- Fallback: Create missing plan
      INSERT INTO public.subscription_plans (id, name, price, duration_days, features) 
      VALUES ('trial', 'Trial', 0, 3, '{"app": "unlimited"}'::jsonb)
      ON CONFLICT (id) DO NOTHING;
      
      PERFORM public.create_trial_subscription(NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();
