-- FinansialKu Database Schema for Supabase
-- Run this SQL in Supabase SQL Editor

-- 1. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  email TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '📦',
  color TEXT NOT NULL DEFAULT '#64748b',
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  description TEXT,
  date DATE NOT NULL,
  source TEXT,
  event_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Budgets table
CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category_id, month, year)
);

-- 5. Savings goals table
CREATE TABLE IF NOT EXISTS savings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  target DECIMAL(15,2) NOT NULL,
  current DECIMAL(15,2) DEFAULT 0,
  deadline DATE,
  color TEXT DEFAULT '#7c3aed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  date DATE NOT NULL,
  budget DECIMAL(15,2) DEFAULT 0,
  archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Event items table
CREATE TABLE IF NOT EXISTS event_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  budget DECIMAL(15,2) DEFAULT 0,
  actual DECIMAL(15,2) DEFAULT 0,
  is_paid BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========== ROW LEVEL SECURITY ==========

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE savings ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_items ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Categories policies
CREATE POLICY "Users can CRUD own categories" ON categories
  FOR ALL USING (auth.uid() = user_id);

-- Transactions policies
CREATE POLICY "Users can CRUD own transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id);

-- Budgets policies
CREATE POLICY "Users can CRUD own budgets" ON budgets
  FOR ALL USING (auth.uid() = user_id);

-- Savings policies
CREATE POLICY "Users can CRUD own savings" ON savings
  FOR ALL USING (auth.uid() = user_id);

-- Events policies
CREATE POLICY "Users can CRUD own events" ON events
  FOR ALL USING (auth.uid() = user_id);

-- Event items policies (via event ownership)
CREATE POLICY "Users can CRUD own event items" ON event_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM events 
      WHERE events.id = event_items.event_id 
      AND events.user_id = auth.uid()
    )
  );

-- ========== FUNCTIONS & TRIGGERS ==========

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
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

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== INDEXES ==========

CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON categories(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_savings_user_id ON savings(user_id);
CREATE INDEX IF NOT EXISTS idx_events_user_id ON events(user_id);
CREATE INDEX IF NOT EXISTS idx_event_items_event_id ON event_items(event_id);
