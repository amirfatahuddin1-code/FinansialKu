-- Run this SQL in Supabase SQL Editor to support Phone Number field
-- 1. Add phone column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Update handle_new_user function to include phone number
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  );
  
  -- Create default categories for new user
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
    (NEW.id, 'Freelance', '💼', '#8b5cf6', 'income', TRUE);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
