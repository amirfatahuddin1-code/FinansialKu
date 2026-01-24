-- FIX REGISTRATION ISSUE
-- Run this script in the Supabase SQL Editor

-- 1. Re-create the function to handle new user creation with better robustness
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  );
  
  -- Create default categories for new user (Including Debt Categories)
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
    -- NEW Debt Categories
    (NEW.id, 'Dapat Pinjaman', '💰', '#10b981', 'income', TRUE),
    (NEW.id, 'Bayar Hutang', '💸', '#ef4444', 'expense', TRUE),
    (NEW.id, 'Beri Pinjaman', '🤝', '#f59e0b', 'expense', TRUE),
    (NEW.id, 'Terima Piutang', '📥', '#3b82f6', 'income', TRUE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Ensure the trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Ensure profiles table ownership/RLS is correct (Optional safety measure)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
